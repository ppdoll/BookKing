import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, isAdmin, canWriteInGroup } from "@/lib/session";
import { toDateInput } from "@/lib/format";
import { ratingToStars } from "@/lib/constants";
import { softDeleteRecord } from "@/lib/actions/record-actions";
import { BookForm } from "@/components/BookForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export default async function EditBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; finished?: string }>;
}) {
  const { id } = await params;
  const { error, finished } = await searchParams;
  const user = await requireUser(`/books/${id}/edit`);

  const record = await prisma.readingRecord.findUnique({
    where: { id },
    include: { book: true, user: { select: { name: true } } },
  });
  if (!record || record.deletedAt) redirect("/shelf");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: record.groupId } },
    include: { group: true },
  });
  const mine = record.userId === user.id;
  const canEdit = mine || (membership && isAdmin(membership.role));
  if (!canEdit) redirect("/");
  // 보기 전용 그룹은 그룹장만 수정 가능
  if (!membership || !canWriteInGroup(membership.role, membership.group)) redirect(`/records/${record.id}`);

  return (
    <>
      <div className="page-h">
        <h1>✏️ 기록 수정</h1>
        {!mine && <span className="pill p-ghost">작성자: {record.user.name} (관리 권한으로 수정 중)</span>}
      </div>
      {finished && <div className="toast">🎉 완독 축하해요! 별점과 느낀 점을 남겨보세요.</div>}
      {error && <div className="toast err">{error}</div>}
      <div className="card" style={{ maxWidth: 720 }}>
        <BookForm
          mode="edit"
          initial={{
            recordId: record.id,
            title: record.book.title,
            author: record.book.author,
            publisher: record.book.publisher ?? "",
            thumbnailUrl: record.book.thumbnailUrl ?? "",
            link: record.book.link ?? "",
            price: record.book.price,
            isbn: record.book.isbn,
            status: record.status,
            startDate: toDateInput(record.startDate),
            endDate: toDateInput(record.endDate),
            stars: record.rating !== null ? ratingToStars(record.rating) : null,
            mbti: record.recommendMbti,
            quote: record.memorableQuote,
            review: record.review,
          }}
        />
        <form action={softDeleteRecord} style={{ marginTop: 14, borderTop: "2px dashed var(--soft-line)", paddingTop: 12 }}>
          <input type="hidden" name="recordId" value={record.id} />
          <input type="hidden" name="backTo" value="/shelf" />
          <ConfirmSubmit message="삭제할까요? (그룹장이 복구 가능)" className="btn sm dngr">
            🗑 기록 삭제
          </ConfirmSubmit>
        </form>
      </div>
    </>
  );
}
