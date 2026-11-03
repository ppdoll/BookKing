import { Fragment } from "react";
import { fmtDate, fmtDateFull } from "@/lib/format";
import { STATUS } from "@/lib/constants";
import { parseClassNo, roomLabel } from "@/lib/class-no";
import { studentsInRoom, type ClassroomProgress, type SchoolView, type StudentProgress } from "@/lib/classroom-dashboard";
import { RoomComparison } from "@/components/RoomComparison";

/** 상태별 색은 앱 전체의 pill(읽을예정·독서중·완독)과 같은 색 */
const C = { wish: "var(--sun-soft)", reading: "var(--mint-soft)", done: "var(--accent)" };

/** 한 학생이 기록한 책 — 완독·독서중·읽을 예정으로 묶어 제목을 나열한다 */
function StudentBooks({ s }: { s: StudentProgress }) {
  const groupsOfBooks = [
    { key: STATUS.DONE, label: "🏆 완독", bg: C.done },
    { key: STATUS.READING, label: "📖 독서중", bg: C.reading },
    { key: STATUS.WISH, label: "🌱 읽을 예정", bg: C.wish },
  ];
  return (
    <div
      style={{
        padding: "8px 0", borderBottom: "1.5px dashed var(--soft-line)",
        breakInside: "avoid", pageBreakInside: "avoid",
      }}
    >
      <p style={{ margin: "0 0 4px", fontSize: 13.5 }}>
        <b>{s.classNo}번 {s.nickname}</b> <span className="mini">{s.total}권</span>
      </p>
      {groupsOfBooks.map(({ key, label, bg }) => {
        const list = s.books.filter((b) => b.status === key);
        if (list.length === 0) return null;
        return (
          <p className="mini" key={key} style={{ margin: "2px 0 0", lineHeight: 1.7 }}>
            <span
              style={{
                background: bg, border: "1.5px solid var(--bd)", borderRadius: 5,
                padding: "0 6px", marginRight: 6, whiteSpace: "nowrap",
              }}
            >
              {label} {list.length}
            </span>
            {list.map((b, i) => (
              <span key={`${b.title}-${i}`}>
                {i > 0 && " · "}
                {b.title}
                {/* 완독한 책은 언제 다 읽었는지 함께 표시 */}
                {key === STATUS.DONE && b.endDate && (
                  <span className="num" style={{ opacity: 0.75 }}> ({fmtDateFull(b.endDate)})</span>
                )}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: "2px solid var(--bd)", borderRadius: 10, padding: "10px 12px" }}>
      <div className="mini" style={{ fontWeight: 800 }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{value}</div>
      {sub && <div className="mini num">{sub}</div>}
    </div>
  );
}

/**
 * 인쇄·공유용 학생 독서 현황 보고서.
 * 선생님 전용 화면(/admin/report)과 비밀 링크 공유 페이지(/report/[slug])가 함께 쓴다.
 * 학생은 실명 없이 별명으로만 표시된다.
 */
export function ClassroomReport({
  data,
  groupName,
  printedAt,
  school = null,
}: {
  /** 학교 그룹에서 한 반을 골랐다면 그 반 학생만으로 집계한 값 */
  data: ClassroomProgress;
  groupName: string;
  /** 보고서 생성 시각 (한국 시간 문자열) */
  printedAt: string;
  /** 학교 그룹이면 반별 현황(학교 전체일 때)이나 고른 반 이름을 함께 싣는다 */
  school?: SchoolView | null;
}) {
  const { students, totals, rosterCount, enteredCount, weekActiveCount, doneRate, participationRate, avgBooks } = data;
  const maxTotal = Math.max(...students.map((s) => s.total), 1);
  const scale = (n: number) => `${(n / maxTotal) * 100}%`;
  const room = school?.room ?? null;
  // 학교 전체 보고서는 반마다 제목 줄을 넣어 묶는다 (인쇄용이라 접지는 않는다)
  const unmatched = students.filter((s) => !parseClassNo(s.classNo));
  const groups: { label: string | null; students: StudentProgress[] }[] =
    school && !room
      ? [
          ...school.layout.rooms.map((r) => ({ label: roomLabel(r), students: studentsInRoom(students, r) })),
          ...(unmatched.length > 0 ? [{ label: "반을 알 수 없는 학생", students: unmatched }] : []),
        ]
      : [{ label: null, students }];

  return (
    <article>
      <header style={{ borderBottom: "3px solid var(--bd)", paddingBottom: 10, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
          📚 {room ? `${roomLabel(room)} ` : ""}학생 독서 현황
        </h1>
        <p className="mini" style={{ margin: "4px 0 0" }}>
          『{groupName}』 · 기준 시각 {printedAt}
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
        <Cell label="완독" value={`${totals.done}권`} sub={`전체 ${totals.total}권`} />
        <Cell label="독서중" value={`${totals.reading}권`} />
        <Cell label="읽을 예정" value={`${totals.wish}권`} />
        <Cell label="완독률" value={`${doneRate}%`} sub={`${totals.done} / ${totals.total}권`} />
        <Cell label="참여율" value={`${participationRate}%`} sub={`명렬 ${rosterCount}명 기준`} />
        <Cell label="1인 평균" value={`${avgBooks}권`} sub={`입장 ${enteredCount}/${rosterCount}명`} />
      </div>

      {school && !room && (
        <section style={{ marginBottom: 16, breakInside: "avoid" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>🏫 반별 현황</h2>
          <RoomComparison rooms={school.rooms} standings={school.standings} />
          <p className="mini" style={{ margin: "6px 0 0" }}>
            1인 완독 = 올해 완독한 책 수 ÷ 명렬 인원 (학생 랭킹의 반 대항과 같은 기준)
          </p>
        </section>
      )}

      <p className="mini" style={{ margin: "0 0 10px" }}>
        📅 이번 주 활동 <b>{weekActiveCount}/{rosterCount}명</b>
        {" · "}색상: <span style={{ background: C.done, padding: "1px 6px", borderRadius: 4, border: "1.5px solid var(--bd)" }}>완독</span>{" "}
        <span style={{ background: C.reading, padding: "1px 6px", borderRadius: 4, border: "1.5px solid var(--bd)" }}>독서중</span>{" "}
        <span style={{ background: C.wish, padding: "1px 6px", borderRadius: 4, border: "1.5px solid var(--bd)" }}>읽을 예정</span>
      </p>

      {rosterCount === 0 ? (
        <p className="mini">등록된 학생 명렬이 없어요.</p>
      ) : (
        <div className="tablewrap">
          <table className="mt">
            <thead>
              <tr>
                <th style={{ width: 58 }}>번호</th>
                <th>별명</th>
                <th style={{ minWidth: 100 }}>진행</th>
                <th style={{ width: 68 }}>읽을 예정</th>
                <th style={{ width: 58 }}>독서중</th>
                <th style={{ width: 52 }}>완독</th>
                <th style={{ width: 48 }}>합계</th>
                <th style={{ width: 80 }}>최근 활동</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.label ?? "all"}>
                  {g.label && (
                    <tr style={{ breakAfter: "avoid", pageBreakAfter: "avoid" }}>
                      <td colSpan={8} style={{ background: "var(--chip)" }}>
                        <b>{g.label}</b>{" "}
                        <span className="mini num">
                          · {g.students.length}명 · 입장 {g.students.filter((s) => s.entered).length}명 · 완독{" "}
                          {g.students.reduce((a, s) => a + s.done, 0)}권
                        </span>
                      </td>
                    </tr>
                  )}
                  {g.students.map((s) => (
                    <tr key={s.id}>
                      <td className="num"><b>{s.classNo}</b></td>
                      <td>
                        {s.nickname}
                        {!s.entered && <span className="mini"> (미입장)</span>}
                      </td>
                      <td>
                        {s.total === 0 ? (
                          <span className="mini">—</span>
                        ) : (
                          <span
                            style={{
                              display: "flex", height: 12, width: "100%", minWidth: 80,
                              border: "2px solid var(--bd)", borderRadius: 6, overflow: "hidden", background: "var(--chip)",
                            }}
                          >
                            {s.done > 0 && <span style={{ width: scale(s.done), background: C.done }} />}
                            {s.reading > 0 && <span style={{ width: scale(s.reading), background: C.reading }} />}
                            {s.wish > 0 && <span style={{ width: scale(s.wish), background: C.wish }} />}
                          </span>
                        )}
                      </td>
                      <td className="num">{s.wish || "-"}</td>
                      <td className="num">{s.reading || "-"}</td>
                      <td className="num"><b>{s.done || "-"}</b></td>
                      <td className="num">{s.total || "-"}</td>
                      <td className="mini num">{s.lastAt ? fmtDate(s.lastAt) : "-"}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.some((s) => s.books.length > 0) && (
        <section style={{ marginTop: 20, breakInside: "auto" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px", borderTop: "2px solid var(--bd)", paddingTop: 12 }}>
            📖 학생별 읽은 책
          </h2>
          {groups.map((g) => {
            const withBooks = g.students.filter((s) => s.books.length > 0);
            if (withBooks.length === 0) return null;
            return (
              <Fragment key={g.label ?? "all"}>
                {g.label && (
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: "14px 0 2px", breakAfter: "avoid", pageBreakAfter: "avoid" }}>
                    {g.label}
                  </h3>
                )}
                {withBooks.map((s) => (
                  <StudentBooks key={s.id} s={s} />
                ))}
              </Fragment>
            );
          })}
        </section>
      )}

      <footer className="mini" style={{ marginTop: 16, paddingTop: 10, borderTop: "2px dashed var(--soft-line)" }}>
        학생은 실명 없이 별명으로만 표시됩니다 · BookKing
      </footer>
    </article>
  );
}
