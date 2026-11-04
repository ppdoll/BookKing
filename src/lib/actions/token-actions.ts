"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { API_TOKEN_LIMIT, canUseAiConnect, issueApiToken } from "@/lib/api-token";

export type IssueTokenState = { token?: string; name?: string; error?: string };

/** AI 연결 토큰 발급 — 원문은 이 응답으로 한 번만 화면에 보여준다 (주소창·DB에 남기지 않음) */
export async function issueTokenAction(_prev: IssueTokenState, formData: FormData): Promise<IssueTokenState> {
  const user = await requireUser("/connect");
  if (!canUseAiConnect(user)) return { error: "학생 계정은 AI 연결을 쓸 수 없어요." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 30) || "Claude";
  const count = await prisma.apiToken.count({ where: { userId: user.id } });
  if (count >= API_TOKEN_LIMIT) {
    return { error: `토큰은 ${API_TOKEN_LIMIT}개까지 만들 수 있어요. 안 쓰는 토큰을 먼저 지워주세요.` };
  }

  const token = await issueApiToken(user.id, name);
  revalidatePath("/connect");
  return { token, name };
}

/** 토큰 삭제 — 그 토큰을 넣어 둔 AI 앱은 바로 연결이 끊긴다 */
export async function revokeTokenAction(formData: FormData) {
  const user = await requireUser("/connect");
  const id = String(formData.get("tokenId") ?? "");
  await prisma.apiToken.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/connect");
}
