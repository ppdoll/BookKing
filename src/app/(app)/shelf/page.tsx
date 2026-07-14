import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentMembership } from "@/lib/session";
import { STATUS, STATUS_LABEL, type Status } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { Stars } from "@/components/Stars";

const SORTS = [
  { key: "date", label: "읽은 날짜" },
  { key: "stars", label: "평가(별점)" },
  { key: "title", label: "제목" },
  { key: "author", label: "저자" },
] as const;

export default async function ShelfPage({
  searchParams,
}: {
  searchParams: Promise<{ st?: string; sort?: string; dir?: string; created?: string; updated?: string; error?: string }>;
}) {
  const { st = "ALL", sort = "date", dir = "desc", created, updated, error } = await searchParams;
  const user = await requireUser("/shelf");
  const membership = await getCurrentMembership(user.id);
  if (!membership) redirect("/groups/search");

  const records = await prisma.readingRecord.findMany({
    where: {
      userId: user.id,
      groupId: membership.groupId,
      deletedAt: null,
      ...(st !== "ALL" ? { status: st } : {}),
    },
    include: { book: true },
  });

  const mul = dir === "asc" ? 1 : -1;
  records.sort((a, b) => {
    switch (sort) {
      case "stars":
        return ((a.rating ?? -1) - (b.rating ?? -1)) * mul;
      case "title":
        return a.book.title.localeCompare(b.book.title, "ko") * mul;
      case "author":
        return a.book.author.localeCompare(b.book.author, "ko") * mul;
      default: {
        const ad = a.endDate ?? a.startDate ?? a.createdAt;
        const bd = b.endDate ?? b.startDate ?? b.createdAt;
        return (ad.getTime() - bd.getTime()) * mul;
      }
    }
  });

  const q = (nst: string, nsort: string, ndir: string) =>
    `/shelf?st=${nst}&sort=${nsort}&dir=${ndir}`;

  return (
    <>
      {created && <div className="toast">📚 책이 등록됐어요!</div>}
      {updated && <div className="toast">✅ 기록이 수정됐어요!</div>}
      {error && <div className="toast err">{error}</div>}
      <div className="page-h">
        <h1>📖 내 책장</h1>
        <span className="mini">『{membership.group.name}』 · {records.length}권</span>
      </div>

      <div className="shelfbar">
        {(["ALL", STATUS.WISH, STATUS.READING, STATUS.DONE] as const).map((s) => (
          <Link key={s} href={q(s, sort, dir)} className={`fchip ${st === s ? "on" : ""}`}>
            {s === "ALL" ? "전체" : STATUS_LABEL[s as Status]}
          </Link>
        ))}
        <span className="spacer" />
        <span className="mini">정렬:</span>
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={q(st, s.key, sort === s.key && dir === "desc" ? "asc" : "desc")}
            className={`fchip ${sort === s.key ? "on" : ""}`}
          >
            {s.label}
            {sort === s.key ? (dir === "desc" ? " ↓" : " ↑") : ""}
          </Link>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="emptybox">
          아직 책장이 비어 있어요.{" "}
          <Link href="/books/new" style={{ fontWeight: 800, textDecoration: "underline" }}>
            첫 책을 등록
          </Link>
          해보세요! 📚
        </div>
      ) : (
        <div className="shelf">
          {records.map((r) => (
            <div className="shelfitem" key={r.id}>
              <Link href={`/books/${r.id}/edit`}>
                <span className="cover">
                  {r.book.thumbnailUrl ? (
                    <img src={r.book.thumbnailUrl} alt={r.book.title} />
                  ) : (
                    <>
                      <span className="bk">📕</span>
                      {r.book.title}
                    </>
                  )}
                </span>
              </Link>
              <b>{r.book.title}</b>
              <span className="mini">{r.book.author}</span>
              <div style={{ marginTop: 2 }}>
                {r.status === STATUS.DONE ? (
                  <>
                    {r.rating !== null && <Stars rating={r.rating} size={12} />}
                    <span className="mini num"> {r.endDate ? `${fmtDate(r.endDate)} 완독` : ""}</span>
                  </>
                ) : (
                  <span className={`pill ${r.status === STATUS.READING ? "p-read" : "p-wish"}`}>
                    {STATUS_LABEL[r.status as Status]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
