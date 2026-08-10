// 구글 북스 API (2차 검색원) — https://developers.google.com/books/docs/v1/using
// 카카오가 장애·쿼터 초과일 때 폴백. API 키는 선택이지만, 키 없이 호출하면
// 공용 익명 쿼터를 써서 429가 자주 나므로 GOOGLE_BOOKS_API_KEY 설정을 권장한다.

import type { BookSearchItem } from "@/lib/book-search";

type GoogleVolume = {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string; // "2014-05-19" | "2014-05" | "2014"
    description?: string;
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
  saleInfo?: {
    listPrice?: { amount?: number };
    retailPrice?: { amount?: number };
  };
};

/** ISBN_13 우선, 없으면 ISBN_10 */
function pickIsbn(ids?: Array<{ type?: string; identifier?: string }>): string | null {
  if (!ids?.length) return null;
  return (
    ids.find((i) => i.type === "ISBN_13")?.identifier ??
    ids.find((i) => i.type === "ISBN_10")?.identifier ??
    null
  );
}

/**
 * "2014-05-19" → "20140519", "2014" → "20140000"
 * 화면에서는 앞 4자리(연도)만 쓰므로, 일(日)이 없으면 0으로 채워 길이만 맞춘다.
 */
function toPubdate(published?: string): string {
  const digits = (published ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.padEnd(8, "0").slice(0, 8);
}

export async function searchGoogleBooks(
  query: string,
  display = 10
): Promise<{ items: BookSearchItem[]; error?: string }> {
  if (!query.trim()) return { items: [] };

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(Math.min(Math.max(display, 1), 40)));
  url.searchParams.set("country", "KR");
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) {
    // 키 없이 호출하면 공용 쿼터 초과로 429가 잦다
    const hint = res.status === 429 && !process.env.GOOGLE_BOOKS_API_KEY ? " (GOOGLE_BOOKS_API_KEY를 설정하면 안정적이에요)" : "";
    return { items: [], error: `구글 북스 오류 (HTTP ${res.status})${hint}` };
  }

  const data = (await res.json()) as { items?: GoogleVolume[] };

  const items: BookSearchItem[] = (data.items ?? []).map((v) => {
    const info = v.volumeInfo ?? {};
    const title = [info.title, info.subtitle].filter(Boolean).join(" - ");
    // 구글 표지 URL은 http로 오는 경우가 있어 https로 맞춘다 (혼합 콘텐츠 차단 방지)
    const image = (info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? "").replace(/^http:/, "https:");
    const amount = v.saleInfo?.retailPrice?.amount ?? v.saleInfo?.listPrice?.amount;

    return {
      title: title.trim(),
      author: (info.authors ?? []).join(", "),
      publisher: (info.publisher ?? "").trim(),
      image,
      link: info.canonicalVolumeLink ?? info.infoLink ?? "",
      price: typeof amount === "number" && amount > 0 ? Math.round(amount) : null,
      isbn: pickIsbn(info.industryIdentifiers),
      description: (info.description ?? "").trim(),
      pubdate: toPubdate(info.publishedDate),
    };
  });

  return { items };
}
