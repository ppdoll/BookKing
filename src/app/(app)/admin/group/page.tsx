import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentMembership, isOwner } from "@/lib/session";
import { ROLE, ROLE_LABEL, type Role } from "@/lib/constants";
import { fmtDate, fmtDateFull } from "@/lib/format";
import { regenerateInvite, setMemberRole, transferOwnership, updateGroupOptions, removeMember, setJoinPassword, addRosterStudents, removeRosterStudent, resetRosterClaim, setGroupExpiry } from "@/lib/actions/group-actions";
import { daysUntilExpiry } from "@/lib/group-expiry";
import { restoreRecord } from "@/lib/actions/record-actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AdminGroupPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string; transferred?: string; options?: string; removed?: string;
    pw?: string; pwerr?: string; roster?: string; rosterdel?: string; rosterreset?: string;
    expon?: string; expoff?: string; experr?: string;
  }>;
}) {
  const { created, transferred, options, removed, pw, pwerr, roster: rosterOk, rosterdel, rosterreset, expon, expoff, experr } = await searchParams;
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");
  if (membership.group.isPersonal) redirect("/"); // 개인 책장은 관리 항목이 없음

  // 그룹 정보는 getCurrentMembership이 include로 이미 로드함 — 재조회 불필요
  const group = membership.group;
  const [members, deleted, roster] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId: membership.groupId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.readingRecord.findMany({
      where: { groupId: membership.groupId, deletedAt: { not: null } },
      include: { book: true, user: { select: { name: true } } },
      orderBy: { deletedAt: "desc" },
      take: 20,
    }),
    prisma.classroomStudent.findMany({
      where: { groupId: membership.groupId },
      orderBy: { classNo: "asc" },
    }),
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${proto}://${host}/join/${group.inviteCode}`;
  const classUrl = `${proto}://${host}/class/${group.inviteCode}`;
  const expiryDays = daysUntilExpiry(group);
  // <input type="date">가 요구하는 YYYY-MM-DD (로컬 기준)
  const toDateInput = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const inviteExpired = group.inviteExpiresAt < new Date();
  const daysLeft = Math.ceil((group.inviteExpiresAt.getTime() - Date.now()) / 86400000);

  return (
    <>
      <div className="page-h">
        <h1>👑 운영자 · 그룹 관리</h1>
        <span className="mini">『{group.name}』 · 그룹장 전용</span>
      </div>
      {created && <div className="toast">🎉 그룹이 만들어졌어요! 아래 초대 링크를 공유해보세요.</div>}
      {transferred && <div className="toast">👑 그룹장이 위임됐어요. 이제 운영자 권한으로 활동해요.</div>}
      {options && <div className="toast">⚙️ 그룹 옵션이 저장됐어요.</div>}
      {removed && <div className="toast">그룹원을 내보냈어요.</div>}
      {pw && <div className="toast">🔑 학생 입장 비밀번호가 저장됐어요.</div>}
      {pwerr && <div className="toast err">비밀번호는 4자 이상으로 설정해주세요.</div>}
      {rosterOk && <div className="toast">🧑‍🎓 명렬이 추가됐어요. (이미 있는 반번호는 건너뜀)</div>}
      {rosterdel && <div className="toast">명렬에서 삭제했어요.</div>}
      {rosterreset && <div className="toast">배정을 초기화했어요. 해당 반번호로 다시 입장할 수 있어요.</div>}
      {expon && <div className="toast">🗓 만료일이 설정됐어요. 그 날이 지나면 기록이 모두 삭제돼요.</div>}
      {expoff && <div className="toast">만료일을 해제했어요. 그룹이 계속 유지돼요.</div>}
      {experr === "format" && <div className="toast err">날짜 형식이 올바르지 않아요.</div>}
      {experr === "past" && <div className="toast err">오늘보다 뒤의 날짜를 선택해주세요.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        <section className="card tablewrap">
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
            👥 그룹원 관리 <span className="mini">{members.length}명</span>
          </h3>
          <table className="mt">
            <thead>
              <tr><th>이름</th><th>역할</th><th>가입일</th><th style={{ width: 210 }}>관리</th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.user.name}</b>{m.userId === user.id ? " (나)" : ""}</td>
                  <td>
                    <span className={`pill ${m.role === ROLE.OWNER ? "p-done" : m.role === ROLE.ADMIN ? "p-read" : "p-ghost"}`}>
                      {m.role === ROLE.OWNER ? "👑 " : ""}
                      {ROLE_LABEL[m.role as Role]}
                    </span>
                  </td>
                  <td className="mini num">{fmtDate(m.joinedAt)}</td>
                  <td>
                    {m.role === ROLE.OWNER ? (
                      <span className="mini">—</span>
                    ) : (
                      <span className="fieldrow" style={{ gap: 6 }}>
                        <form action={setMemberRole} style={{ display: "inline" }}>
                          <input type="hidden" name="memberId" value={m.id} />
                          <input type="hidden" name="role" value={m.role === ROLE.ADMIN ? ROLE.MEMBER : ROLE.ADMIN} />
                          <button type="submit" className={`btn sm ${m.role === ROLE.ADMIN ? "" : "pri"}`}>
                            {m.role === ROLE.ADMIN ? "운영자 해제" : "운영자 지정"}
                          </button>
                        </form>
                        <form action={transferOwnership} style={{ display: "inline" }}>
                          <input type="hidden" name="memberId" value={m.id} />
                          <ConfirmSubmit
                            message={`${m.user.name}님에게 위임? (나는 운영자로 전환)`}
                            className="btn sm"
                          >
                            👑 위임
                          </ConfirmSubmit>
                        </form>
                        <form action={removeMember} style={{ display: "inline" }}>
                          <input type="hidden" name="memberId" value={m.id} />
                          <ConfirmSubmit
                            message={`${m.user.name}님을 내보낼까요? (기록은 남아요)`}
                            className="btn sm dngr"
                          >
                            내보내기
                          </ConfirmSubmit>
                        </form>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div style={{ display: "grid", gap: 16 }}>
          <section className="card">
            <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>⚙️ 그룹 옵션</h3>
            <form action={updateGroupOptions}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, cursor: "pointer" }}>
                <input type="checkbox" name="searchable" defaultChecked={group.searchable} style={{ marginTop: 3, width: 16, height: 16 }} />
                <span>
                  <b>🔍 외부 검색 허용</b>
                  <br />
                  <span className="mini">그룹 찾기에 노출되고, 누구나 바로 가입할 수 있어요. (기록 내용은 가입 후에만 보여요)</span>
                </span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, cursor: "pointer", marginTop: 10 }}>
                <input type="checkbox" name="readOnly" defaultChecked={group.readOnly} style={{ marginTop: 3, width: 16, height: 16 }} />
                <span>
                  <b>👀 보기 전용 (그룹장·운영자만 기록)</b>
                  <br />
                  <span className="mini">일반 그룹원은 기록을 보기만 해요. 추천 도서 공지용 그룹에 좋아요.</span>
                </span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, cursor: "pointer", marginTop: 10 }}>
                <input type="checkbox" name="joinApproval" defaultChecked={group.joinApproval} style={{ marginTop: 3, width: 16, height: 16 }} />
                <span>
                  <b>🙋 가입 승인제</b>
                  <br />
                  <span className="mini">초대 링크·검색 어느 쪽이든 그룹장·운영자가 승인해야 가입돼요.</span>
                </span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, cursor: "pointer", marginTop: 10, borderTop: "2px dashed var(--soft-line)", paddingTop: 10 }}>
                <input type="checkbox" name="classroomMode" defaultChecked={group.classroomMode} style={{ marginTop: 3, width: 16, height: 16 }} />
                <span>
                  <b>🏫 학교(교실) 모드</b>
                  <br />
                  <span className="mini">학생이 구글 없이 <b>반번호+비밀번호</b>로 입장해요. 상업(구매·구독) 링크와 결산 공개 공유가 숨겨지고, 외부 검색 노출은 자동으로 꺼져요. (아래에서 비밀번호·명렬을 설정)</span>
                </span>
              </label>
              <div style={{ marginTop: 12 }}>
                <SubmitButton className="btn sm pri" pendingText="저장 중…">옵션 저장</SubmitButton>
              </div>
            </form>
          </section>

          <section className="card">
            <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>🔗 초대 링크</h3>
            <input className="input" readOnly value={inviteUrl} aria-label="초대 링크" />
            <p className="mini" style={{ margin: "8px 0 10px" }}>
              {inviteExpired ? (
                <span style={{ color: "var(--danger)", fontWeight: 700 }}>⏰ 만료됐어요 — 새 링크를 발급해주세요</span>
              ) : (
                <>{fmtDateFull(group.inviteExpiresAt)}까지 유효 ({daysLeft}일 남음)</>
              )}
            </p>
            <span className="fieldrow" style={{ gap: 8 }}>
              <form action={regenerateInvite} style={{ display: "inline" }}>
                <ConfirmSubmit message="기존 링크는 무효화돼요." className="btn sm pri">
                  새 링크 발급
                </ConfirmSubmit>
              </form>
              <CopyButton text={inviteUrl} />
            </span>
          </section>

          <section className="card">
            <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>🗓 만료일 (자동 삭제)</h3>
            <p className="mini" style={{ margin: "0 0 10px" }}>
              설정한 날짜가 지나면 <b>이 그룹과 모든 독서 기록</b>이 영구 삭제돼요.
              {group.classroomMode && " 학생 계정도 함께 지워져요."} 되돌릴 수 없으니 신중히 정해주세요.
            </p>
            {group.expiresAt ? (
              <p className="mini" style={{ margin: "0 0 10px", fontWeight: 700, color: "var(--danger)" }}>
                ⏳ {fmtDateFull(group.expiresAt)}에 삭제 예정
                {expiryDays !== null && ` (${expiryDays}일 남음)`}
              </p>
            ) : (
              <p className="mini" style={{ margin: "0 0 10px" }}>현재 만료일 없음 — 그룹이 계속 유지돼요.</p>
            )}
            <form action={setGroupExpiry}>
              <div className="fieldrow" style={{ gap: 6 }}>
                <input
                  className="input"
                  type="date"
                  name="expiresAt"
                  defaultValue={group.expiresAt ? toDateInput(group.expiresAt) : ""}
                  min={toDateInput(new Date(Date.now() + 86400000))}
                  style={{ flex: 1 }}
                  aria-label="만료일"
                />
                <SubmitButton className="btn sm dngr" pendingText="저장…">만료일 저장</SubmitButton>
              </div>
            </form>
            {group.expiresAt && (
              <form action={setGroupExpiry} style={{ marginTop: 8 }}>
                <input type="hidden" name="expiresAt" value="" />
                <SubmitButton className="btn sm" pendingText="해제…">만료일 해제</SubmitButton>
              </form>
            )}
          </section>

          <section className="card">
            <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
              🗑 삭제된 글 <span className="mini">{deleted.length}건</span>
            </h3>
            {deleted.length === 0 ? (
              <p className="mini" style={{ margin: 0 }}>삭제된 글이 없어요.</p>
            ) : (
              deleted.map((r) => (
                <div key={r.id} style={{ fontSize: 13, borderBottom: "1.5px dashed var(--soft-line)", padding: "8px 0" }}>
                  <del>{r.book.title}</del> · {r.user.name}
                  <br />
                  <span className="mini num">{fmtDate(r.deletedAt)} 삭제됨</span>{" "}
                  <form action={restoreRecord} style={{ display: "inline" }}>
                    <input type="hidden" name="recordId" value={r.id} />
                    <button type="submit" className="btn sm" style={{ marginLeft: 6 }}>복구</button>
                  </form>
                </div>
              ))
            )}
          </section>
        </div>
      </div>

      {group.classroomMode && (
        <section className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>🏫 학교(교실) 모드 — 학생 입장 관리</h3>
          <p className="mini" style={{ margin: "0 0 14px" }}>
            학생은 구글 로그인 없이 <b>반번호 + 비밀번호</b>로 입장해요. 개인정보 보호를 위해 명렬에는 <b>실명 대신 별명</b>을 등록하세요. 비밀번호는 수업 때 구두로 알려주세요.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            {/* 입장 링크 + 비밀번호 */}
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label className="mini" style={{ fontWeight: 800 }}>🔗 학생 입장 링크</label>
                <input className="input" readOnly value={classUrl} aria-label="학생 입장 링크" style={{ marginTop: 4 }} />
                <div style={{ marginTop: 8 }}><CopyButton text={classUrl} /></div>
              </div>

              <form action={setJoinPassword}>
                <label className="mini" style={{ fontWeight: 800 }}>🔑 입장 비밀번호</label>
                <p className="mini" style={{ margin: "2px 0 6px" }}>
                  {group.joinPassword
                    ? "✅ 설정돼 있어요. 바꾸려면 새 비밀번호를 입력하세요."
                    : "⚠️ 아직 비밀번호가 없어요 — 설정해야 학생이 입장할 수 있어요."}
                </p>
                <div className="fieldrow" style={{ gap: 6 }}>
                  <input className="input" name="password" type="text" placeholder="4자 이상" minLength={4} required style={{ flex: 1 }} />
                  <SubmitButton className="btn sm pri" pendingText="저장…">비밀번호 설정</SubmitButton>
                </div>
              </form>

              <form action={addRosterStudents}>
                <label className="mini" style={{ fontWeight: 800 }}>🧑‍🎓 명렬 추가</label>
                <p className="mini" style={{ margin: "2px 0 6px" }}>한 줄에 한 명씩 <b>반번호, 별명</b> — 예) <code>1, 책읽는사자</code></p>
                <textarea
                  className="input"
                  name="roster"
                  rows={5}
                  placeholder={"1, 책읽는사자\n2, 밤샘독서가\n3, 책벌레"}
                  style={{ width: "100%", resize: "vertical", fontSize: 13 }}
                />
                <div style={{ marginTop: 8 }}>
                  <SubmitButton className="btn sm pri" pendingText="추가 중…">명렬 추가</SubmitButton>
                </div>
              </form>
            </div>

            {/* 명렬 표 */}
            <div className="tablewrap">
              <p className="mini" style={{ fontWeight: 800, margin: "0 0 8px" }}>
                등록된 명렬 <span className="mini">{roster.length}명 · 입장 {roster.filter((r) => r.claimedByUserId).length}명</span>
              </p>
              {roster.length === 0 ? (
                <p className="mini" style={{ margin: 0 }}>아직 등록된 명렬이 없어요. 왼쪽에서 추가해주세요.</p>
              ) : (
                <table className="mt">
                  <thead>
                    <tr><th style={{ width: 70 }}>반번호</th><th>별명</th><th>상태</th><th style={{ width: 150 }}>관리</th></tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.id}>
                        <td className="num"><b>{s.classNo}</b></td>
                        <td>{s.nickname}</td>
                        <td>
                          <span className={`pill ${s.claimedByUserId ? "p-done" : "p-ghost"}`}>
                            {s.claimedByUserId ? "입장함" : "대기"}
                          </span>
                        </td>
                        <td>
                          <span className="fieldrow" style={{ gap: 6 }}>
                            {s.claimedByUserId && (
                              <form action={resetRosterClaim} style={{ display: "inline" }}>
                                <input type="hidden" name="studentId" value={s.id} />
                                <ConfirmSubmit message={`${s.classNo}번 배정 초기화?`} className="btn sm">초기화</ConfirmSubmit>
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
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
