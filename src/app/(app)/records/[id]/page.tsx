import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { STATUS_LABEL, type Status, MBTI_ALL } from "@/lib/constants";
import { fmtDateFull, readingDays } from "@/lib/format";
import { Stars } from "@/components/Stars";
import { StoreLinks } from "@/components/StoreLinks";

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/records/${id}`);

  const record = await prisma.readingRecord.findUnique({
    where: { id },
    include: { book: true, user: { select: { name: true } }, group: { select: { name: true } } },
  });
  if (!record || record.deletedAt) redirect("/");

  // 같은 그룹 멤버만 열람 가능 (그룹 격리)
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: record.groupId } },
  });
  if (!membership) redirect("/");

  const days = readingDays(record.startDate, record.endDate);
  const mbti = record.recommendMbti
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-h">
        <h1>📖 독서 기록</h1>
        <span className="mini">『{record.group.name}』 · {record.user.name}</span>
      </div>
      <div className="card">
        <div style={{ display: "flex", gap: 16 }}>
          <span className="cover" style={{ width: 88, height: 124 }}>
            {record.book.thumbnailUrl ? <img src={record.book.thumbnailUrl} alt="" /> : <span className="bk">📕</span>}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: "0 0 2px", fontSize: 19 }}>{record.book.title}</h2>
            <p className="mini" style={{ margin: 0 }}>
              {record.book.author}
              {record.book.publisher ? ` · ${record.book.publisher}` : ""}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <span className="pill p-read">{STATUS_LABEL[record.status as Status]}</span>{" "}
              {record.rating !== null && <Stars rating={record.rating} size={15} />}
            </p>
            <p className="mini num" style={{ margin: "8px 0 0" }}>
              {record.startDate && `${fmtDateFull(record.startDate)} ~ `}
              {record.endDate && fmtDateFull(record.endDate)}
              {days ? ` · 총 ${days}일` : ""}
            </p>
            {record.book.link && (
              <p style={{ margin: "8px 0 0" }}>
                <a href={record.book.link} target="_blank" rel="noreferrer" className="mini" style={{ textDecoration: "underline" }}>
                  네이버에서 보기 ↗{record.book.price ? ` (${record.book.price.toLocaleString()}원)` : ""}
                </a>
              </p>
            )}
          </div>
        </div>

        <StoreLinks title={record.book.title} isbn={record.book.isbn} />

        {mbti && mbti.length > 0 && (
          <>
            <p className="flabel">이런 사람에게 추천</p>
            <p style={{ margin: 0 }}>
              {mbti.map((t) => (
                <span key={t} className="pill p-wish" style={{ marginRight: 5 }}>
                  {t === MBTI_ALL ? "💛 모두에게" : t}
                </span>
              ))}
            </p>
          </>
        )}

        {record.memorableQuote && (
          <>
            <p className="flabel">기억에 남는 문장</p>
            <blockquote
              style={{
                margin: 0, background: "var(--sun-soft)", border: "2px solid var(--bd)",
                borderRadius: 12, padding: "10px 14px", fontSize: 14,
              }}
            >
              “{record.memorableQuote}”
            </blockquote>
          </>
        )}

        {record.review && (
          <>
            <p className="flabel">읽고 느낀 점</p>
            <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{record.review}</p>
          </>
        )}

        {record.userId === user.id && (
          <p style={{ margin: "16px 0 0" }}>
            <Link href={`/books/${record.id}/edit`} className="btn sm">✏️ 수정하기</Link>
          </p>
        )}
      </div>
    </div>
  );
}
