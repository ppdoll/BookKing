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

/**
 * 책정보 생성용 단계적 검색 — 네이버는 모든 단어를 AND로 매칭하므로
 * 출판사/저자에 오타가 있으면 0건이 된다. 결과가 없으면 조건을 하나씩
 * 빼면서 재시도하고, 어떤 조건으로 찾았는지 note로 알려준다.
 */
export async function searchNaverBooksSmart(parts: {
  title: string;
  author?: string;
  publisher?: string;
}): Promise<{ items: NaverBook[]; error?: string; note?: string }> {
  const title = parts.title.trim();
  const author = parts.author?.trim() ?? "";
  const publisher = parts.publisher?.trim() ?? "";
  if (!title) return { items: [] };

  const attempts: { query: string; note?: string }[] = [];
  if (author && publisher) {
    attempts.push({ query: `${title} ${author} ${publisher}` });
    attempts.push({
      query: `${title} ${author}`,
      note: `'${publisher}'를 빼고 제목+저자로 검색했어요. 출판사 이름을 확인해보세요.`,
    });
  } else if (author) {
    attempts.push({ query: `${title} ${author}` });
  } else {
    attempts.push({ query: title });
  }
  if (author) {
    attempts.push({
      query: title,
      note: `제목 '${title}'만으로 검색했어요. 저자·출판사 이름을 확인해보세요.`,
    });
  }

  for (const attempt of attempts) {
    const result = await searchNaverBooks(attempt.query);
    if (result.error) return result;
    if (result.items.length > 0) return { items: result.items, note: attempt.note };
  }
  return { items: [] };
}
