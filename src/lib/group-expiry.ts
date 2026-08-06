import { prisma } from "@/lib/db";

/** 만료 경고를 보여주기 시작하는 시점 (일) */
export const EXPIRY_WARN_DAYS = 7;

/** 만료됐는지 (만료일이 없으면 영구) */
export function isExpired(group: { expiresAt: Date | null }, now = new Date()) {
  return group.expiresAt !== null && group.expiresAt <= now;
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
