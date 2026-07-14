import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentMembership, isOwner } from "@/lib/session";
import { ROLE, ROLE_LABEL, type Role } from "@/lib/constants";
import { fmtDate, fmtDateFull } from "@/lib/format";
import { regenerateInvite, setMemberRole, transferOwnership, updateGroupOptions, removeMember } from "@/lib/actions/group-actions";
import { restoreRecord } from "@/lib/actions/record-actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AdminGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; transferred?: string; options?: string; removed?: string }>;
}) {
  const { created, transferred, options, removed } = await searchParams;
  const user = await requireUser("/admin/group");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role)) redirect("/");

  // 그룹 정보는 getCurrentMembership이 include로 이미 로드함 — 재조회 불필요
  const group = membership.group;
  const [members, deleted] = await Promise.all([
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
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${proto}://${host}/join/${group.inviteCode}`;
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
    </>
  );
}
