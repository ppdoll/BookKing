import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * AI 연결(MCP)용 개인 토큰.
 * 원문(bk_…)은 발급할 때 한 번만 보여주고 DB에는 sha256 해시만 둔다 — DB가 새도 토큰으로 쓸 수 없다.
 * 토큰은 발급한 사람의 권한 그대로 동작한다(그 사람이 화면에서 볼 수 있는 것만).
 */

/** 한 사람이 가질 수 있는 토큰 수 */
export const API_TOKEN_LIMIT = 5;

const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

/**
 * 학교 모드 학생 계정(…@bookking.local)은 AI 연결을 쓸 수 없다.
 * 미성년 학생 기록이 학생 본인 판단만으로 외부 AI 서비스로 나가지 않게 한다.
 */
export function canUseAiConnect(user: { email: string | null }) {
  return !(user.email ?? "").toLowerCase().endsWith("@bookking.local");
}

/** 새 토큰 발급 — 원문을 돌려주며, 이 값은 다시 볼 수 없다 */
export async function issueApiToken(userId: string, name: string) {
  const raw = `bk_${randomBytes(24).toString("base64url")}`;
  await prisma.apiToken.create({
    data: { userId, name, tokenHash: hashToken(raw), prefix: raw.slice(0, 7) },
  });
  return raw;
}

/** Authorization: Bearer bk_… 헤더로 사용자 찾기. 정지·이름 미등록·학생 계정은 null */
export async function userFromApiToken(authorization: string | null) {
  const m = /^Bearer\s+(bk_[A-Za-z0-9_-]{20,})\s*$/i.exec(authorization ?? "");
  if (!m) return null;
  const token = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(m[1]) }, include: { user: true } });
  if (!token) return null;
  const { user } = token;
  if (user.suspendedAt || !user.name || !canUseAiConnect(user)) return null;

  // 마지막 사용 시각은 한 시간에 한 번만 기록 (요청마다 쓰지 않게)
  if (!token.lastUsedAt || Date.now() - token.lastUsedAt.getTime() > 60 * 60 * 1000) {
    await prisma.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  }
  return user;
}
