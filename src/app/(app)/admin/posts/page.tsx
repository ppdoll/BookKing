import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentMembership, isAdmin } from "@/lib/session";
import { STATUS, STATUS_LABEL, type Status } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { softDeleteRecord } from "@/lib/actions/record-actions";
import { Stars } from "@/components/Stars";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

const PAGE_SIZE = 10;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ by?: string; q?: string; take?: string }>;
}) {
  const { by = "user", q = "", take: takeRaw } = await searchParams;
  const user = await requireUser("/admin/posts");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isAdmin(membership.role)) redirect("/");

  const take = Math.min(500, Math.max(PAGE_SIZE, Number(takeRaw) || PAGE_SIZE));
  const query = q.trim();

  // 검색어가 없으면 그룹 최신 기록, 있으면 필터 — 둘 다 [더 보기]로 계속 추가
  const fetched = await prisma.readingRecord.findMany({
    where: {
      groupId: membership.groupId,
      ...(query
        ? by === "title"
          ? { book: { title: { contains: query } } }
          : { user: { name: { contains: query } } }
        : {}),
    },
    include: { book: true, user: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: take + 1, // 다음 페이지 존재 여부 확인용
  });
  const hasMore = fetched.length > take;
  const records = fetched.slice(0, take);

  // 삭제자 이름 표시용
  const deleterIds = [...new Set(records.map((r) => r.deletedBy).filter((v): v is string => Boolean(v)))];
  const deleters = deleterIds.length
    ? await prisma.user.findMany({ where: { id: { in: deleterIds } }, select: { id: true, name: true } })
    : [];
  const deleterName = (id: string | null) => deleters.find((d) => d.id === id)?.name ?? "?";

  return (
    <>
      <div className="page-h">
        <h1>🧹 글 관리</h1>
        <span className="mini">『{membership.group.name}』 · 운영자 전용</span>
      </div>

      <form method="GET" action="/admin/posts" className="fieldrow" style={{ marginBottom: 16 }}>
        <select className="input" name="by" defaultValue={by} style={{ width: "auto" }} aria-label="검색 기준">
          <option value="user">사용자 이름</option>
          <option value="title">책 제목</option>
        </select>
        <input className="input" name="q" defaultValue={q} placeholder="검색어 입력" style={{ flex: 1, maxWidth: 320 }} />
        <button type="submit" className="btn pri">🔍 검색</button>
      </form>

      {records.length === 0 ? (
        <div className="emptybox">{query ? "검색 결과가 없어요." : "아직 그룹에 기록이 없어요."}</div>
      ) : (
        <>
        <p className="mini" style={{ margin: "0 0 8px" }}>
          {query ? `“${query}” 검색 결과` : "그룹 최신 기록"} · {records.length}개 표시 중
        </p>
        <div className="card tablewrap">
          <table className="mt">
            <thead>
              <tr>
                <th>책</th><th>작성자</th><th>상태</th><th>날짜</th><th>별점</th><th style={{ width: 160 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={r.deletedAt ? { opacity: 0.6 } : undefined}>
                  <td>
                    {r.deletedAt ? <del>{r.book.title}</del> : <Link href={`/records/${r.id}`}><b>{r.book.title}</b></Link>}{" "}
                    <span className="mini">· {r.book.author}</span>
                  </td>
                  <td>{r.user.name}</td>
                  <td>
                    {r.deletedAt ? (
                      <span className="pill p-ghost">삭제됨</span>
                    ) : (
                      <span className={`pill ${r.status === STATUS.DONE ? "p-done" : r.status === STATUS.READING ? "p-read" : "p-wish"}`}>
                        {STATUS_LABEL[r.status as Status]}
                      </span>
                    )}
                  </td>
                  <td className="mini num">{fmtDate(r.endDate ?? r.startDate ?? r.createdAt)}</td>
                  <td>{r.rating !== null ? <Stars rating={r.rating} size={12} /> : <span className="mini">—</span>}</td>
                  <td>
                    {r.deletedAt ? (
                      <span className="mini">
                        {deleterName(r.deletedBy)}이(가) {fmtDate(r.deletedAt)} 삭제
                      </span>
                    ) : (
                      <span className="fieldrow" style={{ gap: 6 }}>
                        <Link href={`/books/${r.id}/edit`} className="btn sm">수정</Link>
                        <form action={softDeleteRecord} style={{ display: "inline" }}>
                          <input type="hidden" name="recordId" value={r.id} />
                          <input type="hidden" name="backTo" value={`/admin/posts?by=${by}&q=${encodeURIComponent(q)}`} />
                          <ConfirmSubmit message="삭제? (복구 가능)" className="btn sm dngr">
                            삭제
                          </ConfirmSubmit>
                        </form>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <p style={{ marginTop: 12, textAlign: "center" }}>
            <Link
              href={`/admin/posts?by=${by}&q=${encodeURIComponent(q)}&take=${take + PAGE_SIZE}`}
              className="btn"
            >
              더 보기 +{PAGE_SIZE}
            </Link>
          </p>
        )}
        </>
      )}
    </>
  );
}
