import { prisma } from "@/lib/db";

/**
 * 그룹 아이콘 이미지 — 상단바·파비콘·OG(카톡 미리보기)에서 함께 사용한다.
 * OG 크롤러가 읽어야 하므로 로그인 없이 공개된다.
 * URL에 ?v={Group.iconVersion}이 붙으므로 길게 캐시해도 교체 시 즉시 반영된다.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const icon = await prisma.groupIcon.findUnique({ where: { groupId: id } });
  if (!icon) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(icon.data), {
    headers: {
      "Content-Type": icon.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
