import { fmtDate } from "@/lib/format";
import type { ClassroomProgress } from "@/lib/classroom-dashboard";

/** 상태별 색은 앱 전체의 pill(읽을예정·독서중·완독)과 같은 색 */
const C = { wish: "var(--sun-soft)", reading: "var(--mint-soft)", done: "var(--accent)" };

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
}: {
  data: ClassroomProgress;
  groupName: string;
  /** 보고서 생성 시각 (한국 시간 문자열) */
  printedAt: string;
}) {
  const { students, totals, rosterCount, enteredCount, weekActiveCount, doneRate, participationRate, avgBooks } = data;
  const maxTotal = Math.max(...students.map((s) => s.total), 1);
  const scale = (n: number) => `${(n / maxTotal) * 100}%`;

  return (
    <article>
      <header style={{ borderBottom: "3px solid var(--bd)", paddingBottom: 10, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>📚 학생 독서 현황</h1>
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
              {students.map((s) => (
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
            </tbody>
          </table>
        </div>
      )}

      <footer className="mini" style={{ marginTop: 16, paddingTop: 10, borderTop: "2px dashed var(--soft-line)" }}>
        학생은 실명 없이 별명으로만 표시됩니다 · BookKing
      </footer>
    </article>
  );
}
