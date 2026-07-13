import { requireUser, getMemberships, getCurrentMembership } from "@/lib/session";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const memberships = await getMemberships(user.id);
  const current = await getCurrentMembership(user.id);

  return (
    <>
      <TopBar user={user} memberships={memberships} currentGroupId={current?.groupId ?? null} />
      <main className="container">{children}</main>
    </>
  );
}
