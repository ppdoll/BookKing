import { prisma } from "@/lib/db";
import { STATUS } from "@/lib/constants";

export type StudentProgress = {
  id: string;
  classNo: string;
  nickname: string;
  entered: boolean; // 입장(계정 배정) 완료 여부
  wish: number;
  reading: number;
  done: number;
  total: number;
  lastAt: Date | null; // 마지막 기록 활동
  /** 이 학생이 기록한 책 (보고서의 "학생별 읽은 책"에 사용, 최근 기록 순) */
  books: { status: string; title: string; endDate: Date | null }[];
};

export type ClassroomProgress = {
  students: StudentProgress[];
  totals: { wish: number; reading: number; done: number; total: number };
  rosterCount: number;
  enteredCount: number;
  noRecordCount: number; // 입장했지만 아직 기록이 없는 학생
  weekActiveCount: number; // 이번 주(월요일 00:00 KST 이후) 기록을 남긴 학생 수
  /** 완독률 = 완독 권수 / 전체 기록 권수 (기록이 없으면 0) */
  doneRate: number;
  /** 참여율 = 기록을 1권 이상 남긴 학생 / 명렬 인원 */
  participationRate: number;
  /** 명렬 인원 1인당 평균 기록 권수 */
  avgBooks: number;
};

/** 학생 표 정렬 기준 */
export const SORTS = {
  no: "반번호",
  done: "완독 많은 순",
  total: "기록 많은 순",
  recent: "최근 활동 순",
  idle: "도움 필요한 순",
} as const;
export type SortKey = keyof typeof SORTS;
export const isSortKey = (v: string | undefined): v is SortKey => Boolean(v && v in SORTS);

const KST_OFFSET = 9 * 60 * 60 * 1000;

/**
 * "이번 주"의 시작 = 한국 시간 월요일 00:00 (반환값은 UTC 기준 시각).
 * 배포 서버는 UTC로 동작하므로 오프셋을 직접 적용해야 주 경계가 밀리지 않는다.
 */
function startOfWeekKst(now = new Date()) {
  const kst = new Date(now.getTime() + KST_OFFSET);
  const daysSinceMonday = (kst.getUTCDay() + 6) % 7; // 일요일(0) → 6
  const mondayKst = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - daysSinceMonday);
  return new Date(mondayKst - KST_OFFSET);
}

/** 반번호 자연 정렬 — "2"가 "10"보다 앞에 오도록 */
function compareClassNo(a: string, b: string) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, "ko");
}

/**
 * 학교(교실) 모드 선생님용 집계 — 명렬 기준으로 학생별 읽을예정/독서중/완독 수를 센다.
 * 명렬에 있지만 아직 입장하지 않은 학생도 함께 보여줘 참여 현황을 파악할 수 있다.
 */
export async function getClassroomProgress(groupId: string): Promise<ClassroomProgress> {
  const roster = await prisma.classroomStudent.findMany({
    where: { groupId },
    select: { id: true, classNo: true, nickname: true, claimedByUserId: true },
  });

  const studentIds = roster.map((r) => r.claimedByUserId).filter((v): v is string => Boolean(v));

  // 학생 기록을 한 번에 가져와 메모리에서 집계 (한 반 규모라 쿼리 1번이 가장 저렴)
  const records =
    studentIds.length > 0
      ? await prisma.readingRecord.findMany({
          where: { groupId, deletedAt: null, userId: { in: studentIds } },
          select: {
            userId: true, status: true, updatedAt: true, endDate: true,
            book: { select: { title: true } },
          },
          orderBy: { updatedAt: "desc" },
        })
      : [];

  const byUser = new Map<
    string,
    { wish: number; reading: number; done: number; lastAt: Date | null; books: StudentProgress["books"] }
  >();
  for (const r of records) {
    const cur = byUser.get(r.userId) ?? { wish: 0, reading: 0, done: 0, lastAt: null, books: [] };
    if (r.status === STATUS.WISH) cur.wish++;
    else if (r.status === STATUS.READING) cur.reading++;
    else if (r.status === STATUS.DONE) cur.done++;
    if (!cur.lastAt || r.updatedAt > cur.lastAt) cur.lastAt = r.updatedAt;
    cur.books.push({ status: r.status, title: r.book.title, endDate: r.endDate });
    byUser.set(r.userId, cur);
  }

  const students: StudentProgress[] = roster
    .map((r) => {
      const c = r.claimedByUserId ? byUser.get(r.claimedByUserId) : undefined;
      const wish = c?.wish ?? 0;
      const reading = c?.reading ?? 0;
      const done = c?.done ?? 0;
      return {
        id: r.id,
        classNo: r.classNo,
        nickname: r.nickname,
        entered: Boolean(r.claimedByUserId),
        wish,
        reading,
        done,
        total: wish + reading + done,
        lastAt: c?.lastAt ?? null,
        books: c?.books ?? [],
      };
    })
    .sort((a, b) => compareClassNo(a.classNo, b.classNo));

  const totals = students.reduce(
    (acc, s) => ({
      wish: acc.wish + s.wish,
      reading: acc.reading + s.reading,
      done: acc.done + s.done,
      total: acc.total + s.total,
    }),
    { wish: 0, reading: 0, done: 0, total: 0 }
  );

  const weekStart = startOfWeekKst();
  const rosterCount = students.length;
  const activeCount = students.filter((s) => s.total > 0).length;
  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

  return {
    students,
    totals,
    rosterCount,
    enteredCount: students.filter((s) => s.entered).length,
    noRecordCount: students.filter((s) => s.entered && s.total === 0).length,
    weekActiveCount: students.filter((s) => s.lastAt !== null && s.lastAt >= weekStart).length,
    doneRate: pct(totals.done, totals.total),
    participationRate: pct(activeCount, rosterCount),
    avgBooks: rosterCount > 0 ? Math.round((totals.total / rosterCount) * 10) / 10 : 0,
  };
}

/**
 * 학생 표 정렬. 동점일 때는 항상 반번호 순으로 떨어뜨려 순서가 흔들리지 않게 한다.
 * idle(도움 필요한 순)은 기록이 없거나 활동이 오래된 학생을 위로 올린다.
 */
export function sortStudents(students: StudentProgress[], key: SortKey): StudentProgress[] {
  const byNo = (a: StudentProgress, b: StudentProgress) => compareClassNo(a.classNo, b.classNo);
  const list = [...students];

  switch (key) {
    case "done":
      return list.sort((a, b) => b.done - a.done || byNo(a, b));
    case "total":
      return list.sort((a, b) => b.total - a.total || byNo(a, b));
    case "recent":
      // 활동이 있는 학생을 최신순으로, 활동 없는 학생은 뒤로
      return list.sort(
        (a, b) => (b.lastAt?.getTime() ?? -1) - (a.lastAt?.getTime() ?? -1) || byNo(a, b)
      );
    case "idle":
      // 미입장 → 기록 없음 → 오래된 활동 순
      return list.sort((a, b) => {
        const rank = (s: StudentProgress) => (!s.entered ? 0 : s.total === 0 ? 1 : 2);
        return (
          rank(a) - rank(b) ||
          (a.lastAt?.getTime() ?? 0) - (b.lastAt?.getTime() ?? 0) ||
          byNo(a, b)
        );
      });
    default:
      return list.sort(byNo);
  }
}
