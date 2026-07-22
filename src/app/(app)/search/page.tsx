import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentMembership } from "@/lib/session";
import { STATUS, STATUS_LABEL, type Status } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { searchNaverBooks } from "@/lib/naver";
import { Stars } from "@/components/Stars";
import { StoreLinks } from "@/components/StoreLinks";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const user = await requireUser("/search");
  const membership = await getCurrentMembership(user.id);
  if (!membership) redirect("/groups/search");

  const query = q.trim();
  const [groupResults, naver] = query
    ? await Promise.all([
        prisma.readingRecord.findMany({
          where: {
            groupId: membership.groupId,
            deletedAt: null,
            OR: [
              { book: { title: { contains: query } } },
              { book: { author: { contains: query } } },
            ],
          },
          include: { book: true, user: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
        searchNaverBooks(query),
      ])
    : [[], { items: [] as Awaited<ReturnType<typeof searchNaverBooks>>["items"] }];

  const registerHref = (b: (typeof naver.items)[number]) => {
    const p = new URLSearchParams();
    p.set("title", b.title);
    p.set("author", b.author);
    if (b.publisher) p.set("publisher", b.publisher);
    if (b.image) p.set("image", b.image);
    if (b.link) p.set("link", b.link);
    if (b.price) p.set("price", String(b.price));
    if (b.isbn) p.set("isbn", b.isbn);
    return `/books/new?${p.toString()}`;
  };

  return (
    <>
      <div className="page-h">
        <h1>🔍 책 검색</h1>
        <span className="mini">그룹 기록 + 네이버 책 검색을 한 번에</span>
      </div>

      <form method="GET" action="/search" className="fieldrow" style={{ marginBottom: 18 }}>
        <input className="input" name="q" defaultValue={q} placeholder="책 제목이나 저자를 검색해보세요" style={{ flex: 1, maxWidth: 440 }} />
        <button type="submit" className="btn pri">🔍 검색</button>
      </form>

      {query && (
        <>
          <section className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
              👥 우리 그룹의 기록 <span className="mini">『{membership.group.name}』 · {groupResults.length}건</span>
            </h3>
            {groupResults.length === 0 ? (
              <p className="mini" style={{ margin: 0 }}>그룹에서 아직 아무도 이 책을 기록하지 않았어요.</p>
            ) : (
              <div className="tablewrap">
                <table className="mt">
                  <tbody>
                    {groupResults.map((r) => (
                      <tr key={r.id}>
                        <td style={{ width: 44 }}>
                          <span className="cover" style={{ width: 30, height: 42 }}>
                            {r.book.thumbnailUrl ? <img src={r.book.thumbnailUrl} alt="" /> : <span className="bk" style={{ fontSize: 13 }}>📕</span>}
                          </span>
                        </td>
                        <td><b>{r.book.title}</b> <span className="mini">· {r.book.author}</span></td>
                        <td>{r.user.name}</td>
                        <td>
                          {r.status === STATUS.DONE && r.rating !== null ? (
                            <Stars rating={r.rating} size={12} />
                          ) : (
                            <span className="pill p-read">{STATUS_LABEL[r.status as Status]}</span>
                          )}
                        </td>
                        <td className="mini num">{r.endDate ? `${fmtDate(r.endDate)} 완독` : ""}</td>
                        <td>
                          <Link href={`/records/${r.id}`} className="mini" style={{ textDecoration: "underline" }}>
                            문장·느낀점 보기 →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
              🟢 네이버 책 검색 결과 <span className="mini">{naver.items.length}건</span>
            </h3>
            {naver.error && <p className="mini" style={{ color: "var(--danger)", fontWeight: 700 }}>{naver.error}</p>}
            {!naver.error && naver.items.length === 0 && <p className="mini" style={{ margin: 0 }}>검색 결과가 없어요.</p>}
            {naver.items.map((b, i) => (
              <div className="pickrow" key={b.isbn ?? i}>
                <span className="cover">{b.image ? <img src={b.image} alt="" /> : <span className="bk">📕</span>}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{b.title}</b>{" "}
                  <span className="mini">
                    {b.author} · {b.publisher}
                    {b.price ? ` · ${b.price.toLocaleString()}원` : ""}
                    {b.link && (
                      <>
                        {" · "}
                        <a href={b.link} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                          네이버에서 보기 ↗
                        </a>
                      </>
                    )}
                  </span>
                  <StoreLinks title={b.title} isbn={b.isbn} compact />
                </div>
                <Link href={registerHref(b)} className="btn sm pri">내 책장에 등록</Link>
              </div>
            ))}
            <p className="mini" style={{ margin: "8px 0 0", fontSize: 11.5 }}>
              서점 링크로 구매 시 운영자가 제휴 수수료를 받을 수 있어요.
            </p>
          </section>
        </>
      )}
    </>
  );
}
