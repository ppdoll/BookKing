import { cache } from "react";
import { prisma } from "@/lib/db";
import { STATUS, RANKING_MIN_READERS, ratingToStars } from "@/lib/constants";
import { detectRoomLayout, parseClassNo, roomId, type RoomKey, type RoomLayout } from "@/lib/class-no";

/**
 * 학교 모드 그룹을 반번호로 나눈 랭킹 (C안).
 * - 우리 반: 개인 순위
 * - 우리 학년·우리 학교: 반 대항(1인 평균 완독) + 개인 상위 10명
 * - 책 랭킹은 어느 범위든 학생 이름 없이 책만 줄 세운다
 *
 * 명렬로 반을 나눌 수 없으면(형식이 다르거나 반이 하나뿐) null — 그때는 기존 그룹 랭킹을 쓴다.
 */

export type RankScope = { kind: "room"; room: RoomKey } | { kind: "grade"; grade: number } | { kind: "school" };

type Student = { userId: string; nickname: string; room: RoomKey };

export type ClassroomRankingData = {
  layout: RoomLayout;
  /** 입장한 학생 — userId → 별명·반 */
  students: Map<string, Student>;
  /** 반별 명렬 인원 (입장 안 한 학생 포함) — roomId → 인원 */
  rosterByRoom: Map<string, number>;
  /** 올해 완독 권수 (같은 책은 한 번) — userId → 권수 */
  doneThisYear: Map<string, number>;
  /** 책 랭킹용 완독 기록 (기존 책 랭킹처럼 기간 제한 없음) */
  doneRecords: { userId: string; bookId: string; rating: number | null }[];
  /** 책 랭킹에 오를 수 있는 책(학교 전체에서 RANKING_MIN_READERS명 이상 완독)의 제목·표지 */
  books: Map<string, { title: string; thumbnailUrl: string | null }>;
};

export const getClassroomRankingData = cache(
  async (groupId: string, year: number): Promise<ClassroomRankingData | null> => {
    const roster = await prisma.classroomStudent.findMany({
      where: { groupId },
      select: { classNo: true, nickname: true, claimedByUserId: true },
    });
    const layout = detectRoomLayout(roster.map((r) => r.classNo));
    if (!layout) return null;

    const students = new Map<string, Student>();
    const rosterByRoom = new Map<string, number>();
    for (const r of roster) {
      const room = parseClassNo(r.classNo);
      if (!room) continue;
      rosterByRoom.set(roomId(room), (rosterByRoom.get(roomId(room)) ?? 0) + 1);
      if (r.claimedByUserId) students.set(r.claimedByUserId, { userId: r.claimedByUserId, nickname: r.nickname, room });
    }

    const records = await prisma.readingRecord.findMany({
      where: { groupId, status: STATUS.DONE, deletedAt: null, userId: { in: [...students.keys()] } },
      select: { userId: true, bookId: true, rating: true, endDate: true },
    });

    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const booksThisYear = new Map<string, Set<string>>();
    const readersByBook = new Map<string, Set<string>>();
    for (const r of records) {
      readersByBook.set(r.bookId, (readersByBook.get(r.bookId) ?? new Set<string>()).add(r.userId));
      if (!r.endDate || r.endDate < start || r.endDate >= end) continue;
      booksThisYear.set(r.userId, (booksThisYear.get(r.userId) ?? new Set<string>()).add(r.bookId));
    }

    // 기록마다 책 정보를 붙여 읽으면 학교 규모에선 응답이 몇 배로 커진다 —
    // 어느 범위에서든 랭킹에 오를 수 있는 책(학교 전체에서 기준 인원 이상)만 따로 읽는다
    const candidateIds = [...readersByBook].filter(([, s]) => s.size >= RANKING_MIN_READERS).map(([id]) => id);
    const books =
      candidateIds.length > 0
        ? await prisma.book.findMany({
            where: { id: { in: candidateIds } },
            select: { id: true, title: true, thumbnailUrl: true },
          })
        : [];

    return {
      layout,
      students,
      rosterByRoom,
      doneThisYear: new Map([...booksThisYear].map(([u, s]) => [u, s.size])),
      doneRecords: records.map((r) => ({ userId: r.userId, bookId: r.bookId, rating: r.rating })),
      books: new Map(books.map((b) => [b.id, { title: b.title, thumbnailUrl: b.thumbnailUrl }])),
    };
  }
);

function inScope(room: RoomKey, scope: RankScope) {
  if (scope.kind === "school") return true;
  if (scope.kind === "grade") return room.grade === scope.grade;
  return room.grade === scope.room.grade && room.room === scope.room.room;
}

/**
 * 공동 순위 — 점수가 같으면 같은 등수(1, 2, 2, 4 …).
 * 별명이 반번호인 학교가 많아 이름순으로 등수를 가르면 번호가 빠른 학생이 늘 앞서게 된다.
 */
function withRanks<T>(sorted: T[], score: (t: T) => number): (T & { rank: number })[] {
  const out: (T & { rank: number })[] = [];
  sorted.forEach((t, i) => {
    const rank = i > 0 && score(sorted[i - 1]) === score(t) ? out[i - 1].rank : i + 1;
    out.push({ ...t, rank });
  });
  return out;
}

export type RoomStanding = { room: RoomKey; roster: number; done: number; avg: number; rank: number };

/** 반 대항 — 범위 안의 반을 1인 평균 완독(올해 완독 ÷ 명렬 인원)으로 줄 세운다 */
export function roomStandings(data: ClassroomRankingData, scope: RankScope): RoomStanding[] {
  const doneByRoom = new Map<string, number>();
  for (const s of data.students.values()) {
    const n = data.doneThisYear.get(s.userId) ?? 0;
    doneByRoom.set(roomId(s.room), (doneByRoom.get(roomId(s.room)) ?? 0) + n);
  }
  const sorted = data.layout.rooms
    .filter((room) => inScope(room, scope))
    .map((room) => {
      const roster = data.rosterByRoom.get(roomId(room)) ?? 0;
      const done = doneByRoom.get(roomId(room)) ?? 0;
      // 인원이 다른 반끼리 공정하게 — 총 권수가 아니라 명렬 1인당
      return { room, roster, done, avg: roster > 0 ? Math.round((done / roster) * 10) / 10 : 0 };
    })
    .sort((a, b) => b.avg - a.avg || a.room.grade - b.room.grade || a.room.room - b.room.room);
  return withRanks(sorted, (s) => s.avg);
}

export type ReaderStanding = { userId: string; nickname: string; room: RoomKey; doneCount: number; rank: number };

/** 개인 순위 — 올해 완독 권수. 한 권도 없는 학생은 넣지 않는다 */
export function readerStandings(data: ClassroomRankingData, scope: RankScope): ReaderStanding[] {
  const sorted = [...data.students.values()]
    .filter((s) => inScope(s.room, scope))
    .map((s) => ({ userId: s.userId, nickname: s.nickname, room: s.room, doneCount: data.doneThisYear.get(s.userId) ?? 0 }))
    .filter((s) => s.doneCount > 0)
    .sort((a, b) => b.doneCount - a.doneCount || a.nickname.localeCompare(b.nickname, "ko", { numeric: true }));
  return withRanks(sorted, (s) => s.doneCount);
}

export type ScopedBookRanking = {
  bookId: string; title: string; thumbnailUrl: string | null; avgStars: number; readerCount: number;
};

/** 책 랭킹 — 범위 안 학생 RANKING_MIN_READERS명 이상이 완독한 책만 (기존 책 랭킹과 같은 기준) */
export function scopedBookRankings(
  data: ClassroomRankingData, scope: RankScope, by: "rating" | "count", limit = 5
): ScopedBookRanking[] {
  const byBook = new Map<string, { readers: Set<string>; ratings: number[] }>();
  for (const r of data.doneRecords) {
    const s = data.students.get(r.userId);
    if (!s || !inScope(s.room, scope)) continue;
    const e = byBook.get(r.bookId) ?? { readers: new Set(), ratings: [] };
    e.readers.add(r.userId);
    if (r.rating !== null) e.ratings.push(r.rating);
    byBook.set(r.bookId, e);
  }
  const out: ScopedBookRanking[] = [];
  for (const [bookId, e] of byBook) {
    const book = data.books.get(bookId);
    if (e.readers.size < RANKING_MIN_READERS || !book) continue;
    const avg = e.ratings.length ? e.ratings.reduce((a, b) => a + b, 0) / e.ratings.length : 0;
    out.push({ bookId, ...book, avgStars: Math.round(ratingToStars(avg) * 10) / 10, readerCount: e.readers.size });
  }
  out.sort((a, b) =>
    by === "rating" ? b.avgStars - a.avgStars || b.readerCount - a.readerCount : b.readerCount - a.readerCount || b.avgStars - a.avgStars
  );
  return out.slice(0, limit);
}
