import { prisma } from "@/lib/db";

/** 만료 경고를 보여주기 시작하는 시점 (일) */
export const EXPIRY_WARN_DAYS = 7;

/** 만료됐는지 (만료일이 없으면 영구) */
export function isExpired(group: { expiresAt: Date | null }, now = new Date()) {
  return group.expiresAt !== null && group.expiresAt <= now;
}

/**
 * 초대·입장 링크가 언제까지 열리는지 — 그룹 관리·QR 안내문은 이 값만 보고 "언제까지 유효"를 말한다.
 * - 학교 모드 반: 학생 입장(/class)과 /join(→ /class)은 발급 후 7일 기한을 보지 않고, 그룹이 만료될 때
 *   함께 닫힌다. 그래서 링크도 그룹 만료일까지 — 만료일이 없으면 새로 발급하기 전까지 계속 쓴다.
 *   (예전엔 이 경우에도 7일이 지나면 "만료됐어요"라고 떠서, 새 링크를 발급하는 순간 학생 링크·QR이 막혔다)
 * - 일반 그룹: 발급 후 7일 (inviteExpiresAt).
 */
export function inviteLinkValidity(
  group: { classroomMode: boolean; inviteExpiresAt: Date; expiresAt: Date | null },
  now = new Date()
): { until: Date | null; expired: boolean } {
  if (group.classroomMode) return { until: group.expiresAt, expired: isExpired(group, now) };
  return { until: group.inviteExpiresAt, expired: group.inviteExpiresAt < now };
}

/** 만료까지 남은 일수 — 만료일이 없으면 null, 이미 지났으면 0 */
export function daysUntilExpiry(group: { expiresAt: Date | null }, now = new Date()) {
  if (!group.expiresAt) return null;
  return Math.max(0, Math.ceil((group.expiresAt.getTime() - now.getTime()) / 86400000));
}

/**
 * 그룹을 영구 삭제 — 독서 기록·멤버십·명렬·공유 카드는 스키마의 캐스케이드로 함께 사라진다.
 * 학교(교실) 모드로 만들어진 학생 계정은 이 그룹 전용이므로 함께 삭제해 개인정보를 완전히 파기한다.
 * (구글 로그인 교사·일반 계정은 다른 그룹에 남아 있거나 그룹을 소유하므로 삭제되지 않는다)
 *
 * @returns 삭제된 학생 계정 수
 */
export async function deleteGroupCompletely(groupId: string) {
  // 그룹을 지우면 명렬도 캐스케이드로 사라지므로, 학생 계정 id를 먼저 모아둔다
  const roster = await prisma.classroomStudent.findMany({
    where: { groupId, claimedByUserId: { not: null } },
    select: { claimedByUserId: true },
  });
  const studentIds = roster.map((r) => r.claimedByUserId!).filter(Boolean);

  await prisma.group.delete({ where: { id: groupId } });

  if (studentIds.length === 0) return 0;

  // 안전장치: 다른 그룹에 소속돼 있거나, 그룹을 소유/생성했거나, 관리자면 계정을 남긴다
  const { count } = await prisma.user.deleteMany({
    where: {
      id: { in: studentIds },
      isSiteAdmin: false,
      memberships: { none: {} },
      ownedGroups: { none: {} },
      createdGroups: { none: {} },
    },
  });
  return count;
}

/** 만료일이 지난 모든 그룹을 삭제 (일일 크론에서 호출) */
export async function deleteExpiredGroups(now = new Date()) {
  const expired = await prisma.group.findMany({
    where: { expiresAt: { not: null, lte: now } },
    select: { id: true, name: true },
  });

  const names: string[] = [];
  let deletedStudents = 0;
  for (const g of expired) {
    deletedStudents += await deleteGroupCompletely(g.id);
    names.push(g.name);
  }
  return { deletedGroups: expired.length, deletedStudents, names };
}
