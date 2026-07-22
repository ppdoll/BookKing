import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * 서점 구매 링크 빌더 — 제휴 ID가 설정돼 있으면 제휴 링크로,
 * 없으면 일반 검색/상품 링크로 동작한다 (버튼은 항상 유효).
 *
 * - 쿠팡: 쿠팡 파트너스 lptag 파라미터
 * - 예스24(m=yes24)·교보문고(m=kbbook): 링크프라이스(LinkPrice) 딥링크 경유
 */

export const AFF_KEYS = {
  coupang: "aff_coupang", // 쿠팡 파트너스 트래킹 ID (예: AF1234567)
  linkprice: "aff_linkprice", // 링크프라이스 어필리에이트 ID (예스24·교보)
} as const;

export type AffiliateConfig = { coupang: string; linkprice: string };

/** 제휴 설정 로드 (요청 내 캐시) */
export const getAffiliateConfig = cache(async (): Promise<AffiliateConfig> => {
  const rows = await prisma.siteConfig.findMany({
    where: { key: { in: Object.values(AFF_KEYS) } },
  });
  const get = (k: string) => rows.find((r) => r.key === k)?.value.trim() ?? "";
  return {
    coupang: get(AFF_KEYS.coupang),
    linkprice: get(AFF_KEYS.linkprice),
  };
});

export type StoreLink = { store: string; url: string; affiliate: boolean };

/** LinkPrice 딥링크 래핑 (merchant: yes24 | kyobobook) */
function linkprice(merchant: string, affId: string, targetUrl: string) {
  return `https://click.linkprice.com/click.php?m=${merchant}&a=${encodeURIComponent(affId)}&l=9999&l_cd1=3&l_cd2=0&tu=${encodeURIComponent(targetUrl)}`;
}

export function buildStoreLinks(
  book: { title: string; isbn?: string | null },
  cfg: AffiliateConfig
): StoreLink[] {
  const q = encodeURIComponent(book.title);

  const coupangUrl =
    `https://www.coupang.com/np/search?q=${q}` + (cfg.coupang ? `&lptag=${encodeURIComponent(cfg.coupang)}` : "");

  const yes24Plain = `https://www.yes24.com/product/search?domain=BOOK&query=${q}`;
  const kyoboPlain = `https://search.kyobobook.co.kr/search?keyword=${q}&gbCode=TOT&target=total`;

  return [
    { store: "쿠팡", url: coupangUrl, affiliate: Boolean(cfg.coupang) },
    {
      store: "예스24",
      url: cfg.linkprice ? linkprice("yes24", cfg.linkprice, yes24Plain) : yes24Plain,
      affiliate: Boolean(cfg.linkprice),
    },
    {
      store: "교보문고",
      url: cfg.linkprice ? linkprice("kbbook", cfg.linkprice, kyoboPlain) : kyoboPlain,
      affiliate: Boolean(cfg.linkprice),
    },
  ];
}
