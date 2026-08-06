import { deleteExpiredGroups } from "@/lib/group-expiry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 만료된 그룹 일괄 삭제 — Vercel Cron이 하루 한 번 호출 (vercel.json crons).
 * CRON_SECRET을 설정하면 Vercel이 Authorization 헤더로 보내주고, 외부 호출은 차단된다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await deleteExpiredGroups();
  if (result.deletedGroups > 0) {
    console.log(`[cron] 만료 그룹 삭제: ${result.deletedGroups}개, 학생 계정 ${result.deletedStudents}개`);
  }
  return Response.json({ ok: true, deletedGroups: result.deletedGroups, deletedStudents: result.deletedStudents });
}
