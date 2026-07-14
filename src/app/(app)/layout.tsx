import { prisma } from "@/lib/db";
import { requireUser, getMemberships, getCurrentMembership } from "@/lib/session";
import { isSiteAdminUser } from "@/lib/slots";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const memberships = await getMemberships(user.id);
  const current = await getCurrentMembership(user.id);
  const isSiteAdmin = isSiteAdminUser(user);
  const pendingRequests = isSiteAdmin
    ? await prisma.slotRequest.count({ where: { status: "PENDING" } })
    : 0;

  return (
    <>
      <TopBar
        user={user}
        memberships={memberships}
        currentGroupId={current?.groupId ?? null}
        isSiteAdmin={isSiteAdmin}
        pendingRequests={pendingRequests}
      />
      <main className="container">{children}</main>
    </>
  );
}
