import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ROLE, type Role } from "@/lib/constants";

export const GROUP_COOKIE = "bk_group";

/**
 * 세션의 사용자 행 조회 — React cache()로 감싸서 같은 요청 안에서
 * layout / page / 컴포넌트가 몇 번을 호출해도 DB 쿼리는 1번만 나간다.
 */
const getSessionUser = cache(async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
});

/** 로그인 + 이름 등록까지 끝난 사용자를 보장. 아니면 적절한 페이지로 리다이렉트 */
export async function requireUser(nextPath?: string) {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  if (user.suspendedAt) redirect("/suspended"); // 정지 계정은 모든 기능 차단
  if (!user.name) {
    redirect(`/welcome${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  return user;
}

/** 로그인만 확인 (이름 등록 전 welcome 페이지에서 사용) */
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** 사용자의 그룹 멤버십 목록 (요청 내 캐시) */
export const getMemberships = cache(async (userId: string) => {
  return prisma.groupMember.findMany({
    where: { userId },
    include: { group: true },
    orderBy: { joinedAt: "asc" },
  });
});

/** 현재 선택된 그룹의 멤버십 (쿠키 기준, 없으면 첫 그룹 — 요청 내 캐시) */
export const getCurrentMembership = cache(async (userId: string) => {
  const memberships = await getMemberships(userId);
  if (memberships.length === 0) return null;
  const store = await cookies();
  const selected = store.get(GROUP_COOKIE)?.value;
  return memberships.find((m) => m.groupId === selected) ?? memberships[0];
});

export function isAdmin(role: string) {
  return role === ROLE.ADMIN || role === ROLE.OWNER;
}

/** 보기 전용 그룹에서는 그룹장·운영자만 기록을 등록·수정할 수 있다 */
export function canWriteInGroup(role: string, group: { readOnly: boolean }) {
  return !group.readOnly || isAdmin(role);
}

export function isOwner(role: string) {
  return role === ROLE.OWNER;
}

/** 현재 그룹에서 최소 권한을 요구. 부족하면 홈으로 */
export async function requireGroupRole(userId: string, minRole: Role) {
  const membership = await getCurrentMembership(userId);
  if (!membership) redirect("/groups/new");
  const ok =
    minRole === ROLE.MEMBER ||
    (minRole === ROLE.ADMIN && isAdmin(membership.role)) ||
    (minRole === ROLE.OWNER && isOwner(membership.role));
  if (!ok) redirect("/");
  return membership;
}
