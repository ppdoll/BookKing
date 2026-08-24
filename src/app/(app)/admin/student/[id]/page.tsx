import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/session";
import { STATUS, STATUS_LABEL, type Status } from "@/lib/constants";
import { fmtDate, fmtDateFull, readingDays } from "@/lib/format";
import { isExpired } from "@/lib/group-expiry";
import { Stars } from "@/components/Stars";

/** 학교(교실) 모드 — 선생님이 학생 한 명의 독서 기록만 모아 보는 화면 */
export default async function StudentRecordsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/admin/student/${id}`);

  const student = await prisma.classroomStudent.findUnique({
    where: { id },
    include: { group: true },
  });
  if (!student || !student.group.classroomMode || isExpired(student.group)) redirect("/");

  // 그 반의 선생님(그룹장·운영자)만 열람 가능
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: student.groupId } },
  });
  if (!membership || !isAdmin(membership.role)) redirect("/");

  const records = student.claimedByUserId
    ? await prisma.readingRecord.findMany({
        where: { userId: student.claimedByUserId, groupId: student.groupId, deletedAt: null },
        include: { book: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const byStatus = {
    [STATUS.WISH]: records.filter((r) => r.status === STATUS.WISH),
    [STATUS.READING]: records.filter((r) => r.status === STATUS.READING),
    [STATUS.DONE]: records.filter((r) => r.status === STATUS.DONE),
  };
  const rated = byStatus[STATUS.DONE].filter((r) => r.rating !== null);
  const avgStars =
    rated.length > 0
      ? Math.round((rated.reduce((a, r) => a + (r.rating ?? 0), 0) / rated.length / 2) * 10) / 10
      : null;

  const groups: { key: Status; emoji: string; pill: string }[] = [
    { key: STATUS.DONE, emoji: "🏆", pill: "p-done" },
    { key: STATUS.READING, emoji: "📖", pill: "p-read" },
    { key: STATUS.WISH, emoji: "🌱", pill: "p-wish" },
  ];

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-h">
        <h1>
          🧑‍🎓 {student.classNo}번 {student.nickname}
        </h1>
        <span className="mini">『{student.group.name}』 · 선생님 전용</span>
      </div>

      <p style={{ margin: "0 0 14px" }}>
        <Link href="/" className="btn sm">← 학생 현황으로</Link>
      </p>

      {!student.claimedByUserId ? (
        <section className="card">
          <p style={{ margin: 0, fontWeight: 800 }}>아직 입장하지 않은 학생이에요</p>
          <p className="mini" style={{ margin: "6px 0 0" }}>
            학생이 입장 링크에서 <b>{student.classNo}번</b>과 비밀번호를 입력하면 기록을 남길 수 있어요.
          </p>
        </section>
      ) : (
        <>
          <section className="card" style={{ marginBottom: 16 }}>
            <p className="mini" style={{ margin: 0 }}>
              전체 <b>{records.length}권</b>
              {" · "}완독 <b>{byStatus[STATUS.DONE].length}권</b>
              {" · "}독서중 <b>{byStatus[STATUS.READING].length}권</b>
              {" · "}읽을 예정 <b>{byStatus[STATUS.WISH].length}권</b>
              {avgStars !== null && (
                <>
                  {" · 평균 별점 "}
                  <b>{avgStars}</b>
                </>
              )}
            </p>
          </section>

          {records.length === 0 ? (
            <section className="card">
              <p className="mini" style={{ margin: 0 }}>아직 기록한 책이 없어요.</p>
            </section>
          ) : (
            groups.map(({ key, emoji, pill }) => {
              const list = byStatus[key];
              if (list.length === 0) return null;
              return (
                <section className="card" style={{ marginBottom: 16 }} key={key}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
                    {emoji} <span className={`pill ${pill}`}>{STATUS_LABEL[key]}</span>{" "}
                    <span className="mini">{list.length}권</span>
                  </h3>
                  {list.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex", gap: 12, padding: "10px 0",
                        borderBottom: "1.5px dashed var(--soft-line)",
                      }}
                    >
                      <span className="cover" style={{ width: 38, height: 54, flex: "none" }}>
                        {r.book.thumbnailUrl ? <img src={r.book.thumbnailUrl} alt="" /> : <span className="bk">📕</span>}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <b>
                          <Link href={`/records/${r.id}`}>{r.book.title}</Link>
                        </b>
                        <p className="mini" style={{ margin: "2px 0 0" }}>
                          {r.book.author}
                          {r.status === STATUS.DONE && r.endDate && ` · ${fmtDateFull(r.endDate)} 완독`}
                          {r.status === STATUS.DONE && readingDays(r.startDate, r.endDate)
                            ? ` · ${readingDays(r.startDate, r.endDate)}일 걸림`
                            : ""}
                          {r.status === STATUS.READING && r.startDate && ` · ${fmtDate(r.startDate)}부터`}
                        </p>
                        {r.rating !== null && <Stars rating={r.rating} size={13} />}
                        {r.memorableQuote && (
                          <p className="mini" style={{ margin: "4px 0 0", fontStyle: "italic" }}>
                            “{r.memorableQuote}”
                          </p>
                        )}
                        {r.review && (
                          <p className="mini" style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{r.review}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
