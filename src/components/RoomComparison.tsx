import Link from "next/link";
import { Fragment } from "react";
import { roomId, roomShort, type RoomKey } from "@/lib/class-no";
import type { RoomSummary } from "@/lib/classroom-dashboard";
import type { RoomStanding } from "@/lib/class-rankings";

/** 완독 막대는 앱 전체의 완독 색, 입장 막대는 민트 */
const C = { done: "var(--accent)", entered: "var(--mint)" };

function Meter({ ratio, bg, className }: { ratio: number; bg: string; className?: string }) {
  return (
    <span className={`pbar${className ? ` ${className}` : ""}`} style={{ height: 10, minWidth: 44 }}>
      {ratio > 0 && <span style={{ width: `${Math.min(100, ratio)}%`, background: bg }} />}
    </span>
  );
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * 학교 그룹의 반별 현황표 — 입장·참여율·이번 주 활동·1인 완독(올해, 반 대항과 같은 기준).
 * 학년이 여럿이면 학년마다 합계 줄을 먼저 보여준다.
 * roomHref를 주면 반 이름이 그 반만 보는 링크가 되고, 보고서에서는 링크 없이 쓴다.
 */
export function RoomComparison({
  rooms,
  standings,
  careIds,
  roomHref,
}: {
  rooms: RoomSummary[];
  standings: RoomStanding[];
  /** 챙겨볼 반(roomId) — 줄을 살짝 강조한다 */
  careIds?: Set<string>;
  roomHref?: (room: RoomKey) => string;
}) {
  const standingOf = new Map(standings.map((s) => [roomId(s.room), s]));
  const maxAvg = Math.max(...standings.map((s) => s.avg), 0.1);
  const grades = [...new Set(rooms.map((r) => r.room.grade))];
  const multiGrade = grades.length > 1;

  return (
    <div className="tablewrap">
      <table className="mt">
        <thead>
          <tr>
            <th style={{ width: 52 }}>반</th>
            <th>입장</th>
            <th className="col-n">참여율</th>
            <th className="col-n">이번 주</th>
            <th>1인 완독 <span className="mini">올해</span></th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g) => {
            const inGrade = rooms.filter((r) => r.room.grade === g);
            const roster = inGrade.reduce((a, r) => a + r.roster, 0);
            const entered = inGrade.reduce((a, r) => a + r.entered, 0);
            const done = standings.filter((s) => s.room.grade === g).reduce((a, s) => a + s.done, 0);
            return (
              <Fragment key={g}>
                {multiGrade && (
                  <tr>
                    <td colSpan={5} style={{ background: "var(--chip)" }}>
                      <b>{g}학년</b>{" "}
                      <span className="mini num">
                        {inGrade.length}개 반 · 입장 {entered}/{roster}명 · 1인 완독 {roster > 0 ? round1(done / roster) : 0}권
                      </span>
                    </td>
                  </tr>
                )}
                {inGrade.map((r) => {
                  const st = standingOf.get(roomId(r.room));
                  const care = careIds?.has(roomId(r.room));
                  return (
                    <tr key={roomId(r.room)} style={care ? { background: "var(--sun-soft)" } : undefined}>
                      <td className="num">
                        {roomHref ? (
                          <Link href={roomHref(r.room)} style={{ textDecoration: "underline" }}>
                            <b>{roomShort(r.room)}</b>
                          </Link>
                        ) : (
                          <b>{roomShort(r.room)}</b>
                        )}
                      </td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Meter ratio={r.roster > 0 ? (r.entered / r.roster) * 100 : 0} bg={C.entered} className="hide-sm" />
                          <span className="mini num" style={{ whiteSpace: "nowrap" }}>{r.entered}/{r.roster}</span>
                        </span>
                      </td>
                      <td className="num">{r.participationRate}%</td>
                      <td className="num">{r.weekActive}명</td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Meter ratio={st ? (st.avg / maxAvg) * 100 : 0} bg={C.done} />
                          <span className="num" style={{ whiteSpace: "nowrap" }}>
                            <b>{st?.avg ?? 0}권</b>
                            {st && st.done > 0 && <span className="mini"> · {st.rank}위</span>}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
