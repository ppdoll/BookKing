import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireUser, getMemberships, getCurrentMembership, isAdmin } from "@/lib/session";
import { isSiteAdminUser } from "@/lib/slots";
import { daysUntilExpiry, EXPIRY_WARN_DAYS } from "@/lib/group-expiry";
import { needsStudentPassword } from "@/lib/student";
import { TopBar } from "@/components/TopBar";

/**
 * 앱 화면의 파비콘을 현재 그룹 아이콘으로 교체.
 * 여기서 icons를 지정하면 app/icon.png 파일 규칙을 덮어쓰고, 아이콘이 없는 그룹은
 * 아무것도 반환하지 않아 기본 BookKing 아이콘이 그대로 쓰인다.
 * (로그인·초대 등 (app) 밖 페이지는 항상 기본 아이콘)
 */
export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return {};

  const current = await getCurrentMembership(userId);
  if (!current?.group.iconVersion) return {};

  return {
    icons: { icon: `/api/group-icon/${current.groupId}?v=${current.group.iconVersion}` },
  };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // 아직 개인 비밀번호를 정하지 않은 학생은 먼저 설정하도록 안내
  if (await needsStudentPassword(user.id)) redirect("/class/set-password");

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
