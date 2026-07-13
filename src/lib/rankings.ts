import { prisma } from "@/lib/db";
import { STATUS, RANKING_MIN_READERS, ratingToStars } from "@/lib/constants";

export type BookRankingEntry = {
  bookId: string;
  title: string;
  thumbnailUrl: string | null;
  avgStars: number; // 평균 별점 (0~5)
  readerCount: number; // 완독한 사람 수
};

/**
 * 책 랭킹 — groupId 지정 시 그룹 랭킹, null이면 통합 랭킹.
 * 완독(DONE)·미삭제 기록만, 완독자 RANKING_MIN_READERS명 이상인 책만.
 * (통합 랭킹은 집계 수치만 반환하므로 그룹 격리 원칙 유지)
 */
export async function getBookRankings(
  groupId: string | null,
  by: "rating" | "count",
  limit = 5
): Promise<BookRankingEntry[]> {
  const records = await prisma.readingRecord.findMany({
    where: {
      status: STATUS.DONE,
      deletedAt: null,
      ...(groupId ? { groupId } : {}),
    },
    select: {
      bookId: true,
      userId: true,
      rating: true,
      book: { select: { title: true, thumbnailUrl: true } },
    },
  });

  const byBook = new Map<
    string,
    { title: string; thumbnailUrl: string | null; readers: Set<string>; ratings: number[] }
  >();
  for (const r of records) {
    let entry = byBook.get(r.bookId);
    if (!entry) {
      entry = { title: r.book.title, thumbnailUrl: r.book.thumbnailUrl, readers: new Set(), ratings: [] };
      byBook.set(r.bookId, entry);
    }
    entry.readers.add(r.userId);
    if (r.rating !== null) entry.ratings.push(r.rating);
  }

  const result: BookRankingEntry[] = [];
  for (const [bookId, e] of byBook) {
    if (e.readers.size < RANKING_MIN_READERS) continue;
    const avg = e.ratings.length
      ? e.ratings.reduce((a, b) => a + b, 0) / e.ratings.length
      : 0;
    result.push({
      bookId,
      title: e.title,
      thumbnailUrl: e.thumbnailUrl,
      avgStars: Math.round(ratingToStars(avg) * 10) / 10,
      readerCount: e.readers.size,
    });
  }

  result.sort((a, b) =>
    by === "rating"
      ? b.avgStars - a.avgStars || b.readerCount - a.readerCount
      : b.readerCount - a.readerCount || b.avgStars - a.avgStars
  );
  return result.slice(0, limit);
}

export type ReaderRankingEntry = {
  userId: string;
  name: string;
  doneCount: number;
};

/** 독서왕 랭킹 — 그룹 내, 올해 완독 권수 순 (그룹 탭에서만 노출) */
export async function getTopReaders(
  groupId: string,
  year: number,
  limit = 5
): Promise<ReaderRankingEntry[]> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const records = await prisma.readingRecord.findMany({
    where: {
      groupId,
      status: STATUS.DONE,
      deletedAt: null,
      endDate: { gte: start, lt: end },
    },
    select: {
      userId: true,
      bookId: true,
      user: { select: { name: true } },
    },
  });

  const byUser = new Map<string, { name: string; books: Set<string> }>();
  for (const r of records) {
    let entry = byUser.get(r.userId);
    if (!entry) {
      entry = { name: r.user.name ?? "이름없음", books: new Set() };
      byUser.set(r.userId, entry);
    }
    entry.books.add(r.bookId);
  }

  return [...byUser.entries()]
    .map(([userId, e]) => ({ userId, name: e.name, doneCount: e.books.size }))
    .sort((a, b) => b.doneCount - a.doneCount)
    .slice(0, limit);
}

/** 올해의 독서 기록 — 내 월별 완독 수 (현재 그룹) */
export async function getMonthlyDone(userId: string, groupId: string, year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const records = await prisma.readingRecord.findMany({
    where: {
      userId,
      groupId,
      status: STATUS.DONE,
      deletedAt: null,
      endDate: { gte: start, lt: end },
    },
    select: { endDate: true },
  });

  const months = Array(12).fill(0) as number[];
  for (const r of records) {
    if (r.endDate) months[r.endDate.getMonth()]++;
  }
  return months;
}
