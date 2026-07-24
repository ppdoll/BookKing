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

/** LinkPrice 딥링크 래핑 (merchant: yes24 | kbbook) */
function linkprice(merchant: string, affId: string, targetUrl: string) {
  return `https://click.linkprice.com/click.php?m=${merchant}&a=${encodeURIComponent(affId)}&l=9999&l_cd1=3&l_cd2=0&tu=${encodeURIComponent(targetUrl)}`;
}

/**
 * 예스24 크레마클럽(bookclub.yes24.com) 전자책 구독 — 이 책 제목으로 검색.
 * 주의: 크레마 검색은 ISBN으로는 결과가 안 나오고 **제목 검색만** 동작(2026-07 실측).
 * 제목(한글)은 예스24 제휴 게이트웨이를 통과하면 인코딩이 깨지므로,
 * 제휴 링크 대신 **직링크**로 연결한다(작동 우선). 크레마 구독 커미션은 미확인이라 손실도 사실상 없음.
 */
export function cremaClubLink(book: { title: string }) {
  return {
    store: "예스24 크레마클럽",
    desc: "전자책 구독으로 읽기",
    url: "https://bookclub.yes24.com/BookClub/Search?query=" + encodeURIComponent(book.title),
    affiliate: false,
  };
}

export function buildStoreLinks(
  book: { title: string; isbn?: string | null },
  cfg: AffiliateConfig
): StoreLink[] {
  const q = encodeURIComponent(book.title);
  // 네이버 API의 isbn은 간혹 "10자리 13자리" 두 값 — 마지막(13자리) 사용
  const isbn = book.isbn?.trim().split(/\s+/).pop() || null;
  // 예스24 제휴 게이트웨이가 한글 쿼리를 깨뜨리므로, ISBN(숫자)이 있으면 ISBN으로 검색
  const sq = isbn ? encodeURIComponent(isbn) : q;

  const coupangUrl =
    `https://www.coupang.com/np/search?q=${q}` + (cfg.coupang ? `&lptag=${encodeURIComponent(cfg.coupang)}` : "");

  const yes24Plain = `https://www.yes24.com/product/search?domain=BOOK&query=${sq}`;
  const kyoboPlain = `https://search.kyobobook.co.kr/search?keyword=${sq}&gbCode=TOT&target=total`;

  return [
    { store: "쿠팡", url: coupangUrl, affiliate: Boolean(cfg.coupang) },
    {
      // ISBN이 없는 책(직접 입력)은 게이트웨이에서 한글이 깨져 제휴를 포기하고 직링크
      store: "예스24",
      url: cfg.linkprice && isbn ? linkprice("yes24", cfg.linkprice, yes24Plain) : yes24Plain,
      affiliate: Boolean(cfg.linkprice && isbn),
    },
    {
      store: "교보문고",
      url: cfg.linkprice ? linkprice("kbbook", cfg.linkprice, kyoboPlain) : kyoboPlain,
      affiliate: Boolean(cfg.linkprice),
    },
  ];
}
