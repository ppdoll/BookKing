import { getAffiliateConfig, buildStoreLinks } from "@/lib/affiliate";

/** 서점 구매 링크 줄 — 제휴 ID 설정 시 자동으로 제휴 링크 + 고지 문구 */
export async function StoreLinks({
  title,
  isbn,
  compact = false,
}: {
  title: string;
  isbn?: string | null;
  compact?: boolean;
}) {
  const cfg = await getAffiliateConfig();
  const links = buildStoreLinks({ title, isbn }, cfg);
  const anyAffiliate = links.some((l) => l.affiliate);

  return (
    <div style={{ marginTop: compact ? 4 : 8 }}>
      <span className="fieldrow" style={{ gap: 6 }}>
        {!compact && <span className="mini" style={{ fontWeight: 800 }}>🛒 구매·재고</span>}
        {links.map((l) => (
          <a
            key={l.store}
            href={l.url}
            target="_blank"
            rel="noreferrer nofollow sponsored"
            className="btn sm"
            style={compact ? { fontSize: 11.5, padding: "1px 9px" } : undefined}
          >
            {l.store} ↗
          </a>
        ))}
      </span>
      {anyAffiliate && !compact && (
        <p className="mini" style={{ margin: "6px 0 0", fontSize: 11.5 }}>
          위 링크로 구매 시 운영자가 제휴 수수료를 받을 수 있어요.
          {cfg.coupang &&
            " 이 서비스는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."}
        </p>
      )}
    </div>
  );
}
