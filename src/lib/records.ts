import { prisma } from "@/lib/db";
import { STATUS } from "@/lib/constants";

/**
 * 책 기록 공용 로직 — 책 등록 화면(record-actions)과 AI 연결(MCP)이 같은 규칙을 쓴다.
 * ("use server" 파일에 두면 export 함수가 전부 클라이언트에서 부를 수 있는 서버 액션이 되므로 따로 둔다)
 */

export type RecordInput = {
  status: string;
  title: string;
  author: string;
  publisher?: string;
  thumbnailUrl?: string;
  link?: string;
  price?: number | null;
  isbn?: string | null;
  startDate: Date | null;
  endDate: Date | null;
  /** 반 개 단위 정수 (0~10) */
  rating: number | null;
};

/** ISBN이 있으면 기존 Book 재사용(랭킹 집계용), 없으면 제목+저자로 매칭 */
export async function upsertBook(data: {
  title: string;
  author: string;
  publisher?: string;
  thumbnailUrl?: string;
  link?: string;
  price?: number | null;
  isbn?: string | null;
}) {
  if (data.isbn) {
    const existing = await prisma.book.findUnique({ where: { isbn: data.isbn } });
    if (existing) return existing;
  } else {
    const existing = await prisma.book.findFirst({
      where: { title: data.title, author: data.author, isbn: null },
    });
    if (existing) return existing;
  }
  return prisma.book.create({
    data: {
      title: data.title,
      author: data.author,
      publisher: data.publisher || null,
      thumbnailUrl: data.thumbnailUrl || null,
      link: data.link || null,
      price: data.price ?? null,
      isbn: data.isbn || null,
    },
  });
}

export function validateRecord(d: RecordInput): string | null {
  if (!d.title) return "책 제목을 입력해주세요.";
  if (!d.author) return "저자를 입력해주세요.";
  if (![STATUS.WISH, STATUS.READING, STATUS.DONE].includes(d.status as never))
    return "상태가 올바르지 않아요.";
  if (d.status === STATUS.READING && !d.startDate) return "독서 시작일을 입력해주세요.";
  if (d.status === STATUS.DONE) {
    if (!d.endDate) return "완독일을 입력해주세요.";
    if (d.rating === null) return "완독한 책은 별점을 매겨주세요.";
  }
  if (d.rating !== null && (d.rating < 0 || d.rating > 10)) return "별점은 0~5 사이예요.";
  return null;
}
