import type { Prisma } from "@prisma/client";

/**
 * 비공개 기록 열람 규칙 — 한 곳에서 정의해 모든 화면이 같게 동작하게 한다.
 *
 * 비공개(isPrivate) 기록은 **본인과 그룹 관리자(그룹장·운영자)** 에게만 보인다.
 * 같은 그룹의 다른 그룹원, 그리고 로그인 없이 열리는 공개 페이지
 * (공유 보고서 /report, 공개 결산 /w)에서는 제외된다.
 */
export function visibleRecordWhere(opts: {
  /** 보는 사람의 id — 없으면 비로그인(공개 페이지) */
  viewerId?: string | null;
  /** 보는 사람이 그 그룹의 그룹장·운영자인가 */
  viewerIsGroupAdmin?: boolean;
}): Prisma.ReadingRecordWhereInput {
  if (opts.viewerIsGroupAdmin) return {}; // 관리자는 전부 볼 수 있음
  if (opts.viewerId) return { OR: [{ isPrivate: false }, { userId: opts.viewerId }] };
  return { isPrivate: false };
}

/** 이미 가져온 기록 하나를 볼 수 있는지 (상세 페이지 등에서 사용) */
export function canViewRecord(
  record: { isPrivate: boolean; userId: string },
  opts: { viewerId?: string | null; viewerIsGroupAdmin?: boolean }
) {
  if (!record.isPrivate) return true;
  if (opts.viewerIsGroupAdmin) return true;
  return Boolean(opts.viewerId && opts.viewerId === record.userId);
}
