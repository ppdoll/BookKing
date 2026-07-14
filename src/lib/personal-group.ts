import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { ROLE } from "@/lib/constants";

/**
 * 개인 책장 — 가입 완료 시 자동 생성되는 1인 전용 그룹.
 * 이용권을 차감하지 않고(isPersonal), 초대·검색·승인 옵션이 없다.
 * (inviteExpiresAt을 과거로 두어 초대 링크가 유출돼도 쓸 수 없음)
 */
export async function ensurePersonalGroup(userId: string, displayName: string) {
  const existing = await prisma.group.findFirst({
    where: { createdById: userId, isPersonal: true },
  });
  if (existing) return existing;

  return prisma.group.create({
    data: {
      name: `${displayName}의 책장`.slice(0, 30),
      ownerId: userId,
      createdById: userId,
      isPersonal: true,
      inviteCode: randomBytes(9).toString("base64url"),
      inviteExpiresAt: new Date(0), // 항상 만료 상태
      members: { create: { userId, role: ROLE.OWNER } },
    },
  });
}
