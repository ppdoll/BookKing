// 네이버 검색 API (책) — https://developers.naver.com/docs/serviceapi/search/book/book.md
// 요구사항의 쇼핑 검색 페이지 크롤링 대신 공식 API 사용

export type NaverBook = {
  title: string;
  author: string;
  publisher: string;
  image: string;
  link: string;
  price: number | null;
  isbn: string | null;
};

export function naverConfigured() {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

const stripTags = (s: string) => s.replace(/<\/?b>/g, "").trim();

export async function searchNaverBooks(
  query: string,
  display = 10
): Promise<{ items: NaverBook[]; error?: string }> {
  if (!query.trim()) return { items: [] };
  if (!naverConfigured()) {
    return {
      items: [],
      error:
        "네이버 API 키가 설정되지 않았어요. .env의 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET을 채워주세요. (developers.naver.com에서 무료 발급)",
    };
  }

  const url = new URL("https://openapi.naver.com/v1/search/book.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(display));

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    },
    // 같은 검색어 재검색이 잦아 잠깐 캐시
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return { items: [], error: `네이버 API 오류 (HTTP ${res.status})` };
  }

  const data = (await res.json()) as {
    items?: Array<Record<string, string>>;
  };

  const items: NaverBook[] = (data.items ?? []).map((it) => ({
    title: stripTags(it.title ?? ""),
    author: stripTags(it.author ?? "").replace(/\^/g, ", "), // 공저자는 ^로 구분됨
    publisher: stripTags(it.publisher ?? ""),
    image: it.image ?? "",
    link: it.link ?? "",
    price: it.discount ? parseInt(it.discount, 10) || null : null,
    isbn: it.isbn?.trim() || null,
  }));

  return { items };
}
