import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * 로그인한 사용자가 학교(교실) 모드 학생이면 그 명렬 항목을 돌려준다.
 * 학생이 아니면 null. (요청 내 캐시)
 */
export const getStudentEntry = cache(async (userId: string) => {
  return prisma.classroomStudent.findUnique({
    where: { claimedByUserId: userId },
    include: { group: { select: { id: true, name: true, inviteCode: true, classroomMode: true } } },
  });
});

/** 아직 개인 비밀번호를 정하지 않은 학생인지 — 맞으면 설정 화면으로 보내야 한다 */
export async function needsStudentPassword(userId: string) {
  const entry = await getStudentEntry(userId);
  return Boolean(entry && entry.group.classroomMode && !entry.password);
}
