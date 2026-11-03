import Link from "next/link";
import { Fragment } from "react";
import { fmtDate } from "@/lib/format";
import { parseClassNo, roomId, roomLabel, roomShort, sameRoom, type RoomKey } from "@/lib/class-no";
import {
  SORTS, sortStudents, scopeProgress, roomsNeedingCare, studentsInRoom, summarizeProgress,
  type ClassroomProgress, type SchoolView, type SortKey, type StudentProgress,
} from "@/lib/classroom-dashboard";
import { RoomComparison } from "@/components/RoomComparison";
import { RoomPicker } from "@/components/RoomPicker";

/** 상태별 색은 앱 전체의 pill(읽을예정·독서중·완독)과 같은 색을 쓴다 */
const C = { wish: "var(--sun-soft)", reading: "var(--mint-soft)", done: "var(--accent)" };

/** 챙겨볼 반의 이유별 안내 */
const CARE_KINDS = [
  { kind: "entry", label: "입장한 학생이 절반이 안 되는 반:", tip: "학생 입장 링크·QR을 다시 안내해 주세요" },
  { kind: "idle", label: "최근 7일 동안 기록이 없는 반:", tip: "" },
] as const;

function Tile({ label, emoji, value, bg }: { label: string; emoji: string; value: number; bg: string }) {
  return (
    <div className="bcol tile" style={{ background: bg }}>
      <div className="tile-l">
        {emoji} {label}
      </div>
      <div className="num tile-v">
        {value}
        <span>권</span>
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
    <span className="pbar" title={`읽을 예정 ${wish} · 독서중 ${reading} · 완독 ${done}`}>
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

/** 학생별 표 — 같은 표 안에서 가장 많이 기록한 학생의 막대가 100%가 되게 맞춘다 */
function StudentTable({ students }: { students: StudentProgress[] }) {
  const maxTotal = Math.max(...students.map((s) => s.total), 1);
  return (
    <div className="tablewrap">
      <table className="mt">
        <thead>
          <tr>
            <th className="col-no">반번호</th>
            <th>별명</th>
            <th className="col-prog">진행</th>
            <th className="hide-sm" style={{ width: 74 }}>읽을 예정</th>
            <th className="hide-sm" style={{ width: 62 }}>독서중</th>
            <th className="col-n">완독</th>
            <th className="col-n">합계</th>
            <th className="hide-sm" style={{ width: 86 }}>최근 활동</th>
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
                {s.entered && !s.hasPassword && (
                  <span className="pill p-wish" style={{ marginLeft: 6 }} title="아직 개인 비밀번호를 정하지 않았어요">🔑</span>
                )}
              </td>
              <td><ProgressBar wish={s.wish} reading={s.reading} done={s.done} max={maxTotal} /></td>
              <td className="num hide-sm">{s.wish || "-"}</td>
              <td className="num hide-sm">{s.reading || "-"}</td>
              <td className="num"><b>{s.done || "-"}</b></td>
              <td className="num">{s.total || "-"}</td>
              <td className="mini num hide-sm">{s.lastAt ? fmtDate(s.lastAt) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 학교 그룹의 학생 표 — 수백 명을 한 표에 펼치지 않고 반마다 접어 둔다.
 * 제목 줄에 그 반의 입장·이번 주 활동·완독을 보여줘 펼치지 않고도 어느 반을 볼지 고를 수 있다.
 * (정렬은 반 안에서 적용되고, 링크로 정렬을 바꿔도 펼친 반은 그대로 열려 있다)
 */
function RoomGroups({
  data,
  school,
  sort,
  careIds,
  roomHref,
}: {
  data: ClassroomProgress;
  school: SchoolView;
  sort: SortKey;
  careIds: Set<string>;
  roomHref?: (room: RoomKey | null) => string;
}) {
  const multiGrade = school.layout.grades.length > 1;
  const unmatched = data.students.filter((s) => !parseClassNo(s.classNo));
  return (
    <>
      <p className="mini" style={{ margin: "0 0 8px" }}>
        반을 누르면 학생 목록이 펼쳐져요.{careIds.size > 0 ? " 노란 반은 챙겨볼 반이에요." : ""}
      </p>
      {school.layout.grades.map((g) => (
        <Fragment key={g}>
          {multiGrade && <p className="mini" style={{ fontWeight: 800, margin: "12px 0 6px" }}>{g}학년</p>}
          {school.layout.rooms
            .filter((r) => r.grade === g)
            .map((r) => {
              const list = studentsInRoom(data.students, r);
              const sum = summarizeProgress(list);
              const care = careIds.has(roomId(r));
              return (
                <details key={roomId(r)} className={`roomgroup${care ? " care" : ""}`}>
                  <summary>
                    <b>{roomLabel(r)}</b>
                    <span className="mini num">
                      입장 {sum.enteredCount}/{sum.rosterCount} · 이번 주 {sum.weekActiveCount}명 · 완독 {sum.totals.done}권
                    </span>
                    {sum.noRecordCount > 0 && <span className="pill p-ghost">기록 없음 {sum.noRecordCount}</span>}
                    {sum.noPasswordCount > 0 && (
                      <span className="pill p-wish" title="개인 비밀번호를 아직 정하지 않은 학생">🔑 {sum.noPasswordCount}</span>
                    )}
                  </summary>
                  <div className="roomgroup-body">
                    {roomHref && (
                      <p className="mini" style={{ margin: "4px 4px 6px", textAlign: "right" }}>
                        <Link href={roomHref(r)} style={{ textDecoration: "underline" }}>이 반만 보기 →</Link>
                      </p>
                    )}
                    <StudentTable students={sortStudents(list, sort)} />
                  </div>
                </details>
              );
            })}
        </Fragment>
      ))}
      {unmatched.length > 0 && (
        <details className="roomgroup">
          <summary>
            <b>반을 알 수 없는 학생</b>
            <span className="mini num">{unmatched.length}명 · 반번호가 다섯 자리가 아니에요</span>
          </summary>
          <div className="roomgroup-body">
            <StudentTable students={sortStudents(unmatched, sort)} />
          </div>
        </details>
      )}
    </>
  );
}

export function ClassroomBoard({
  data,
  groupName,
  sort,
  sortHref,
  school = null,
  roomHref,
}: {
  data: ClassroomProgress;
  groupName: string;
  sort: SortKey;
  /** 정렬 칩 링크 — 다른 쿼리(랭킹 탭 등)를 유지하면서 정렬만 바꾼다 */
  sortHref: (key: SortKey) => string;
  /** 반번호로 반을 나눌 수 있는 학교 그룹이면 반별 현황과 반 고르기를 보여준다 */
  school?: SchoolView | null;
  /** 반 고르기 링크 — null이면 학교 전체 */
  roomHref?: (room: RoomKey | null) => string;
}) {
  const room = school?.room ?? null;
  // 반을 고르면 합계·요약·학생 표가 모두 그 반 기준으로 바뀐다 (비밀번호 경고는 학교 전체 기준)
  const scoped = scopeProgress(data, room);
  const { totals, rosterCount, enteredCount, noRecordCount, weekActiveCount, doneRate, participationRate, avgBooks } = scoped;
  const { noPasswordCount } = data;
  const students = sortStudents(scoped.students, sort);

  const care = school ? roomsNeedingCare(school.rooms) : [];
  const careIds = new Set(care.map((c) => roomId(c.room)));
  const roomRank = room && school ? school.standings.findIndex((s) => sameRoom(s.room, room)) : -1;
  const reportHref = room ? `/admin/report?room=${roomId(room)}` : "/admin/report";

  return (
    <>
      {/*
        개인 비밀번호를 아직 안 정한 학생 경고.
        이 학생들은 로그인 상태가 유지되는 동안에는 멀쩡히 쓰다가, 세션이 끊기는 순간
        반 비밀번호 없이는 다시 못 들어온다. 선생님이 미리 알아챌 수 있도록 띄운다.
      */}
      {noPasswordCount > 0 && (
        <div className="toast" style={{ background: "var(--sun-soft)" }}>
          🔑 개인 비밀번호를 아직 정하지 않은 학생이 <b>{noPasswordCount}명</b> 있어요.
          {school && (
            <span className="mini num" style={{ display: "block", marginTop: 4 }}>
              {school.rooms
                .filter((r) => r.noPassword > 0)
                .map((r) => `${roomShort(r.room)}반 ${r.noPassword}명`)
                .join(" · ")}
            </span>
          )}
          <span className="mini" style={{ display: "block", fontWeight: 400, marginTop: 4 }}>
            이 학생들은 로그아웃되거나 한참 뒤에 다시 들어올 때 <b>반 비밀번호</b>가 한 번 필요해요.
            수업 때 반 비밀번호를 알려주세요 — 기억나지 않으면{" "}
            <Link href="/admin/group" style={{ textDecoration: "underline" }}>👑 그룹 관리</Link>에서
            새로 정하면 됩니다. 한 번 들어와 본인 비밀번호를 정하면 그다음부터는 필요 없어요.
          </span>
        </div>
      )}

      {/* 학교 그룹 — 보고 싶은 반 고르기 */}
      {school && roomHref && (
        <section className="card" style={{ marginBottom: 16 }}>
          <RoomPicker layout={school.layout} room={room} href={roomHref} />
          {school.layout.unmatched > 0 && (
            <p className="mini" style={{ margin: "8px 0 0" }}>
              ⚠️ 반번호가 다섯 자리(학년 1 + 반 2 + 번호 2, 예: 30107)가 아닌 학생 {school.layout.unmatched}명은 반별 현황과 반 대항에서 빠져요.
              명렬에 학생을 추가할 때 다섯 자리로 적어주세요.
            </p>
          )}
        </section>
      )}

      {/* 학생 전체 합계 */}
      <div className="board tiles" style={{ marginBottom: 16 }}>
        <Tile label="읽을 예정" emoji="🌱" value={totals.wish} bg={C.wish} />
        <Tile label="독서중" emoji="📖" value={totals.reading} bg={C.reading} />
        <Tile label="완독" emoji="🏆" value={totals.done} bg="var(--panel)" />
      </div>

      {/* 반 전체 요약 지표 */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          📊 {room ? `${roomLabel(room)} 요약` : school ? "학교 전체 요약" : "반 전체 요약"}
        </h3>
        {school && roomRank >= 0 && (
          <p className="mini num" style={{ margin: "-4px 0 12px" }}>
            {school.standings[roomRank].done > 0 ? (
              <>
                🏫 반 대항 <b>{school.standings[roomRank].rank}위</b> / {school.standings.length}개 반 · 1인 완독{" "}
                <b>{school.standings[roomRank].avg}권</b> (올해)
              </>
            ) : (
              "🏫 반 대항 — 올해 완독이 아직 없어 순위가 없어요"
            )}
          </p>
        )}
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

      {/* 학교 그룹 — 반끼리 한눈에 비교 */}
      {school && !room && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>
            🏫 반별 현황 <span className="mini">{school.layout.rooms.length}개 반{roomHref ? " · 반을 누르면 그 반만 봐요" : ""}</span>
          </h3>
          {care.length > 0 && (
            // 이유별로 묶는다 — 반마다 "(입장 0/26명)"을 늘어놓으면 출시 직후처럼 모든 반이 해당될 때 한없이 길어진다
            <div className="mini" style={{ margin: "8px 0 10px", padding: "8px 12px", background: "var(--sun-soft)", borderRadius: 10 }}>
              <b>👀 챙겨볼 반</b>
              {CARE_KINDS.map(({ kind, label, tip }) => {
                const list = care.filter((c) => c.kind === kind);
                if (list.length === 0) return null;
                return (
                  <p key={kind} style={{ margin: "4px 0 0" }}>
                    {label}{" "}
                    {list.length === school.rooms.length ? (
                      <b>모든 반({list.length}개)</b>
                    ) : (
                      list.map((c, i) => (
                        <Fragment key={roomId(c.room)}>
                          {i > 0 && " · "}
                          {roomHref ? (
                            <Link href={roomHref(c.room)} style={{ textDecoration: "underline", whiteSpace: "nowrap" }}>
                              {roomShort(c.room)}반
                            </Link>
                          ) : (
                            <span style={{ whiteSpace: "nowrap" }}>{roomShort(c.room)}반</span>
                          )}
                        </Fragment>
                      ))
                    )}
                    {tip && ` — ${tip}`}
                  </p>
                );
              })}
            </div>
          )}
          <RoomComparison
            rooms={school.rooms}
            standings={school.standings}
            careIds={careIds}
            roomHref={roomHref ? (r) => roomHref(r) : undefined}
          />
          <p className="mini" style={{ margin: "8px 0 0" }}>
            <b>1인 완독</b>은 올해 완독한 책 수를 명렬 인원으로 나눈 값이에요 — 학생 랭킹의 <b>반 대항</b>과 같은 기준이라 인원이 다른 반끼리도 공정하게 비교돼요.
          </p>
        </section>
      )}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="fieldrow" style={{ gap: 8, alignItems: "baseline", margin: "0 0 4px" }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>
            🏫 {room ? `${roomLabel(room)} ` : ""}학생 독서 현황{" "}
            <span className="mini">『{groupName}』 · 명렬 {rosterCount}명</span>
          </h3>
          <span style={{ flex: 1 }} />
          <a href={reportHref} target="_blank" rel="noreferrer" className="btn sm pri">
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
        ) : school && !room ? (
          <RoomGroups data={data} school={school} sort={sort} careIds={careIds} roomHref={roomHref} />
        ) : (
          <StudentTable students={students} />
        )}
      </section>
    </>
  );
}
