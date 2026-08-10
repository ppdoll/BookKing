// 책 검색 — 1차 카카오, 2차 구글 북스(폴백)
//
// 네이버 책 검색 API는 2026-07-31자로 서비스가 완전히 종료됐다.
// (개발자센터 공지 32530 — '쇼핑·책·전문자료' 검색 API는 NAVER API HUB 이관 대상에서 제외,
//  유예 기간 없이 종료되며 기존 발급 키도 호출 불가, 대체 API 미제공)
// 따라서 네이버 호출은 제거하고 카카오를 1차, 구글 북스를 2차 검색원으로 쓴다.

import { kakaoConfigured, searchKakaoBooks } from "@/lib/kakao-books";
import { searchGoogleBooks } from "@/lib/google-books";

export type BookSearchItem = {
  title: string;
  author: string;
  publisher: string;
  image: string;
  link: string;
  price: number | null;
  isbn: string | null;
  description: string;
  pubdate: string; // YYYYMMDD
};

export type BookSearchResult = {
  items: BookSearchItem[];
  error?: string;
  source?: "kakao" | "google";
};

/** 1차 카카오 → 실패하면 2차 구글 북스 */
export async function searchBooks(query: string, display = 10): Promise<BookSearchResult> {
  if (!query.trim()) return { items: [] };

  const errors: string[] = [];

  // ── 1차: 카카오 ─────────────────────────────
  if (kakaoConfigured()) {
    try {
      const r = await searchKakaoBooks(query, display);
      if (!r.error) return { items: r.items, source: "kakao" };
      errors.push(r.error);
    } catch {
      errors.push("카카오 책 검색에 연결하지 못했어요.");
    }
  }

  // ── 2차: 구글 북스 ──────────────────────────
  try {
    const r = await searchGoogleBooks(query, display);
    if (!r.error) return { items: r.items, source: "google" };
    errors.push(r.error);
  } catch {
    errors.push("구글 북스에 연결하지 못했어요.");
  }

  // ── 둘 다 실패 ──────────────────────────────
  if (!kakaoConfigured()) {
    return {
      items: [],
      error:
        "책 검색 키가 설정되지 않았어요. KAKAO_REST_API_KEY(developers.kakao.com, 무료)를 채워주세요. " +
        `키 없이도 책 정보를 직접 입력해 등록할 수 있어요. (${errors.join(" / ")})`,
    };
  }
  return {
    items: [],
    error: `책 검색에 실패했어요. 잠시 후 다시 시도해주세요. (${errors.join(" / ")}) 책 정보를 직접 입력해 등록할 수도 있어요.`,
  };
}

/**
 * 책정보 생성용 단계적 검색 — 검색엔진이 모든 단어를 AND로 매칭하므로
 * 출판사/저자에 오타가 있으면 0건이 된다. 결과가 없으면 조건을 하나씩
 * 빼면서 재시도하고, 어떤 조건으로 찾았는지 note로 알려준다.
 */
export async function searchBooksSmart(parts: {
  title: string;
  author?: string;
  publisher?: string;
}): Promise<{ items: BookSearchItem[]; error?: string; note?: string; source?: "kakao" | "google" }> {
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
    const result = await searchBooks(attempt.query);
    if (result.error) return result;
    if (result.items.length > 0) {
      return { items: result.items, note: attempt.note, source: result.source };
    }
  }
  return { items: [] };
}
