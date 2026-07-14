"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, GROUP_COOKIE, getCurrentMembership, isOwner } from "@/lib/session";
import { ROLE, INVITE_EXPIRY_DAYS } from "@/lib/constants";
import { getSlotStatus } from "@/lib/slots";

function newInviteCode() {
  return randomBytes(6).toString("base64url"); // 8자, URL 안전
}

function inviteExpiry() {
  return new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

/** 그룹 생성 — 만든 사람이 그룹장, 이용권(슬롯) 1개 사용 */
export async function createGroup(formData: FormData) {
  const user = await requireUser("/groups/new");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/groups/new?error=empty");
  if (name.length > 30) redirect("/groups/new?error=long");

  const slots = await getSlotStatus(user.id);
  if (slots.available <= 0) redirect("/groups/new?error=noslot");

  const group = await prisma.group.create({
    data: {
      name,
      ownerId: user.id,
      createdById: user.id, // 이용권 차감 기준 (불변)
      inviteCode: newInviteCode(),
      inviteExpiresAt: inviteExpiry(),
      members: { create: { userId: user.id, role: ROLE.OWNER } },
    },
  });

  const store = await cookies();
  store.set(GROUP_COOKIE, group.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/admin/group?created=1");
}

/** 초대 링크로 가입 — 기본 역할은 사용자 */
export async function joinGroup(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const user = await requireUser(`/join/${code}`);

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) redirect("/join/invalid");
  if (group.inviteExpiresAt < new Date()) redirect(`/join/${code}?expired=1`);

  await prisma.groupMember.upsert({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
    update: {},
    create: { userId: user.id, groupId: group.id, role: ROLE.MEMBER },
  });

  const store = await cookies();
  store.set(GROUP_COOKIE, group.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/?joined=1");
}

/** 초대 링크 재발급 (그룹장) — 기존 링크 무효화 */
export async function regenerateInvite() {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  await prisma.group.update({
    where: { id: membership.groupId },
    data: { inviteCode: newInviteCode(), inviteExpiresAt: inviteExpiry() },
  });
  revalidatePath("/admin/group");
}

/** 운영자 지정/해제 (그룹장) */
export async function setMemberRole(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== ROLE.ADMIN && role !== ROLE.MEMBER) redirect("/admin/group");

  const target = await prisma.groupMember.findUnique({ where: { id: memberId } });
  // 같은 그룹 + 그룹장 자신은 변경 불가
  if (!target || target.groupId !== membership.groupId || target.role === ROLE.OWNER) {
    redirect("/admin/group");
  }

  await prisma.groupMember.update({ where: { id: memberId }, data: { role } });
  revalidatePath("/admin/group");
}

/** (그룹장) 그룹 옵션 변경 — 외부 검색 허용 / 보기 전용 */
export async function updateGroupOptions(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  await prisma.group.update({
    where: { id: membership.groupId },
    data: {
      searchable: formData.get("searchable") === "on",
      readOnly: formData.get("readOnly") === "on",
    },
  });
  revalidatePath("/admin/group");
  redirect("/admin/group?options=1");
}

/** 검색으로 공개 그룹에 가입 (searchable 그룹만) */
export async function joinPublicGroup(formData: FormData) {
  const user = await requireUser("/groups/search");
  const groupId = String(formData.get("groupId") ?? "");

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || !group.searchable) {
    redirect(`/groups/search?error=${encodeURIComponent("가입할 수 없는 그룹이에요.")}`);
  }

  await prisma.groupMember.upsert({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
    update: {},
    create: { userId: user.id, groupId: group.id, role: ROLE.MEMBER },
  });

  const store = await cookies();
  store.set(GROUP_COOKIE, group.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/?joined=1");
}

/** (그룹장) 그룹원 내보내기 */
export async function removeMember(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const memberId = String(formData.get("memberId") ?? "");
  const target = await prisma.groupMember.findUnique({ where: { id: memberId } });
  // 같은 그룹 + 그룹장 자신은 내보낼 수 없음
  if (!target || target.groupId !== membership.groupId || target.role === ROLE.OWNER) {
    redirect("/admin/group");
  }

  await prisma.groupMember.delete({ where: { id: memberId } });
  revalidatePath("/admin/group");
  redirect("/admin/group?removed=1");
}

/** 그룹 나가기 (본인, 그룹장은 위임 후 가능) */
export async function leaveGroup(formData: FormData) {
  const user = await requireUser("/");
  const groupId = String(formData.get("groupId") ?? "");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  });
  if (!membership) redirect("/");
  if (membership.role === ROLE.OWNER) {
    redirect(`/?error=${encodeURIComponent("그룹장은 나갈 수 없어요. 먼저 그룹장을 위임해주세요.")}`);
  }

  await prisma.groupMember.delete({ where: { id: membership.id } });
  const store = await cookies();
  store.delete(GROUP_COOKIE);
  revalidatePath("/", "layout");
  redirect("/?left=1");
}

/** 그룹장 위임 — 대상이 그룹장이 되고 본인은 운영자로 */
export async function transferOwnership(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const memberId = String(formData.get("memberId") ?? "");
  const target = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!target || target.groupId !== membership.groupId || target.userId === user.id) {
    redirect("/admin/group");
  }

  await prisma.$transaction([
    prisma.groupMember.update({ where: { id: target.id }, data: { role: ROLE.OWNER } }),
    prisma.groupMember.update({ where: { id: membership.id }, data: { role: ROLE.ADMIN } }),
    prisma.group.update({ where: { id: membership.groupId }, data: { ownerId: target.userId } }),
  ]);
  revalidatePath("/admin/group");
  redirect("/admin/group?transferred=1");
}
