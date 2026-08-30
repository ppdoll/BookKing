import Link from "next/link";
import { signOut } from "@/auth";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { isAdmin, isOwner } from "@/lib/session";
import { GroupSelect } from "@/components/GroupSelect";
import { BottomNav, type MoreItem } from "@/components/BottomNav";

/** 링크 옆 빨간 알림 뱃지 (데스크톱 상단 메뉴용) */
function Badge({ count }: { count: number }) {
  return (
    <span
      style={{
        marginLeft: 4, background: "var(--danger)", color: "#fff",
        borderRadius: 99, padding: "0 7px", fontSize: 11, fontWeight: 800,
      }}
    >
      {count}
    </span>
  );
}

export function TopBar({
  user,
  memberships,
  currentGroupId,
  isSiteAdmin = false,
  pendingRequests = 0,
  pendingJoins = 0,
}: {
  user: { id: string; name: string | null };
  memberships: {
    groupId: string;
    role: string;
    group: { id: string; name: string; joinApproval?: boolean; isPersonal?: boolean; iconVersion?: string | null };
  }[];
  currentGroupId: string | null;
  isSiteAdmin?: boolean;
  pendingRequests?: number;
  pendingJoins?: number;
}) {
  const current = memberships.find((m) => m.groupId === currentGroupId);
  const role = (current?.role ?? "MEMBER") as Role;

  // 개인 책장(또는 그룹 없음)일 때만 보이는 그룹 관련 메뉴
  const showGroupMenu = !current || Boolean(current.group.isPersonal);
  const inGroup = Boolean(current && !current.group.isPersonal);
  const showJoins = inGroup && isAdmin(current!.role) && (current!.group.joinApproval || pendingJoins > 0);

  /**
   * 모바일 [더보기] 시트 항목.
   * 하단 탭(홈·책 등록·내 책장·검색)에 없는 나머지를 여기 모은다 —
   * 데스크톱 상단 메뉴와 같은 조건을 쓴다.
   */
  const moreItems: MoreItem[] = [
    { href: "/wrapped", label: "🎉 결산" },
    ...(showGroupMenu
      ? [
          { href: "/groups/search", label: "👥 그룹 찾기" },
          { href: "/groups/new", label: "🌱 그룹 만들기" },
          { href: "/slots", label: "🎟️ 이용권" },
        ]
      : []),
    ...(showJoins ? [{ href: "/admin/joins", label: "🙋 가입 신청", badge: pendingJoins }] : []),
    ...(inGroup && isAdmin(current!.role) ? [{ href: "/admin/posts", label: "🧹 글 관리" }] : []),
    ...(inGroup && isOwner(current!.role) ? [{ href: "/admin/group", label: "👑 그룹 관리" }] : []),
    ...(isSiteAdmin ? [{ href: "/admin/site", label: "🛠 사이트 관리", badge: pendingRequests }] : []),
    { href: "/manual.html", label: "❓ 도움말", external: true },
  ];

  const signOutForm = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
      style={{ display: "inline" }}
    >
      <button
        type="submit"
        style={{ background: "none", border: 0, color: "var(--sub)", fontSize: 11, textDecoration: "underline", padding: 0 }}
      >
        로그아웃
      </button>
    </form>
  );

  return (
    <>
      <header className="topbar">
        <Link href="/" className="logo">
          📚 Book<em>King</em>
        </Link>
        {current?.group.iconVersion && (
          <img
            src={`/api/group-icon/${current.group.id}?v=${current.group.iconVersion}`}
            alt=""
            width={26}
            height={26}
            style={{ borderRadius: 8, border: "2px solid var(--bd)", objectFit: "cover", flex: "none" }}
          />
        )}
        <GroupSelect
          groups={memberships.map((m) => ({ id: m.group.id, name: m.group.name }))}
          currentId={currentGroupId}
        />
        {/* 아래 두 블록은 모바일에서 숨기고 하단 탭바가 대신한다 */}
        <nav className="topnav">
          <Link href="/books/new">✏️ 책 등록</Link>
          <Link href="/shelf">📖 내 책장</Link>
          <Link href="/wrapped">🎉 결산</Link>
          <Link href="/search">🔍 책 검색</Link>
          {showGroupMenu && (
            <>
              <Link href="/groups/search">👥 그룹 찾기</Link>
              <Link href="/groups/new">🌱 그룹 만들기</Link>
              <Link href="/slots">🎟️ 이용권</Link>
            </>
          )}
          {showJoins && (
            <Link href="/admin/joins">
              🙋 가입 신청
              {pendingJoins > 0 && <Badge count={pendingJoins} />}
            </Link>
          )}
          {inGroup && isAdmin(current!.role) && <Link href="/admin/posts">🧹 글 관리</Link>}
          {inGroup && isOwner(current!.role) && <Link href="/admin/group">👑 그룹 관리</Link>}
          {isSiteAdmin && (
            <Link href="/admin/site">
              🛠 사이트 관리
              {pendingRequests > 0 && <Badge count={pendingRequests} />}
            </Link>
          )}
          <a href="/manual.html" target="_blank" rel="noreferrer">❓ 도움말</a>
        </nav>
        <div className="userbox">
          <b>{user.name}</b> <span className="pill p-read">{ROLE_LABEL[role]}</span>
          <br />
          <span className="uuid">UUID {user.id.slice(0, 8)}</span> {signOutForm}
        </div>
      </header>

      <BottomNav
        items={moreItems}
        userName={user.name ?? "이름 없음"}
        roleLabel={ROLE_LABEL[role]}
        uuid={user.id.slice(0, 8)}
        signOutSlot={signOutForm}
      />
    </>
  );
}
