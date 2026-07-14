import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, getCurrentMembership, canWriteInGroup } from "@/lib/session";
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
  const membership = await getCurrentMembership(user.id);
  if (!membership) redirect("/groups/search");

  if (!canWriteInGroup(membership.role, membership.group)) {
    return (
      <div className="center-page">
        <div style={{ fontSize: 44 }}>👀</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 4px" }}>보기 전용 그룹이에요</h1>
        <p className="mini" style={{ margin: "0 0 18px" }}>
          『{membership.group.name}』에서는 그룹장·운영자만 기록을 등록할 수 있어요.
          <br />내 기록을 남기고 싶다면 다른 그룹을 선택하거나 새 그룹을 만들어보세요.
        </p>
        <Link href="/" className="btn pri">홈으로 가기</Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-h">
        <h1>✏️ 책 등록</h1>
        <span className="mini">『{membership.group.name}』에 등록됩니다</span>
      </div>
      {sp.error && <div className="toast err">{sp.error}</div>}
      <div className="card" style={{ maxWidth: 720 }}>
        <BookForm
          mode="create"
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
