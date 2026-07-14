"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isSiteAdminUser, newCouponCode } from "@/lib/slots";

function err(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

/** 쿠폰 사용 → 이용권 지급 */
export async function redeemCoupon(formData: FormData) {
  const user = await requireUser("/slots");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) err("/slots", "쿠폰 코드를 입력해주세요.");

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) err("/slots", "존재하지 않는 쿠폰 코드예요. 오타를 확인해주세요.");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) err("/slots", "기한이 지난 쿠폰이에요.");

  try {
    await prisma.$transaction(async (tx) => {
      // 남은 사용 횟수 차감 (동시 사용 경합 방지)
      const updated = await tx.coupon.updateMany({
        where: { id: coupon.id, usedCount: { lt: coupon.maxUses } },
        data: { usedCount: { increment: 1 } },
      });
      if (updated.count === 0) throw new Error("EXHAUSTED");

      await tx.couponRedemption.create({ data: { couponId: coupon.id, userId: user.id } });
      await tx.slotGrant.createMany({
        data: Array.from({ length: coupon.slotAmount }, () => ({
          userId: user.id,
          source: "COUPON",
          couponId: coupon.id,
        })),
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      err("/slots", "이미 사용한 쿠폰이에요.");
    }
    if (e instanceof Error && e.message === "EXHAUSTED") {
      err("/slots", "사용 횟수가 모두 소진된 쿠폰이에요.");
    }
    throw e;
  }

  revalidatePath("/slots");
  redirect(`/slots?redeemed=${coupon.slotAmount}`);
}

/** 이용권 요청 제출 (대기 중 요청은 1건만) */
export async function requestSlots(formData: FormData) {
  const user = await requireUser("/slots");
  const requestedSlots = Math.min(10, Math.max(1, Number(formData.get("requestedSlots") ?? 1) || 1));
  const message = String(formData.get("message") ?? "").trim().slice(0, 500) || null;

  const pending = await prisma.slotRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });
  if (pending) err("/slots", "처리 대기 중인 요청이 이미 있어요. 처리 후 다시 요청해주세요.");

  await prisma.slotRequest.create({
    data: { userId: user.id, requestedSlots, message },
  });
  revalidatePath("/slots");
  redirect("/slots?requested=1");
}

/** (사이트 관리자) 요청 승인 — 슬롯 수를 정해 쿠폰 발급 */
export async function approveRequest(formData: FormData) {
  const admin = await requireUser("/admin/site");
  if (!isSiteAdminUser(admin)) redirect("/");

  const requestId = String(formData.get("requestId") ?? "");
  const slotAmount = Math.min(50, Math.max(1, Number(formData.get("slotAmount") ?? 1) || 1));
  const adminNote = String(formData.get("adminNote") ?? "").trim().slice(0, 300) || null;

  const request = await prisma.slotRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!request || request.status !== "PENDING") err("/admin/site", "이미 처리된 요청이에요.");

  await prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.create({
      data: {
        code: newCouponCode(),
        slotAmount,
        maxUses: 1,
        note: `요청 승인 — ${request.user.name} (${request.user.email})`,
      },
    });
    await tx.slotRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", couponId: coupon.id, adminNote, resolvedAt: new Date() },
    });
  });

  revalidatePath("/admin/site");
  revalidatePath("/slots");
  redirect("/admin/site?approved=1");
}

/** (사이트 관리자) 요청 거절 */
export async function rejectRequest(formData: FormData) {
  const admin = await requireUser("/admin/site");
  if (!isSiteAdminUser(admin)) redirect("/");

  const requestId = String(formData.get("requestId") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim().slice(0, 300) || null;

  const request = await prisma.slotRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") err("/admin/site", "이미 처리된 요청이에요.");

  await prisma.slotRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", adminNote, resolvedAt: new Date() },
  });
  revalidatePath("/admin/site");
  revalidatePath("/slots");
  redirect("/admin/site?rejected=1");
}

/** (사이트 관리자) 쿠폰 직접 생성 */
export async function createCoupon(formData: FormData) {
  const admin = await requireUser("/admin/site");
  if (!isSiteAdminUser(admin)) redirect("/");

  const customCode = String(formData.get("code") ?? "").trim().toUpperCase();
  const slotAmount = Math.min(50, Math.max(1, Number(formData.get("slotAmount") ?? 1) || 1));
  const maxUses = Math.min(1000, Math.max(1, Number(formData.get("maxUses") ?? 1) || 1));
  const expiresDays = Number(formData.get("expiresDays") ?? 0) || 0;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  if (customCode && !/^[A-Z0-9-]{4,30}$/.test(customCode)) {
    err("/admin/site", "쿠폰 코드는 영문 대문자·숫자·하이픈 4~30자로 지어주세요.");
  }

  const code = customCode || newCouponCode();
  try {
    await prisma.coupon.create({
      data: {
        code,
        slotAmount,
        maxUses,
        expiresAt: expiresDays > 0 ? new Date(Date.now() + expiresDays * 86400000) : null,
        note,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      err("/admin/site", `이미 존재하는 코드예요: ${code}`);
    }
    throw e;
  }

  revalidatePath("/admin/site");
  redirect(`/admin/site?created=${encodeURIComponent(code)}`);
}
