// 카카오 책 검색 API (1차 검색원) — https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide#search-book
// 네이버 책 검색 API가 2026-07-31자로 완전 종료돼(대체 API 미제공) 이 API가 기본 검색원이 됐다.

import type { BookSearchItem } from "@/lib/book-search";

export function kakaoConfigured() {
  return Boolean(process.env.KAKAO_REST_API_KEY);
}

type KakaoDoc = {
  title?: string;
  contents?: string;
  url?: string;
  isbn?: string; // "ISBN10 ISBN13" 형태 (둘 중 하나만 있을 수도 있음)
  datetime?: string; // ISO 8601
  authors?: string[];
  translators?: string[];
  publisher?: string;
  price?: number;
  sale_price?: number;
  thumbnail?: string;
};

/** "8936434128 9788936434120" → 13자리 우선, 없으면 첫 번째 */
function pickIsbn(raw?: string): string | null {
  const parts = (raw ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.find((p) => p.length === 13) ?? parts[0];
}

/** ISO 8601 → YYYYMMDD (검색 결과의 출간연도 표시에 사용) */
function toPubdate(datetime?: string): string {
  if (!datetime) return "";
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export async function searchKakaoBooks(
  query: string,
  display = 10
): Promise<{ items: BookSearchItem[]; error?: string }> {
  if (!query.trim()) return { items: [] };
  if (!kakaoConfigured()) return { items: [], error: "카카오 API 키 없음" };

  const url = new URL("https://dapi.kakao.com/v3/search/book");
  url.searchParams.set("query", query);
  url.searchParams.set("size", String(Math.min(Math.max(display, 1), 50)));

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY!}` },
    next: { revalidate: 300 }, // 같은 검색어 재검색이 잦아 잠깐 캐시
  });

  if (!res.ok) {
    return { items: [], error: `카카오 책 검색 오류 (HTTP ${res.status})` };
  }

  const data = (await res.json()) as { documents?: KakaoDoc[] };

  const items: BookSearchItem[] = (data.documents ?? []).map((d) => ({
    title: (d.title ?? "").trim(),
    author: (d.authors ?? []).join(", "),
    publisher: (d.publisher ?? "").trim(),
    image: d.thumbnail ?? "",
    link: d.url ?? "",
    // 카카오는 정가(price)와 판매가(sale_price)를 함께 준다 — 실제 구매가인 판매가 우선
    price: d.sale_price && d.sale_price > 0 ? d.sale_price : d.price && d.price > 0 ? d.price : null,
    isbn: pickIsbn(d.isbn),
    description: (d.contents ?? "").trim(),
    pubdate: toPubdate(d.datetime),
  }));

  return { items };
}
