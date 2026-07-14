import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentMembership, isAdmin } from "@/lib/session";
import { fmtDateFull } from "@/lib/format";
import { approveJoinRequest, rejectJoinRequest } from "@/lib/actions/group-actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AdminJoinsPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; rejected?: string }>;
}) {
  const { approved, rejected } = await searchParams;
  const user = await requireUser("/admin/joins");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isAdmin(membership.role)) redirect("/");

  const [pending, resolved] = await Promise.all([
    prisma.groupJoinRequest.findMany({
      where: { groupId: membership.groupId, status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.groupJoinRequest.findMany({
      where: { groupId: membership.groupId, status: { not: "PENDING" } },
      include: { user: { select: { name: true } } },
      orderBy: { resolvedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="page-h">
        <h1>🙋 가입 신청</h1>
        <span className="mini">『{membership.group.name}』 · 그룹장·운영자 전용</span>
      </div>

      {approved && <div className="toast">✅ 가입을 승인했어요. 이제 그룹원이에요!</div>}
      {rejected && <div className="toast">가입 신청을 거절했어요.</div>}

      {!membership.group.joinApproval && (
        <div className="toast" style={{ background: "var(--sun-soft)" }}>
          ℹ️ 이 그룹은 현재 <b>가입 승인제가 꺼져 있어요</b> — 누구나 바로 가입돼요.
          그룹장이 👑 그룹 관리 → 그룹 옵션에서 켤 수 있어요.
        </div>
      )}

      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
          대기 중인 신청 <span className="mini">{pending.length}건</span>
        </h3>
        {pending.length === 0 ? (
          <p className="mini" style={{ margin: 0 }}>대기 중인 가입 신청이 없어요.</p>
        ) : (
          pending.map((r) => (
            <div key={r.id} className="fieldrow" style={{ borderBottom: "1.5px dashed var(--soft-line)", padding: "10px 0", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{r.user.name}</b> <span className="mini">{r.user.email}</span>
                <br />
                <span className="mini num">{fmtDateFull(r.createdAt)} 신청</span>
              </div>
              <form action={approveJoinRequest} style={{ display: "inline" }}>
                <input type="hidden" name="requestId" value={r.id} />
                <SubmitButton className="btn sm pri" pendingText="승인 중…">✅ 승인</SubmitButton>
              </form>
              <form action={rejectJoinRequest} style={{ display: "inline" }}>
                <input type="hidden" name="requestId" value={r.id} />
                <SubmitButton className="btn sm dngr" pendingText="처리 중…">거절</SubmitButton>
              </form>
            </div>
          ))
        )}
      </section>

      {resolved.length > 0 && (
        <section className="card">
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>최근 처리 내역</h3>
          {resolved.map((r) => (
            <p key={r.id} className="mini" style={{ margin: "3px 0" }}>
              {r.status === "APPROVED" ? "✅ 승인" : "❌ 거절"} · {r.user.name} · {fmtDateFull(r.resolvedAt)}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
