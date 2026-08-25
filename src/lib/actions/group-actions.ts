"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, GROUP_COOKIE, getCurrentMembership, isOwner, isAdmin } from "@/lib/session";
import { ROLE, INVITE_EXPIRY_DAYS } from "@/lib/constants";
import { getSlotStatus } from "@/lib/slots";
import { hashPassword } from "@/lib/password";
import { deleteGroupCompletely } from "@/lib/group-expiry";

/** 가입 처리 공통 — 승인제 그룹이면 신청 접수, 아니면 즉시 가입 */
async function joinOrApply(
  userId: string,
  group: { id: string; joinApproval: boolean; expiresAt: Date | null },
  backTo: string
) {
  // 만료일이 지난 그룹(삭제 대기)에는 가입할 수 없다
  if (group.expiresAt && group.expiresAt <= new Date()) redirect("/join/invalid");

  if (group.joinApproval) {
    // 이미 멤버면 그냥 입장
    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });
    if (!existing) {
      await prisma.groupJoinRequest.upsert({
        where: { groupId_userId: { groupId: group.id, userId } },
        update: { status: "PENDING", resolvedAt: null, resolvedBy: null, createdAt: new Date() },
        create: { groupId: group.id, userId },
      });
      redirect(`${backTo}?applied=1`);
    }
  } else {
    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId: group.id } },
      update: {},
      create: { userId, groupId: group.id, role: ROLE.MEMBER },
    });
  }
  const store = await cookies();
  store.set(GROUP_COOKIE, group.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/?joined=1");
}

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

/** 초대 링크로 가입 — 기본 역할은 사용자 (승인제 그룹은 신청 접수) */
export async function joinGroup(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const user = await requireUser(`/join/${code}`);

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group || group.isPersonal) redirect("/join/invalid");
  if (group.inviteExpiresAt < new Date()) redirect(`/join/${code}?expired=1`);

  await joinOrApply(user.id, group, `/join/${code}`);
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

/** (그룹장) 그룹 옵션 변경 — 외부 검색 허용 / 보기 전용 / 학교 모드 */
export async function updateGroupOptions(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const classroomMode = formData.get("classroomMode") === "on";
  await prisma.group.update({
    where: { id: membership.groupId },
    data: {
      classroomMode,
      // 학교 모드면 학생 보호를 위해 외부 검색 노출은 강제로 끔
      searchable: classroomMode ? false : formData.get("searchable") === "on",
      readOnly: formData.get("readOnly") === "on",
      joinApproval: formData.get("joinApproval") === "on",
    },
  });
  revalidatePath("/admin/group");
  redirect("/admin/group?options=1");
}

/**
 * (그룹장) 만료일 설정·해제 — 만료일이 지나면 그룹·기록·학생 계정이 영구 삭제된다.
 * 날짜(YYYY-MM-DD)를 그 날 끝(23:59:59)으로 저장해, 지정한 날까지는 사용할 수 있게 한다.
 */
export async function setGroupExpiry(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const raw = String(formData.get("expiresAt") ?? "").trim();

  if (!raw) {
    await prisma.group.update({ where: { id: membership.groupId }, data: { expiresAt: null } });
    revalidatePath("/admin/group");
    redirect("/admin/group?expoff=1");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) redirect("/admin/group?experr=format");
  const expiresAt = new Date(`${raw}T23:59:59`);
  if (Number.isNaN(expiresAt.getTime())) redirect("/admin/group?experr=format");
  if (expiresAt <= new Date()) redirect("/admin/group?experr=past");

  await prisma.group.update({ where: { id: membership.groupId }, data: { expiresAt } });
  revalidatePath("/admin/group");
  redirect("/admin/group?expon=1");
}

/** 아이콘 최대 크기 — 클라이언트에서 256x256 PNG로 줄여 보내므로 넉넉한 상한 */
const MAX_ICON_BYTES = 200_000;

/**
 * (그룹장) 그룹 아이콘 등록 — 클라이언트에서 256x256 PNG(data URL)로 변환해 보낸다.
 * 상단바·파비콘·OG 미리보기에 함께 쓰인다.
 */
export async function setGroupIcon(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const dataUrl = String(formData.get("icon") ?? "");
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) redirect("/admin/group?iconerr=format");

  const data = Buffer.from(dataUrl.slice(prefix.length), "base64");
  if (data.length === 0) redirect("/admin/group?iconerr=format");
  if (data.length > MAX_ICON_BYTES) redirect("/admin/group?iconerr=size");

  // 캐시 무효화용 버전 — 이미지가 바뀌면 URL도 바뀌어 즉시 반영된다
  const version = createHash("sha256").update(data).digest("hex").slice(0, 8);

  await prisma.$transaction([
    prisma.groupIcon.upsert({
      where: { groupId: membership.groupId },
      update: { data, mime: "image/png" },
      create: { groupId: membership.groupId, data, mime: "image/png" },
    }),
    prisma.group.update({ where: { id: membership.groupId }, data: { iconVersion: version } }),
  ]);

  revalidatePath("/", "layout"); // 상단바·파비콘이 모든 화면에 걸쳐 있어 레이아웃까지 갱신
  redirect("/admin/group?icon=1");
}

/** (그룹장) 그룹 아이콘 삭제 — 기본 BookKing 아이콘으로 돌아간다 */
export async function removeGroupIcon() {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  await prisma.$transaction([
    prisma.groupIcon.deleteMany({ where: { groupId: membership.groupId } }),
    prisma.group.update({ where: { id: membership.groupId }, data: { iconVersion: null } }),
  ]);

  revalidatePath("/", "layout");
  redirect("/admin/group?icondel=1");
}

/** (그룹장) 학교 모드 학생 입장 비밀번호 설정 — scrypt 해시로 저장 */
export async function setJoinPassword(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const pw = String(formData.get("password") ?? "").trim();
  if (pw.length < 4) redirect("/admin/group?pwerr=1");

  await prisma.group.update({
    where: { id: membership.groupId },
    data: { joinPassword: hashPassword(pw) },
  });
  revalidatePath("/admin/group");
  redirect("/admin/group?pw=1");
}

/** (그룹장) 명렬 일괄 추가 — 한 줄에 "반번호, 별명" (별명 생략 시 반번호를 별명으로) */
export async function addRosterStudents(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const rows = String(formData.get("roster") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(",");
      const classNo = (idx === -1 ? line : line.slice(0, idx)).trim();
      const nickname = (idx === -1 ? "" : line.slice(idx + 1)).trim() || classNo;
      return { classNo, nickname };
    })
    .filter((r) => r.classNo && r.classNo.length <= 20 && r.nickname.length <= 20);

  if (rows.length > 0) {
    await prisma.classroomStudent.createMany({
      data: rows.map((r) => ({ groupId: membership.groupId, classNo: r.classNo, nickname: r.nickname })),
      skipDuplicates: true, // 이미 있는 반번호는 건너뜀
    });
  }
  revalidatePath("/admin/group");
  redirect("/admin/group?roster=1");
}

/** (그룹장) 명렬 항목 삭제 */
export async function removeRosterStudent(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const id = String(formData.get("studentId") ?? "");
  const entry = await prisma.classroomStudent.findUnique({ where: { id } });
  if (!entry || entry.groupId !== membership.groupId) redirect("/admin/group");

  await prisma.classroomStudent.delete({ where: { id } });
  revalidatePath("/admin/group");
  redirect("/admin/group?rosterdel=1");
}

/** (그룹장) 명렬 배정 초기화 — 잘못 입장한 반번호를 다시 입장 가능하게 (기존 학생 계정은 유지) */
export async function resetRosterClaim(formData: FormData) {
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  const id = String(formData.get("studentId") ?? "");
  const entry = await prisma.classroomStudent.findUnique({ where: { id } });
  if (!entry || entry.groupId !== membership.groupId) redirect("/admin/group");

  await prisma.classroomStudent.update({ where: { id }, data: { claimedByUserId: null } });
  revalidatePath("/admin/group");
  redirect("/admin/group?rosterreset=1");
}

/** 검색으로 공개 그룹에 가입 (searchable 그룹만, 승인제 그룹은 신청 접수) */
export async function joinPublicGroup(formData: FormData) {
  const user = await requireUser("/groups/search");
  const groupId = String(formData.get("groupId") ?? "");

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || !group.searchable || group.isPersonal) {
    redirect(`/groups/search?error=${encodeURIComponent("가입할 수 없는 그룹이에요.")}`);
  }

  await joinOrApply(user.id, group, "/groups/search");
}

/** (그룹장·운영자) 가입 신청 승인 */
export async function approveJoinRequest(formData: FormData) {
  const user = await requireUser("/admin/joins");
  const requestId = String(formData.get("requestId") ?? "");

  const request = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") redirect("/admin/joins");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: request.groupId } },
  });
  if (!membership || !isAdmin(membership.role)) redirect("/");

  await prisma.$transaction([
    prisma.groupMember.upsert({
      where: { userId_groupId: { userId: request.userId, groupId: request.groupId } },
      update: {},
      create: { userId: request.userId, groupId: request.groupId, role: ROLE.MEMBER },
    }),
    prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", resolvedAt: new Date(), resolvedBy: user.id },
    }),
  ]);
  revalidatePath("/admin/joins");
  redirect("/admin/joins?approved=1");
}

/** (그룹장·운영자) 가입 신청 거절 */
export async function rejectJoinRequest(formData: FormData) {
  const user = await requireUser("/admin/joins");
  const requestId = String(formData.get("requestId") ?? "");

  const request = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") redirect("/admin/joins");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: request.groupId } },
  });
  if (!membership || !isAdmin(membership.role)) redirect("/");

  await prisma.groupJoinRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", resolvedAt: new Date(), resolvedBy: user.id },
  });
  revalidatePath("/admin/joins");
  redirect("/admin/joins?rejected=1");
}

/**
 * (그룹 생성자) 그룹 영구 삭제 — 되돌릴 수 없다.
 * 그룹의 모든 독서 기록·멤버십·명렬이 함께 사라지고(스키마 캐스케이드),
 * 학교 모드로 만들어진 학생 계정도 정리된다(만료 삭제와 같은 로직 재사용).
 *
 * 권한은 위임과 무관하게 "만든 사람"(createdById) 기준 — 이용권 차감 기준과 같다.
 * 덕분에 그룹장을 위임해 그룹 관리에 못 들어가는 상태에서도
 * 이용권 페이지에서 자기가 만든 그룹을 정리할 수 있다.
 * 실수 방지를 위해 그룹 이름을 정확히 입력해야 실행된다.
 */
export async function deleteGroup(formData: FormData) {
  const backTo = String(formData.get("backTo") ?? "/slots");
  const user = await requireUser(backTo);
  const groupId = String(formData.get("groupId") ?? "");

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.isPersonal || group.createdById !== user.id) redirect(backTo);

  const typed = String(formData.get("confirmName") ?? "").trim();
  if (typed !== group.name) redirect(`${backTo}?delerr=name`);

  await deleteGroupCompletely(group.id);

  // 방금 지운 그룹을 보고 있었다면 선택을 비워 다음 그룹으로 넘어가게 한다
  const store = await cookies();
  if (store.get(GROUP_COOKIE)?.value === group.id) store.delete(GROUP_COOKIE);

  revalidatePath("/", "layout");
  redirect(`${backTo}?deleted=1`);
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
