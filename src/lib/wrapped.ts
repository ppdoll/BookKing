import { cache } from "react";
import { prisma } from "@/lib/db";
import { STATUS, ratingToStars, MBTI_ALL } from "@/lib/constants";

export type WrappedBook = {
  title: string;
  author: string;
  publisher: string | null;
  thumbnailUrl: string | null;
  isbn: string | null;
  rating: number | null;
};

export type WrappedStats = {
  name: string;
  year: number;
  totalBooks: number;
  avgStars: number; // 0~5, 소수 1자리
  fav: { title: string; thumbnailUrl: string | null; rating: number | null } | null;
  months: number[]; // 길이 12
  topMbti: string | null;
  books: WrappedBook[]; // 올해 읽은 책 (별점 높은 순)
};

/**
 * 유저의 연간 독서 결산 통계 (실시간 계산).
 * 여러 그룹에 중복 등록된 책은 bookId로 합쳐 한 권으로 계산한다.
 */
export const getWrappedStats = cache(
  async (userId: string, year: number): Promise<WrappedStats> => {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const [user, records] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.readingRecord.findMany({
        where: {
          userId,
          status: STATUS.DONE,
          deletedAt: null,
          endDate: { gte: start, lt: end },
        },
        select: {
          bookId: true,
          rating: true,
          endDate: true,
          recommendMbti: true,
          book: { select: { title: true, author: true, publisher: true, thumbnailUrl: true, isbn: true } },
        },
      }),
    ]);

    // bookId로 중복 제거 (별점 높은 기록 우선)
    const byBook = new Map<string, (typeof records)[number]>();
    for (const r of records) {
      const cur = byBook.get(r.bookId);
      if (!cur || (r.rating ?? -1) > (cur.rating ?? -1)) byBook.set(r.bookId, r);
    }
    const uniq = [...byBook.values()];

    const rated = uniq.filter((r) => r.rating !== null);
    const avg = rated.length
      ? rated.reduce((a, r) => a + (r.rating as number), 0) / rated.length
      : 0;

    const months = Array(12).fill(0) as number[];
    for (const r of uniq) if (r.endDate) months[r.endDate.getMonth()]++;

    const sorted = [...uniq].sort(
      (a, b) =>
        (b.rating ?? -1) - (a.rating ?? -1) ||
        (b.endDate?.getTime() ?? 0) - (a.endDate?.getTime() ?? 0)
    );
    const favRec = sorted[0];
    const fav = favRec
      ? { title: favRec.book.title, thumbnailUrl: favRec.book.thumbnailUrl, rating: favRec.rating }
      : null;
    const books: WrappedBook[] = sorted.map((r) => ({
      title: r.book.title,
      author: r.book.author,
      publisher: r.book.publisher,
      thumbnailUrl: r.book.thumbnailUrl,
      isbn: r.book.isbn,
      rating: r.rating,
    }));

    const tally = new Map<string, number>();
    for (const r of uniq) {
      for (const t of (r.recommendMbti ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
        tally.set(t, (tally.get(t) ?? 0) + 1);
      }
    }
    const topMbti = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      name: user?.name ?? "이름없음",
      year,
      totalBooks: uniq.length,
      avgStars: Math.round(ratingToStars(avg) * 10) / 10,
      fav,
      months,
      topMbti,
      books,
    };
  }
);

export const mbtiLabel = (t: string | null) =>
  !t ? null : t === MBTI_ALL ? "💛 누구에게나" : t;

/** 내 카드 상태 (공개 slug + 공유된 그룹) */
export const getCardState = cache(async (userId: string, year: number) => {
  return prisma.shareCard.findUnique({
    where: { userId_year: { userId, year } },
    include: { groups: true },
  });
});

/** 특정 그룹에 공유된 결산 카드들 */
export async function getGroupSharedCards(groupId: string) {
  return prisma.shareCardGroup.findMany({
    where: { groupId },
    include: { card: { include: { user: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
}
