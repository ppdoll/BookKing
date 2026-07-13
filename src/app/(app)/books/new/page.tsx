import { redirect } from "next/navigation";
import { requireUser, getCurrentMembership } from "@/lib/session";
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
  if (!membership) redirect("/groups/new");

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
