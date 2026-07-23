"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

async function ensureCard(userId: string, year: number) {
  return prisma.shareCard.upsert({
    where: { userId_year: { userId, year } },
    update: {},
    create: { userId, year },
  });
}

const yearOf = (formData: FormData) => {
  const y = Number(formData.get("year"));
  return Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : new Date().getFullYear();
};

/** 전체 공개 링크 켜기/끄기 */
export async function setWrappedPublic(formData: FormData) {
  const user = await requireUser("/wrapped");
  const year = yearOf(formData);
  const on = formData.get("on") === "1";

  const card = await ensureCard(user.id, year);
  await prisma.shareCard.update({
    where: { id: card.id },
    data: { publicSlug: on ? card.publicSlug ?? randomBytes(7).toString("base64url") : null },
  });
  revalidatePath("/wrapped");
  redirect(`/wrapped?year=${year}`);
}

/** 특정 그룹에 공유 토글 (개인 책장 제외, 본인이 멤버인 그룹만) */
export async function toggleWrappedGroup(formData: FormData) {
  const user = await requireUser("/wrapped");
  const year = yearOf(formData);
  const groupId = String(formData.get("groupId") ?? "");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
    include: { group: true },
  });
  if (!membership || membership.group.isPersonal) redirect(`/wrapped?year=${year}`);

  const card = await ensureCard(user.id, year);
  const existing = await prisma.shareCardGroup.findUnique({
    where: { cardId_groupId: { cardId: card.id, groupId } },
  });
  if (existing) {
    await prisma.shareCardGroup.delete({ where: { id: existing.id } });
  } else {
    await prisma.shareCardGroup.create({ data: { cardId: card.id, groupId } });
  }
  revalidatePath("/wrapped");
  revalidatePath("/");
  redirect(`/wrapped?year=${year}`);
}
