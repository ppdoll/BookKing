import { cache } from "react";
import { prisma } from "@/lib/db";

/** 기본 제공 이용권 수 (모든 유저 공통) */
export const BASE_SLOTS = 1;

export type SlotStatus = {
  total: number; // 사용 가능한 최대 그룹 수
  used: number; // 생성한 그룹 수 (위임과 무관)
  available: number;
  /** 사이트 관리자가 최대 개수를 직접 지정한 상태인지 (쿠폰 지급분 대신 이 값이 적용됨) */
  limitFixed: boolean;
};

/** 그룹 생성 이용권 현황 (요청 내 캐시) — 개인 책장(isPersonal)은 차감하지 않음 */
export const getSlotStatus = cache(async (userId: string): Promise<SlotStatus> => {
  const [account, granted, used] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { slotLimit: true } }),
    prisma.slotGrant.count({ where: { userId } }),
    prisma.group.count({ where: { createdById: userId, isPersonal: false } }),
  ]);
  // 관리자가 최대 개수를 지정했으면 그 값이 우선, 아니면 기본 + 쿠폰 지급분
  const limitFixed = typeof account?.slotLimit === "number";
  const total = limitFixed ? account!.slotLimit! : BASE_SLOTS + granted;
  return { total, used, available: Math.max(0, total - used), limitFixed };
});

/** 사이트 관리자 여부 — DB 플래그 또는 ADMIN_EMAILS 환경변수 */
export function isSiteAdminUser(user: { isSiteAdmin: boolean; email: string | null }) {
  if (user.isSiteAdmin) return true;
  const envAdmins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(user.email && envAdmins.includes(user.email.toLowerCase()));
}

/** 쿠폰 코드 생성 — 헷갈리는 문자(0/O, 1/I/L) 제외 */
export function newCouponCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `BOOK-${s}`;
}
