import { cache } from "react";
import { prisma } from "@/lib/db";

/** 기본 제공 이용권 수 (모든 유저 공통) */
export const BASE_SLOTS = 1;

export type SlotStatus = {
  total: number; // 기본 + 지급받은 슬롯
  used: number; // 생성한 그룹 수 (위임과 무관)
  available: number;
};

/** 그룹 생성 이용권 현황 (요청 내 캐시) */
export const getSlotStatus = cache(async (userId: string): Promise<SlotStatus> => {
  const [granted, used] = await Promise.all([
    prisma.slotGrant.count({ where: { userId } }),
    prisma.group.count({ where: { createdById: userId } }),
  ]);
  const total = BASE_SLOTS + granted;
  return { total, used, available: Math.max(0, total - used) };
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
