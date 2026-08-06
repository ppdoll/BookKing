import { prisma } from "@/lib/db";
import { requireUser, getMemberships, getCurrentMembership, isAdmin } from "@/lib/session";
import { isSiteAdminUser } from "@/lib/slots";
import { daysUntilExpiry, EXPIRY_WARN_DAYS } from "@/lib/group-expiry";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const memberships = await getMemberships(user.id);
  const current = await getCurrentMembership(user.id);
  const isSiteAdmin = isSiteAdminUser(user);
  const [pendingRequests, pendingJoins] = await Promise.all([
    isSiteAdmin ? prisma.slotRequest.count({ where: { status: "PENDING" } }) : 0,
    current && isAdmin(current.role)
      ? prisma.groupJoinRequest.count({ where: { groupId: current.groupId, status: "PENDING" } })
      : 0,
  ]);
  const expiryDays = current ? daysUntilExpiry(current.group) : null;

  return (
    <>
      <TopBar
        user={user}
        memberships={memberships}
        currentGroupId={current?.groupId ?? null}
        isSiteAdmin={isSiteAdmin}
        pendingRequests={pendingRequests}
        pendingJoins={pendingJoins}
      />
      <main className="container">
        {expiryDays !== null && expiryDays <= EXPIRY_WARN_DAYS && (
          <div className="toast err" style={{ marginBottom: 14 }}>
            ⏳ 『{current!.group.name}』은 <b>{expiryDays === 0 ? "오늘" : `${expiryDays}일 후`}</b> 만료돼요 —
            그룹과 모든 독서 기록이 영구 삭제됩니다.
            {isAdmin(current!.role) && " (그룹 관리에서 날짜를 미루거나 해제할 수 있어요)"}
          </div>
        )}
        {children}
      </main>
    </>
  );
}
