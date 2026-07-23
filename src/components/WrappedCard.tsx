import Link from "next/link";
import type { WrappedStats } from "@/lib/wrapped";
import { mbtiLabel } from "@/lib/wrapped";
import { Stars } from "@/components/Stars";

const MONTHS = ["1","2","3","4","5","6","7","8","9","10","11","12"];

/** 컴팩트 결산 (홈의 그룹 결산 섹션용) */
export function WrappedCardCompact({ stats, href }: { stats: WrappedStats; href?: string }) {
  const inner = (
    <div className="card" style={{ padding: "12px 14px" }}>
      <div className="fieldrow" style={{ gap: 8, alignItems: "baseline" }}>
        <b style={{ fontSize: 14 }}>🎉 {stats.name}</b>
        <span className="mini">{stats.year} 결산</span>
        <span style={{ flex: 1 }} />
        <b className="num" style={{ fontSize: 18, color: "var(--accent)" }}>{stats.totalBooks}</b>
        <span className="mini">권</span>
      </div>
      <p className="mini" style={{ margin: "4px 0 0" }}>
        평균 <Stars rating={Math.round(stats.avgStars * 2)} size={11} /> {stats.avgStars}
        {stats.fav && <> · 최애 «{stats.fav.title}»</>}
      </p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/** 전체 결산 카드 (내 결산 / 공개 페이지) */
export function WrappedCard({ stats }: { stats: WrappedStats }) {
  const maxMonth = Math.max(...stats.months, 1);
  const label = mbtiLabel(stats.topMbti);

  return (
    <div
      className="card"
      style={{
        maxWidth: 460, margin: "0 auto", padding: 0, overflow: "hidden",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ background: "var(--accent)", color: "var(--on-accent)", padding: "18px 20px", borderBottom: "2px solid var(--bd)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>📚 BookKing 독서 결산</div>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", marginTop: 2 }}>
          {stats.name}님의 {stats.year}년
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {stats.totalBooks === 0 ? (
          <p className="mini" style={{ margin: 0, textAlign: "center", padding: "20px 0" }}>
            {stats.year}년에 완독한 책이 아직 없어요. 첫 책을 완독하면 결산이 채워져요! 📖
          </p>
        ) : (
          <>
            <div style={{ textAlign: "center", margin: "4px 0 18px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sub)" }}>올해 완독</div>
              <div className="num" style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, color: "var(--accent)" }}>
                {stats.totalBooks}<span style={{ fontSize: 24 }}>권</span>
              </div>
              <div style={{ marginTop: 4 }}>
                평균 별점 <Stars rating={Math.round(stats.avgStars * 2)} size={16} />{" "}
                <b className="num">{stats.avgStars}</b>
              </div>
            </div>

            {stats.fav && (
              <div className="fieldrow" style={{ gap: 12, padding: "12px", background: "var(--sun-soft)", border: "2px solid var(--bd)", borderRadius: 12, marginBottom: 16 }}>
                <span className="cover" style={{ width: 46, height: 66 }}>
                  {stats.fav.thumbnailUrl ? <img src={stats.fav.thumbnailUrl} alt="" /> : <span className="bk">📕</span>}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="mini" style={{ fontWeight: 800 }}>⭐ 올해의 최애 책</div>
                  <b style={{ display: "block", fontSize: 14 }}>{stats.fav.title}</b>
                  {stats.fav.rating !== null && <Stars rating={stats.fav.rating} size={13} />}
                </div>
              </div>
            )}

            <div className="chart" style={{ height: 72 }}>
              {stats.months.map((c, i) => (
                <div key={i} className={`bar ${c === 0 ? "zero" : ""}`} style={{ height: `${c === 0 ? 6 : Math.max(14, (c / maxMonth) * 100)}%` }} />
              ))}
            </div>
            <div className="chart-x">{MONTHS.map((m) => <span key={m}>{m}</span>)}</div>

            {label && (
              <p className="mini" style={{ margin: "14px 0 0", textAlign: "center" }}>
                이런 분께 추천이 많았어요 — <b>{label}</b>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
