import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { SORTS, sortStudents, type ClassroomProgress, type SortKey } from "@/lib/classroom-dashboard";

/** 상태별 색은 앱 전체의 pill(읽을예정·독서중·완독)과 같은 색을 쓴다 */
const C = { wish: "var(--sun-soft)", reading: "var(--mint-soft)", done: "var(--accent)" };

function Tile({ label, emoji, value, bg }: { label: string; emoji: string; value: number; bg: string }) {
  return (
    <div
      className="bcol"
      style={{ textAlign: "center", padding: "14px 10px", background: bg }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 800 }}>
        {emoji} {label}
      </div>
      <div className="num" style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.15 }}>
        {value}
        <span style={{ fontSize: 15, fontWeight: 800 }}>권</span>
      </div>
    </div>
  );
}

/** 학생 한 명의 읽을예정·독서중·완독 비율을 하나의 누적 막대로 (숫자도 함께 표시해 색맹 대응) */
function ProgressBar({ wish, reading, done, max }: { wish: number; reading: number; done: number; max: number }) {
  const total = wish + reading + done;
  if (total === 0) {
    return (
      <span className="mini" style={{ color: "var(--sub)" }}>
        —
      </span>
    );
  }
  // 가장 많이 기록한 학생의 막대가 100%가 되도록 맞춰 서로 비교하기 쉽게 한다
  const scale = (n: number) => `${(n / Math.max(max, 1)) * 100}%`;
  return (
    <span
      title={`읽을 예정 ${wish} · 독서중 ${reading} · 완독 ${done}`}
      style={{
        display: "flex", height: 14, width: "100%", minWidth: 90,
        border: "2px solid var(--bd)", borderRadius: 8, overflow: "hidden", background: "var(--chip)",
      }}
    >
      {done > 0 && <span style={{ width: scale(done), background: C.done }} />}
      {reading > 0 && <span style={{ width: scale(reading), background: C.reading }} />}
      {wish > 0 && <span style={{ width: scale(wish), background: C.wish }} />}
    </span>
  );
}

/** 요약 지표 하나 — 퍼센트 지표는 막대까지 함께 보여준다 */
function Metric({
  label, hint, value, ratio, detail,
}: { label: string; hint: string; value: string; ratio: number | null; detail: string }) {
  return (
    <div>
      <div className="mini" style={{ fontWeight: 800 }}>
        {label} <span style={{ fontWeight: 500 }}>· {hint}</span>
      </div>
      <div className="num" style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>{value}</div>
      {ratio !== null && (
        <span
          style={{
            display: "block", height: 8, marginTop: 4, background: "var(--chip)",
            border: "2px solid var(--bd)", borderRadius: 6, overflow: "hidden",
          }}
        >
          <span style={{ display: "block", width: `${ratio}%`, height: "100%", background: C.done }} />
        </span>
      )}
      <div className="mini num" style={{ marginTop: 3 }}>{detail}</div>
    </div>
  );
}

export function ClassroomBoard({
  data,
  groupName,
  sort,
  sortHref,
}: {
  data: ClassroomProgress;
  groupName: string;
  sort: SortKey;
  /** 정렬 칩 링크 — 다른 쿼리(랭킹 탭 등)를 유지하면서 정렬만 바꾼다 */
  sortHref: (key: SortKey) => string;
}) {
  const { totals, rosterCount, enteredCount, noRecordCount, weekActiveCount, doneRate, participationRate, avgBooks } = data;
  const students = sortStudents(data.students, sort);
  const maxTotal = Math.max(...students.map((s) => s.total), 1);

  return (
    <>
      {/* 학생 전체 합계 */}
      <div className="board" style={{ marginBottom: 16 }}>
        <Tile label="읽을 예정" emoji="🌱" value={totals.wish} bg={C.wish} />
        <Tile label="독서중" emoji="📖" value={totals.reading} bg={C.reading} />
        <Tile label="완독" emoji="🏆" value={totals.done} bg="var(--panel)" />
      </div>

      {/* 반 전체 요약 지표 */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>📊 반 전체 요약</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <Metric
            label="완독률"
            hint="완독 / 전체 기록"
            value={`${doneRate}%`}
            ratio={doneRate}
            detail={`${totals.done} / ${totals.total}권`}
          />
          <Metric
            label="참여율"
            hint="1권 이상 기록한 학생"
            value={`${participationRate}%`}
            ratio={participationRate}
            detail={`${Math.round((participationRate / 100) * rosterCount)} / ${rosterCount}명`}
          />
          <Metric
            label="1인 평균"
            hint="명렬 인원 기준"
            value={`${avgBooks}권`}
            ratio={null}
            detail={`전체 ${totals.total}권`}
          />
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="fieldrow" style={{ gap: 8, alignItems: "baseline", margin: "0 0 4px" }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>
            🏫 학생 독서 현황 <span className="mini">『{groupName}』 · 명렬 {rosterCount}명</span>
          </h3>
          <span style={{ flex: 1 }} />
          <a href="/admin/report" target="_blank" rel="noreferrer" className="btn sm pri">
            📄 보고서 (인쇄·PDF)
          </a>
        </div>
        <p className="mini" style={{ margin: "0 0 12px" }}>
          <span title="월요일부터 지금까지 기록을 남긴 학생 수">
            📅 이번 주 활동 <b>{weekActiveCount}/{rosterCount}명</b>
          </span>
          {" · 입장 "}
          <b>{enteredCount}/{rosterCount}명</b>
          {rosterCount - enteredCount > 0 && ` · 미입장 ${rosterCount - enteredCount}명`}
          {noRecordCount > 0 && ` · 입장했지만 기록 없음 ${noRecordCount}명`}
          {" · 전체 "}
          <b>{totals.total}권</b>
        </p>

        {/* 막대 색 설명 */}
        <p className="mini" style={{ margin: "0 0 10px", display: "flex", gap: 12, flexWrap: "wrap" }}>
          {([["완독", C.done], ["독서중", C.reading], ["읽을 예정", C.wish]] as const).map(([label, bg]) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, border: "2px solid var(--bd)", background: bg }} />
              {label}
            </span>
          ))}
        </p>

        {rosterCount > 0 && (
          <p className="mini" style={{ margin: "0 0 10px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            정렬
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <Link key={k} href={sortHref(k)} className={`fchip ${k === sort ? "on" : ""}`} scroll={false}>
                {SORTS[k]}
              </Link>
            ))}
          </p>
        )}

        {rosterCount === 0 ? (
          <p className="mini" style={{ margin: 0 }}>
            아직 등록된 명렬이 없어요. <b>👑 그룹 관리 → 🏫 학교(교실) 모드</b>에서 학생 명렬을 추가해주세요.
          </p>
        ) : (
          <div className="tablewrap">
            <table className="mt">
              <thead>
                <tr>
                  <th style={{ width: 62 }}>반번호</th>
                  <th>별명</th>
                  <th style={{ minWidth: 110 }}>진행</th>
                  <th style={{ width: 74 }}>읽을 예정</th>
                  <th style={{ width: 62 }}>독서중</th>
                  <th style={{ width: 56 }}>완독</th>
                  <th style={{ width: 52 }}>합계</th>
                  <th style={{ width: 86 }}>최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    // 챙겨봐야 할 학생(미입장·기록 없음)은 살짝 강조
                    style={!s.entered || s.total === 0 ? { background: "var(--chip)" } : undefined}
                  >
                    <td className="num"><b>{s.classNo}</b></td>
                    <td>
                      <Link href={`/admin/student/${s.id}`} style={{ textDecoration: "underline" }}>
                        {s.nickname}
                      </Link>
                      {!s.entered && <span className="pill p-ghost" style={{ marginLeft: 6 }}>미입장</span>}
                    </td>
                    <td><ProgressBar wish={s.wish} reading={s.reading} done={s.done} max={maxTotal} /></td>
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
      </section>
    </>
  );
}
