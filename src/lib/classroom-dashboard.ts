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
};

export type ClassroomProgress = {
  students: StudentProgress[];
  totals: { wish: number; reading: number; done: number; total: number };
  rosterCount: number;
  enteredCount: number;
  noRecordCount: number; // 입장했지만 아직 기록이 없는 학생
};

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
          select: { userId: true, status: true, updatedAt: true },
        })
      : [];

  const byUser = new Map<string, { wish: number; reading: number; done: number; lastAt: Date | null }>();
  for (const r of records) {
    const cur = byUser.get(r.userId) ?? { wish: 0, reading: 0, done: 0, lastAt: null };
    if (r.status === STATUS.WISH) cur.wish++;
    else if (r.status === STATUS.READING) cur.reading++;
    else if (r.status === STATUS.DONE) cur.done++;
    if (!cur.lastAt || r.updatedAt > cur.lastAt) cur.lastAt = r.updatedAt;
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

  return {
    students,
    totals,
    rosterCount: students.length,
    enteredCount: students.filter((s) => s.entered).length,
    noRecordCount: students.filter((s) => s.entered && s.total === 0).length,
  };
}
