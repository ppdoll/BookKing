import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ROLE, type Role } from "@/lib/constants";

export const GROUP_COOKIE = "bk_group";

/** 로그인 + 이름 등록까지 끝난 사용자를 보장. 아니면 적절한 페이지로 리다이렉트 */
export async function requireUser(nextPath?: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  if (!user.name) {
    redirect(`/welcome${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  return user;
}

/** 로그인만 확인 (이름 등록 전 welcome 페이지에서 사용) */
export async function requireSessionUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  return user;
}

/** 사용자의 그룹 멤버십 목록 */
export async function getMemberships(userId: string) {
  return prisma.groupMember.findMany({
    where: { userId },
    include: { group: true },
    orderBy: { joinedAt: "asc" },
  });
}

/** 현재 선택된 그룹의 멤버십 (쿠키 기준, 없으면 첫 그룹) */
export async function getCurrentMembership(userId: string) {
  const memberships = await getMemberships(userId);
  if (memberships.length === 0) return null;
  const store = await cookies();
  const selected = store.get(GROUP_COOKIE)?.value;
  return memberships.find((m) => m.groupId === selected) ?? memberships[0];
}

export function isAdmin(role: string) {
  return role === ROLE.ADMIN || role === ROLE.OWNER;
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
