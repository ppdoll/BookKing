/**
 * 비공개 기록 규칙 — 한 곳에서 정의해 모든 화면이 같게 동작하게 한다.
 *
 * 비공개(isPrivate)로 표시해도 기록 자체는 평소와 똑같이 보인다.
 * 가려지는 것은 **기억에 남는 문장 · 읽고 느낀 점** 두 가지뿐이고,
 * 이 둘은 작성자 본인과 그룹장·운영자에게만 보인다.
 * (책 제목·상태·별점·랭킹·보고서 집계는 일반 기록과 동일)
 */
export function canViewPrivateNotes(
  record: { isPrivate: boolean; userId: string },
  opts: { viewerId?: string | null; viewerIsGroupAdmin?: boolean }
) {
  if (!record.isPrivate) return true;
  if (opts.viewerIsGroupAdmin) return true;
  return Boolean(opts.viewerId && opts.viewerId === record.userId);
}
