import { prisma } from "@/lib/db";
import { requireUser, getMemberships, getCurrentMembership, isAdmin } from "@/lib/session";
import { isSiteAdminUser } from "@/lib/slots";
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
      <main className="container">{children}</main>
    </>
  );
}
