import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, getCurrentMembership, getMemberships, canWriteInGroup } from "@/lib/session";
import { BookForm } from "@/components/BookForm";

export default async function NewBookPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    title?: string;
    author?: string;
    publisher?: string;
    image?: string;
    link?: string;
    price?: string;
    isbn?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await requireUser("/books/new");
  const memberships = await getMemberships(user.id);
  if (memberships.length === 0) redirect("/groups/search");

  // 내가 기록을 쓸 수 있는 그룹만 선택지로 (보기 전용 그룹은 그룹장·운영자만)
  const writable = memberships.filter((m) => canWriteInGroup(m.role, m.group));
  if (writable.length === 0) {
    return (
      <div className="center-page">
        <div style={{ fontSize: 44 }}>👀</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 4px" }}>기록할 수 있는 그룹이 없어요</h1>
        <p className="mini" style={{ margin: "0 0 18px" }}>
          가입한 그룹이 모두 보기 전용이에요 (그룹장·운영자만 기록 가능).
          <br />내 기록을 남기고 싶다면 새 그룹을 만들어보세요.
        </p>
        <Link href="/groups/new" className="btn pri">🌱 그룹 만들기</Link>
      </div>
    );
  }

  const current = await getCurrentMembership(user.id);
  const defaultGroupId = writable.some((m) => m.groupId === current?.groupId)
    ? current!.groupId
    : writable[0].groupId;

  return (
    <>
      <div className="page-h">
        <h1>✏️ 책 등록</h1>
        <span className="mini">등록할 그룹을 골라주세요 — 여러 그룹에 한 번에 등록할 수 있어요</span>
      </div>
      {sp.error && <div className="toast err">{sp.error}</div>}
      <div className="card" style={{ maxWidth: 720 }}>
        <BookForm
          mode="create"
          groups={writable.map((m) => ({ id: m.groupId, name: m.group.name }))}
          defaultGroupIds={[defaultGroupId]}
          initial={{
            title: sp.title,
            author: sp.author,
            publisher: sp.publisher,
            thumbnailUrl: sp.image,
            link: sp.link,
            price: sp.price ? Number(sp.price) : null,
            isbn: sp.isbn,
          }}
        />
      </div>
    </>
  );
}
