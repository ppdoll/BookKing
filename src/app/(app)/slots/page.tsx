import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSlotStatus } from "@/lib/slots";
import { fmtDateFull } from "@/lib/format";
import { redeemCoupon, requestSlots } from "@/lib/actions/slot-actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redeemed?: string; requested?: string }>;
}) {
  const { error, redeemed, requested } = await searchParams;
  const user = await requireUser("/slots");

  const [slots, requests] = await Promise.all([
    getSlotStatus(user.id),
    prisma.slotRequest.findMany({
      where: { userId: user.id },
      include: {
        coupon: { include: { redemptions: { where: { userId: user.id } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const hasPending = requests.some((r) => r.status === "PENDING");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="page-h">
        <h1>🎟️ 그룹 이용권</h1>
        <span className="mini">그룹을 만들 때 이용권 1개가 사용돼요</span>
      </div>

      {error && <div className="toast err">{error}</div>}
      {redeemed && <div className="toast">🎉 쿠폰 사용 완료! 이용권 {redeemed}개가 지급됐어요.</div>}
      {requested && <div className="toast">📨 요청이 접수됐어요. 운영자가 확인하면 알려드릴게요 (이 페이지에서 확인).</div>}

      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>보유 현황</h3>
        <div className="fieldrow" style={{ gap: 16, fontSize: 14 }}>
          <span>전체 <b className="num" style={{ fontSize: 20 }}>{slots.total}</b>개</span>
          <span className="mini">=</span>
          <span className="mini">기본 1개 + 지급 {slots.total - 1}개</span>
          <span style={{ flex: 1 }} />
          <span>사용 <b className="num">{slots.used}</b></span>
          <span className={`pill ${slots.available > 0 ? "p-read" : "p-ghost"}`} style={{ padding: "3px 13px" }}>
            남음 {slots.available}개
          </span>
        </div>
        {slots.available > 0 && (
          <p className="mini" style={{ margin: "10px 0 0" }}>
            <Link href="/groups/new" style={{ textDecoration: "underline", fontWeight: 700 }}>🌱 새 그룹 만들러 가기</Link>
          </p>
        )}
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>🎫 쿠폰 사용</h3>
        <p className="mini" style={{ margin: "0 0 10px" }}>받은 쿠폰 코드를 입력하면 이용권이 바로 지급돼요.</p>
        <form action={redeemCoupon} className="fieldrow">
          <input
            className="input"
            name="code"
            placeholder="예) BOOK-AB12CD"
            style={{ flex: 1, minWidth: 180, textTransform: "uppercase" }}
            required
          />
          <SubmitButton className="btn pri" pendingText="확인 중…">사용하기</SubmitButton>
        </form>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>📨 이용권 요청</h3>
        {hasPending ? (
          <p className="mini" style={{ margin: 0 }}>
            ⏳ 처리 대기 중인 요청이 있어요. 운영자가 확인하면 아래 내역에서 결과를 볼 수 있어요.
          </p>
        ) : (
          <>
            <p className="mini" style={{ margin: "0 0 10px" }}>
              그룹을 더 만들고 싶으면 운영자에게 이용권을 요청해보세요.
            </p>
            <form action={requestSlots}>
              <div className="fieldrow">
                <label style={{ fontSize: 13, fontWeight: 700 }}>필요한 개수</label>
                <select className="input" name="requestedSlots" defaultValue="1" style={{ width: "auto" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}개</option>
                  ))}
                </select>
              </div>
              <textarea
                className="input"
                name="message"
                placeholder="어떤 그룹을 만들고 싶은지 간단히 적어주세요 (선택)"
                maxLength={500}
                style={{ marginTop: 10, minHeight: 60 }}
              />
              <div style={{ marginTop: 10 }}>
                <SubmitButton className="btn pri" pendingText="접수 중…">요청 보내기 📨</SubmitButton>
              </div>
            </form>
          </>
        )}
      </section>

      {requests.length > 0 && (
        <section className="card">
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>내 요청 내역</h3>
          {requests.map((r) => {
            const couponUsed = Boolean(r.coupon && r.coupon.redemptions.length > 0);
            return (
              <div key={r.id} style={{ borderBottom: "1.5px dashed var(--soft-line)", padding: "10px 0", fontSize: 13.5 }}>
                <div className="fieldrow" style={{ gap: 8 }}>
                  <span className={`pill ${r.status === "APPROVED" ? "p-read" : r.status === "REJECTED" ? "p-ghost" : "p-wish"}`}>
                    {r.status === "APPROVED" ? "✅ 승인됨" : r.status === "REJECTED" ? "거절됨" : "⏳ 대기 중"}
                  </span>
                  <b>{r.requestedSlots}개 요청</b>
                  <span className="mini num">{fmtDateFull(r.createdAt)}</span>
                </div>
                {r.message && <p className="mini" style={{ margin: "5px 0 0" }}>“{r.message}”</p>}
                {r.adminNote && <p className="mini" style={{ margin: "5px 0 0" }}>💬 운영자: {r.adminNote}</p>}
                {r.status === "APPROVED" && r.coupon && (
                  <div className="fieldrow" style={{ marginTop: 8, gap: 8 }}>
                    <span className="pill p-wish" style={{ fontFamily: "monospace", fontSize: 13 }}>{r.coupon.code}</span>
                    <span className="mini">이용권 {r.coupon.slotAmount}개</span>
                    {couponUsed ? (
                      <span className="mini">✅ 사용 완료</span>
                    ) : (
                      <form action={redeemCoupon} style={{ display: "inline" }}>
                        <input type="hidden" name="code" value={r.coupon.code} />
                        <SubmitButton className="btn sm pri" pendingText="지급 중…">바로 사용하기</SubmitButton>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
