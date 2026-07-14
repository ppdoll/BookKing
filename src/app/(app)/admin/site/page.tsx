import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isSiteAdminUser } from "@/lib/slots";
import { fmtDateFull } from "@/lib/format";
import { approveRequest, rejectRequest, createCoupon } from "@/lib/actions/slot-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { CopyButton } from "@/components/CopyButton";

export default async function SiteAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; approved?: string; rejected?: string; created?: string }>;
}) {
  const { error, approved, rejected, created } = await searchParams;
  const user = await requireUser("/admin/site");
  if (!isSiteAdminUser(user)) redirect("/");

  const [pending, resolved, coupons] = await Promise.all([
    prisma.slotRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.slotRequest.findMany({
      where: { status: { not: "PENDING" } },
      include: { user: { select: { name: true } }, coupon: true },
      orderBy: { resolvedAt: "desc" },
      take: 10,
    }),
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { redemptions: true } } },
    }),
  ]);

  return (
    <>
      <div className="page-h">
        <h1>🛠 사이트 관리</h1>
        <span className="mini">최고 운영자 전용 — 이용권 요청 처리 · 쿠폰 발급</span>
      </div>

      {error && <div className="toast err">{error}</div>}
      {approved && <div className="toast">✅ 요청을 승인하고 쿠폰을 발급했어요. 요청자의 이용권 페이지에 표시돼요.</div>}
      {rejected && <div className="toast">요청을 거절 처리했어요.</div>}
      {created && <div className="toast">🎫 쿠폰이 만들어졌어요: <b style={{ fontFamily: "monospace" }}>{created}</b></div>}

      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
          📨 이용권 요청 <span className="mini">대기 {pending.length}건</span>
        </h3>
        {pending.length === 0 ? (
          <p className="mini" style={{ margin: 0 }}>대기 중인 요청이 없어요.</p>
        ) : (
          pending.map((r) => (
            <div key={r.id} style={{ border: "2px solid var(--bd)", borderRadius: 12, padding: 12, marginBottom: 10, background: "var(--sun-soft)" }}>
              <div className="fieldrow" style={{ gap: 8, fontSize: 14 }}>
                <b>{r.user.name}</b>
                <span className="mini">{r.user.email}</span>
                <span className="pill p-wish">{r.requestedSlots}개 요청</span>
                <span className="mini num">{fmtDateFull(r.createdAt)}</span>
              </div>
              {r.message && <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>“{r.message}”</p>}
              <div className="fieldrow" style={{ marginTop: 10, gap: 8, alignItems: "flex-end" }}>
                <form action={approveRequest} className="fieldrow" style={{ gap: 8 }}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <label className="mini" style={{ fontWeight: 700 }}>지급 슬롯</label>
                  <input className="input" type="number" name="slotAmount" defaultValue={r.requestedSlots} min={1} max={50} style={{ width: 70 }} />
                  <input className="input" name="adminNote" placeholder="메모 (선택, 요청자에게 보임)" style={{ width: 220 }} />
                  <SubmitButton className="btn pri" pendingText="발급 중…">✅ 쿠폰 발급·승인</SubmitButton>
                </form>
                <form action={rejectRequest} className="fieldrow" style={{ gap: 8 }}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <input className="input" name="adminNote" placeholder="거절 사유 (요청자에게 보임)" style={{ width: 200 }} />
                  <SubmitButton className="btn dngr" pendingText="처리 중…">거절</SubmitButton>
                </form>
              </div>
            </div>
          ))
        )}
        {resolved.length > 0 && (
          <>
            <p style={{ margin: "14px 0 6px", fontSize: 12.5, fontWeight: 800, color: "var(--sub)" }}>최근 처리 내역</p>
            {resolved.map((r) => (
              <p key={r.id} className="mini" style={{ margin: "3px 0" }}>
                {r.status === "APPROVED" ? "✅" : "❌"} {r.user.name} · {r.requestedSlots}개 요청
                {r.coupon ? ` → ${r.coupon.code} (${r.coupon.slotAmount}개)` : ""} · {fmtDateFull(r.resolvedAt)}
              </p>
            ))}
          </>
        )}
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>🎫 쿠폰 만들기</h3>
        <form action={createCoupon}>
          <div className="fieldrow" style={{ gap: 10 }}>
            <input className="input" name="code" placeholder="코드 (비우면 자동 생성)" style={{ width: 180, textTransform: "uppercase" }} />
            <label className="mini" style={{ fontWeight: 700 }}>슬롯</label>
            <input className="input" type="number" name="slotAmount" defaultValue={1} min={1} max={50} style={{ width: 70 }} />
            <label className="mini" style={{ fontWeight: 700 }}>사용 횟수</label>
            <input className="input" type="number" name="maxUses" defaultValue={1} min={1} max={1000} style={{ width: 70 }} />
            <label className="mini" style={{ fontWeight: 700 }}>유효기간(일)</label>
            <input className="input" type="number" name="expiresDays" placeholder="무제한" min={0} style={{ width: 80 }} />
          </div>
          <div className="fieldrow" style={{ marginTop: 10, gap: 10 }}>
            <input className="input" name="note" placeholder="메모 (예: ○○님 입금 확인)" style={{ flex: 1, minWidth: 200 }} />
            <SubmitButton className="btn pri" pendingText="생성 중…">쿠폰 생성</SubmitButton>
          </div>
        </form>
        <p className="mini" style={{ margin: "8px 0 0" }}>
          💡 현금 결제는 송금을 확인한 뒤 여기서 쿠폰을 만들어 카톡으로 코드를 보내주면 돼요.
        </p>
      </section>

      <section className="card tablewrap">
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>발급된 쿠폰 <span className="mini">최근 {coupons.length}건</span></h3>
        {coupons.length === 0 ? (
          <p className="mini" style={{ margin: 0 }}>아직 발급된 쿠폰이 없어요.</p>
        ) : (
          <table className="mt">
            <thead>
              <tr><th>코드</th><th>슬롯</th><th>사용</th><th>유효기간</th><th>메모</th><th></th></tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td><b style={{ fontFamily: "monospace" }}>{c.code}</b></td>
                  <td className="num">{c.slotAmount}개</td>
                  <td className="num">{c._count.redemptions}/{c.maxUses}</td>
                  <td className="mini num">{c.expiresAt ? `${fmtDateFull(c.expiresAt)}까지` : "무제한"}</td>
                  <td className="mini">{c.note ?? "—"}</td>
                  <td><CopyButton text={c.code} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
