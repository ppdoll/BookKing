"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { GROUP_COOKIE } from "@/lib/session";
import { ensurePersonalGroup } from "@/lib/personal-group";

/** 가입 직후 이름 등록 (필수) — 완료 시 개인 책장 자동 생성 */
export async function updateName(formData: FormData) {
  const user = await requireSessionUser();
  const name = String(formData.get("name") ?? "").trim();
  const next = String(formData.get("next") ?? "/");
  if (!name) redirect(`/welcome?error=empty&next=${encodeURIComponent(next)}`);
  if (name.length > 20) redirect(`/welcome?error=long&next=${encodeURIComponent(next)}`);

  await prisma.user.update({ where: { id: user.id }, data: { name } });
  await ensurePersonalGroup(user.id, name);
  redirect(next.startsWith("/") ? next : "/");
}

/** 상단바 그룹 SELECT — 현재 그룹 전환 */
export async function selectGroup(formData: FormData) {
  const user = await requireSessionUser();
  const groupId = String(formData.get("groupId") ?? "");
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  });
  if (membership) {
    const store = await cookies();
    store.set(GROUP_COOKIE, groupId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  revalidatePath("/", "layout");
  redirect("/");
}
