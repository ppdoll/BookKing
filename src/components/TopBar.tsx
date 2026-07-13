import Link from "next/link";
import { signOut } from "@/auth";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { isAdmin, isOwner } from "@/lib/session";
import { GroupSelect } from "@/components/GroupSelect";

export function TopBar({
  user,
  memberships,
  currentGroupId,
}: {
  user: { id: string; name: string | null };
  memberships: { groupId: string; role: string; group: { id: string; name: string } }[];
  currentGroupId: string | null;
}) {
  const current = memberships.find((m) => m.groupId === currentGroupId);
  const role = (current?.role ?? "MEMBER") as Role;

  return (
    <header className="topbar">
      <Link href="/" className="logo">
        📚 Book<em>King</em>
      </Link>
      <GroupSelect
        groups={memberships.map((m) => ({ id: m.group.id, name: m.group.name }))}
        currentId={currentGroupId}
      />
      <nav className="topnav">
        <Link href="/books/new">✏️ 책 등록</Link>
        <Link href="/shelf">📖 내 책장</Link>
        <Link href="/search">🔍 책 검색</Link>
        <Link href="/groups/new">🌱 그룹 만들기</Link>
        {current && isAdmin(current.role) && <Link href="/admin/posts">🧹 글 관리</Link>}
        {current && isOwner(current.role) && <Link href="/admin/group">👑 그룹 관리</Link>}
      </nav>
      <div className="userbox">
        <b>{user.name}</b> <span className="pill p-read">{ROLE_LABEL[role]}</span>
        <br />
        <span className="uuid">UUID {user.id.slice(0, 8)}</span>{" "}
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
      </div>
    </header>
  );
}
