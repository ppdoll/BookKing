import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * 비밀번호를 scrypt로 해시 — "salt:hash" 형태. 평문 저장 금지.
 * (학교 모드 학생 입장 비밀번호 등에 사용)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** hashPassword로 만든 값과 대조. 타이밍 공격 방지를 위해 timingSafeEqual 사용. */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const test = scryptSync(password, salt, hashBuf.length);
  return hashBuf.length === test.length && timingSafeEqual(hashBuf, test);
}
