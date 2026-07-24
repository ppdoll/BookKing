import { getAffiliateConfig, buildStoreLinks, cremaClubLink } from "@/lib/affiliate";

/** 서점 구매 링크 + 크레마클럽 구독 링크 — 제휴 ID 설정 시 자동으로 제휴 링크 + 고지 문구 */
export async function StoreLinks({
  title,
  isbn,
  compact = false,
  subscription = false,
}: {
  title: string;
  isbn?: string | null;
  compact?: boolean;
  /** 전자책 구독(크레마클럽) 링크 표시 */
  subscription?: boolean;
}) {
  const cfg = await getAffiliateConfig();
  const links = buildStoreLinks({ title, isbn }, cfg);
  const crema = subscription ? cremaClubLink({ title, isbn }, cfg) : null;
  const anyAffiliate = links.some((l) => l.affiliate) || Boolean(crema?.affiliate);
  const btnStyle = compact ? { fontSize: 11.5, padding: "1px 9px" } : undefined;

  return (
    <div style={{ marginTop: compact ? 4 : 8 }}>
      <span className="fieldrow" style={{ gap: 6 }}>
        {!compact && <span className="mini" style={{ fontWeight: 800 }}>🛒 구매·재고</span>}
        {links.map((l) => (
          <a key={l.store} href={l.url} target="_blank" rel="noreferrer nofollow sponsored" className="btn sm" style={btnStyle}>
            {l.store} ↗
          </a>
        ))}
        {crema && (
          <a
            href={crema.url}
            target="_blank"
            rel="noreferrer nofollow sponsored"
            className="btn sm"
            style={{ ...btnStyle, background: "var(--mint-soft)" }}
            title="예스24 크레마클럽 전자책 구독에서 이 책 찾기"
          >
            📱 크레마클럽 ↗
          </a>
        )}
      </span>
      {anyAffiliate && !compact && (
        <p className="mini" style={{ margin: "6px 0 0", fontSize: 11.5 }}>
          위 링크로 구매·구독 시 운영자가 제휴 수수료를 받을 수 있어요.
          {cfg.coupang &&
            " 이 서비스는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."}
        </p>
      )}
    </div>
  );
}
