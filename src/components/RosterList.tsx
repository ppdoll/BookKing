import { detectRoomLayout, parseClassNo, roomId, roomLabel, sameRoom } from "@/lib/class-no";
import { removeRosterStudent, resetRosterClaim, resetStudentPassword } from "@/lib/actions/group-actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

type RosterRow = { id: string; classNo: string; nickname: string; claimedByUserId: string | null; password: string | null };

/** 명렬 표 — 입장 상태와 학생별 관리 버튼 */
function RosterTable({ rows }: { rows: RosterRow[] }) {
  return (
    <div className="tablewrap">
      <table className="mt">
        <thead>
          <tr><th style={{ width: 70 }}>반번호</th><th>별명</th><th>상태</th><th style={{ width: 210 }}>관리</th></tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td className="num"><b>{s.classNo}</b></td>
              <td>{s.nickname}</td>
              <td>
                <span className={`pill ${s.claimedByUserId ? "p-done" : "p-ghost"}`}>
                  {s.claimedByUserId ? "입장함" : "대기"}
                </span>
                {s.claimedByUserId && !s.password && (
                  <span className="pill p-wish" style={{ marginLeft: 4 }}>비번 미설정</span>
                )}
              </td>
              <td>
                <span className="fieldrow" style={{ gap: 6 }}>
                  {s.claimedByUserId && s.password && (
                    <form action={resetStudentPassword} style={{ display: "inline" }}>
                      <input type="hidden" name="studentId" value={s.id} />
                      <ConfirmSubmit message={`${s.nickname} 비밀번호 초기화?`} className="btn sm">🔑 비번 초기화</ConfirmSubmit>
                    </form>
                  )}
                  {s.claimedByUserId && (
                    <form action={resetRosterClaim} style={{ display: "inline" }}>
                      <input type="hidden" name="studentId" value={s.id} />
                      <ConfirmSubmit message={`${s.classNo}번 배정 초기화?`} className="btn sm">배정 초기화</ConfirmSubmit>
                    </form>
                  )}
                  <form action={removeRosterStudent} style={{ display: "inline" }}>
                    <input type="hidden" name="studentId" value={s.id} />
                    <ConfirmSubmit message={`${s.classNo}번(${s.nickname}) 삭제?`} className="btn sm dngr">삭제</ConfirmSubmit>
                  </form>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 그룹 관리의 명렬 — 학교 그룹(반번호로 반이 나뉨)이면 반마다 접어 두고, 한 반 그룹이면 지금처럼 표 하나 */
export function RosterList({ roster }: { roster: RosterRow[] }) {
  const layout = detectRoomLayout(roster.map((r) => r.classNo));
  if (!layout) return <RosterTable rows={roster} />;

  const summary = (rows: RosterRow[]) => {
    const entered = rows.filter((s) => s.claimedByUserId).length;
    const noPassword = rows.filter((s) => s.claimedByUserId && !s.password).length;
    return (
      <span className="mini num">
        {rows.length}명 · 입장 {entered}
        {noPassword > 0 && <span className="pill p-wish" style={{ marginLeft: 6 }}>비번 미설정 {noPassword}</span>}
      </span>
    );
  };
  const unmatched = roster.filter((s) => !parseClassNo(s.classNo));
  return (
    <>
      <p className="mini" style={{ margin: "0 0 8px" }}>반을 누르면 명렬이 펼쳐져요.</p>
      {layout.rooms.map((room) => {
        const rows = roster.filter((s) => sameRoom(parseClassNo(s.classNo), room));
        return (
          <details key={roomId(room)} className="roomgroup">
            <summary>
              <b>{roomLabel(room)}</b>
              {summary(rows)}
            </summary>
            <div className="roomgroup-body">
              <RosterTable rows={rows} />
            </div>
          </details>
        );
      })}
      {unmatched.length > 0 && (
        <details className="roomgroup">
          <summary>
            <b>반을 알 수 없는 학생</b>
            {summary(unmatched)}
          </summary>
          <div className="roomgroup-body">
            <RosterTable rows={unmatched} />
          </div>
        </details>
      )}
    </>
  );
}
