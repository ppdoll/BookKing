import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentMembership, canWriteInGroup, isOwner } from "@/lib/session";
import { STATUS } from "@/lib/constants";
import { fmtDate, readingDays } from "@/lib/format";
import { startReading, finishReading } from "@/lib/actions/record-actions";
import { leaveGroup } from "@/lib/actions/group-actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { getMonthlyDone } from "@/lib/rankings";
import { Stars } from "@/components/Stars";
import { RankingSidebar } from "@/components/RankingSidebar";
import { SubmitButton } from "@/components/SubmitButton";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ rt?: string; rb?: string; joined?: string; left?: string; error?: string }>;
}) {
  const { rt = "group", rb = "rating", joined, left, error } = await searchParams;
  const user = await requireUser("/");
  const membership = await getCurrentMembership(user.id);

  // 가입한 그룹이 없으면 그룹 검색이 기본 화면
  if (!membership) redirect("/groups/search?welcome=1");

  const viewOnly = !canWriteInGroup(membership.role, membership.group);

  const year = new Date().getFullYear();
  const [myRecords, groupFeed, months] = await Promise.all([
    prisma.readingRecord.findMany({
      where: { userId: user.id, groupId: membership.groupId, deletedAt: null },
      include: { book: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.readingRecord.findMany({
      where: { groupId: membership.groupId, deletedAt: null },
      include: { book: true, user: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    getMonthlyDone(user.id, membership.groupId, year),
  ]);

  const wish = myRecords.filter((r) => r.status === STATUS.WISH);
  const reading = myRecords.filter((r) => r.status === STATUS.READING);
  const done = myRecords.filter((r) => r.status === STATUS.DONE);
  const maxMonth = Math.max(...months, 1);

  return (
    <>
      {joined && <div className="toast">🎉 『{membership.group.name}』 가입 완료! {viewOnly ? "그룹장의 기록을 구경해보세요." : "첫 책을 등록해보세요."}</div>}
      {left && <div className="toast">그룹에서 나왔어요.</div>}
      {error && <div className="toast err">{error}</div>}
      {viewOnly && (
        <div className="toast" style={{ background: "var(--sun-soft)" }}>
          👀 이 그룹은 <b>보기 전용</b>이에요 — 기록 등록은 그룹장·운영자만 할 수 있어요.
        </div>
      )}
      <div className="home-grid">
        <div>
          <div className="board">
            <section className="bcol">
              <h3>🌱 <span className="pill p-wish">읽을 예정</span> <span className="cnt">{wish.length}권</span></h3>
              {wish.length === 0 && <p className="mini">읽고 싶은 책을 등록해보세요!</p>}
              {wish.slice(0, 5).map((r) => (
                <div className="bcard" key={r.id}>
                  <b><Link href={`/books/${r.id}/edit`}>{r.book.title}</Link></b>
                  <span className="mini">{r.book.author}</span>
                  {!viewOnly && (
                    <form action={startReading}>
                      <input type="hidden" name="recordId" value={r.id} />
                      <SubmitButton pendingText="시작하는 중… 📖">독서 시작!</SubmitButton>
                    </form>
                  )}
                </div>
              ))}
            </section>
            <section className="bcol">
              <h3>📖 <span className="pill p-read">독서중</span> <span className="cnt">{reading.length}권</span></h3>
              {reading.length === 0 && <p className="mini">지금 읽고 있는 책이 없어요.</p>}
              {reading.slice(0, 5).map((r) => {
                const days = r.startDate
                  ? Math.max(1, Math.round((Date.now() - r.startDate.getTime()) / 86400000) + 1)
                  : null;
                return (
                  <div className="bcard" key={r.id}>
                    <b><Link href={`/books/${r.id}/edit`}>{r.book.title}</Link></b>
                    <span className="mini">
                      {r.book.author}
                      {r.startDate ? ` · ${fmtDate(r.startDate)}부터` : ""}
                      {days ? ` · ${days}일째` : ""}
                    </span>
                    {!viewOnly && (
                      <form action={finishReading}>
                        <input type="hidden" name="recordId" value={r.id} />
                        <SubmitButton pendingText="축하 준비 중… 🎉">다 읽었어요!</SubmitButton>
                      </form>
                    )}
                  </div>
                );
              })}
            </section>
            <section className="bcol">
              <h3>🏆 <span className="pill p-done">완독</span> <span className="cnt">{done.length}권</span></h3>
              {done.length === 0 && <p className="mini">완독한 책이 여기 쌓여요.</p>}
              {done.slice(0, 5).map((r) => {
                const days = readingDays(r.startDate, r.endDate);
                return (
                  <div className="bcard" key={r.id}>
                    <b><Link href={`/books/${r.id}/edit`}>{r.book.title}</Link></b>
                    <span className="mini">
                      {r.book.author}
                      {r.endDate ? ` · ${fmtDate(r.endDate)} 완독` : ""}
                      {days ? ` · ${days}일 걸림` : ""}
                    </span>
                    {r.rating !== null && <Stars rating={r.rating} size={13} />}
                  </div>
                );
              })}
            </section>
          </div>

          <section className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>
              🗓️ 올해의 독서 기록 <span className="mini">{year}년 · 월별 완독 수</span>
            </h3>
            <div className="chart">
              {months.map((count, i) => (
                <div
                  key={i}
                  className={`bar ${count === 0 ? "zero" : ""}`}
                  style={{ height: `${count === 0 ? 6 : Math.max(14, (count / maxMonth) * 100)}%` }}
                >
                  {count > 0 && <span className="v num">{count}</span>}
                </div>
              ))}
            </div>
            <div className="chart-x">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i}>{i + 1}월</span>
              ))}
            </div>
          </section>

          <section className="card">
            <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
              💬 그룹 최근 기록 <span className="mini">{membership.group.name}</span>
            </h3>
            {groupFeed.length === 0 ? (
              <p className="mini">아직 그룹에 기록이 없어요. 첫 기록의 주인공이 되어보세요!</p>
            ) : (
              <div className="tablewrap">
                <table className="mt">
                  <tbody>
                    {groupFeed.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/records/${r.id}`}>
                            <b>{r.book.title}</b> <span className="mini">· {r.book.author}</span>
                          </Link>
                        </td>
                        <td>{r.user.name}</td>
                        <td>
                          {r.status === STATUS.DONE ? (
                            r.rating !== null ? (
                              <Stars rating={r.rating} size={12} />
                            ) : (
                              <span className="pill p-done">완독</span>
                            )
                          ) : r.status === STATUS.READING ? (
                            <span className="pill p-read">독서중</span>
                          ) : (
                            <span className="pill p-wish">읽을 예정</span>
                          )}
                        </td>
                        <td className="mini num">
                          {r.status === STATUS.DONE && r.endDate
                            ? `${fmtDate(r.endDate)} 완독`
                            : r.startDate
                              ? `${fmtDate(r.startDate)} 시작`
                              : fmtDate(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {!isOwner(membership.role) && (
            <form action={leaveGroup} style={{ marginTop: 14, textAlign: "right" }}>
              <input type="hidden" name="groupId" value={membership.groupId} />
              <ConfirmSubmit
                message={`『${membership.group.name}』에서 나갈까요?`}
                className="btn sm"
              >
                🚪 이 그룹에서 나가기
              </ConfirmSubmit>
            </form>
          )}
        </div>

        <RankingSidebar groupId={membership.groupId} rt={rt} rb={rb} />
      </div>
    </>
  );
}
