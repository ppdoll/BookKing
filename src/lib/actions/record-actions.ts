"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentMembership, getMemberships, isAdmin, isOwner, canWriteInGroup } from "@/lib/session";
import { STATUS, starsToRating } from "@/lib/constants";

/** ISBN이 있으면 기존 Book 재사용(랭킹 집계용), 없으면 제목+저자로 매칭 */
async function upsertBook(data: {
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

function parseRecordForm(formData: FormData) {
  const status = String(formData.get("status") ?? STATUS.WISH);
  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const starsRaw = String(formData.get("stars") ?? "");
  const stars = starsRaw ? Number(starsRaw) : null;
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  return {
    status,
    title,
    author,
    publisher: String(formData.get("publisher") ?? "").trim(),
    thumbnailUrl: String(formData.get("thumbnailUrl") ?? "").trim(),
    link: String(formData.get("link") ?? "").trim(),
    price: formData.get("price") ? Number(formData.get("price")) : null,
    isbn: String(formData.get("isbn") ?? "").trim() || null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    rating: stars !== null && !Number.isNaN(stars) ? starsToRating(stars) : null,
    recommendMbti: String(formData.get("mbti") ?? "").trim() || null,
    memorableQuote: String(formData.get("quote") ?? "").trim() || null,
    review: String(formData.get("review") ?? "").trim() || null,
  };
}

function validateRecord(d: ReturnType<typeof parseRecordForm>): string | null {
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

/** 책 등록 — 선택한 그룹들에 기록 생성 (다중 선택 가능) */
export async function createRecord(formData: FormData) {
  const user = await requireUser("/books/new");
  const memberships = await getMemberships(user.id);
  if (memberships.length === 0) redirect("/groups/search");

  // 선택된 그룹 중 내가 쓰기 권한이 있는 그룹만 (서버에서 재검증)
  const selected = formData.getAll("groupIds").map(String);
  const targets = memberships.filter(
    (m) => selected.includes(m.groupId) && canWriteInGroup(m.role, m.group)
  );
  if (targets.length === 0) {
    redirect(`/books/new?error=${encodeURIComponent("등록할 그룹을 하나 이상 선택해주세요.")}`);
  }

  const d = parseRecordForm(formData);
  const error = validateRecord(d);
  if (error) redirect(`/books/new?error=${encodeURIComponent(error)}`);

  const book = await upsertBook(d);
  await prisma.readingRecord.createMany({
    data: targets.map((m) => ({
      userId: user.id,
      groupId: m.groupId,
      bookId: book.id,
      status: d.status,
      startDate: d.startDate,
      endDate: d.endDate,
      rating: d.rating,
      recommendMbti: d.recommendMbti,
      memorableQuote: d.memorableQuote,
      review: d.review,
    })),
  });
  revalidatePath("/");
  redirect(`/shelf?created=${targets.length}`);
}

/** 내 기록 수정 (작성자 본인 또는 운영자/그룹장) */
export async function updateRecord(formData: FormData) {
  const id = String(formData.get("recordId") ?? "");
  const user = await requireUser(`/books/${id}/edit`);
  const record = await prisma.readingRecord.findUnique({ where: { id } });
  if (!record || record.deletedAt) redirect("/shelf");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: record.groupId } },
    include: { group: true },
  });
  const canEdit = record.userId === user.id || (membership && isAdmin(membership.role));
  if (!canEdit) redirect("/");
  // 보기 전용 그룹은 그룹장·운영자만 수정 가능
  if (!membership || !canWriteInGroup(membership.role, membership.group)) {
    redirect(`/shelf?error=${encodeURIComponent("보기 전용 그룹이라 그룹장·운영자만 수정할 수 있어요.")}`);
  }

  const d = parseRecordForm(formData);
  const error = validateRecord(d);
  if (error) redirect(`/books/${id}/edit?error=${encodeURIComponent(error)}`);

  const book = await upsertBook(d);
  await prisma.readingRecord.update({
    where: { id },
    data: {
      bookId: book.id,
      status: d.status,
      startDate: d.startDate,
      endDate: d.endDate,
      rating: d.rating,
      recommendMbti: d.recommendMbti,
      memorableQuote: d.memorableQuote,
      review: d.review,
    },
  });
  revalidatePath("/");
  revalidatePath("/shelf");
  redirect("/shelf?updated=1");
}

/** 보기 전용 그룹에서 그룹장이 아니면 상태 변경 불가 */
async function assertStatusChangeAllowed(userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    include: { group: true },
  });
  if (!membership || !canWriteInGroup(membership.role, membership.group)) redirect("/");
}

/** [독서 시작!] — 읽을 예정 → 독서중, 시작일 자동 입력 */
export async function startReading(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("recordId") ?? "");
  const record = await prisma.readingRecord.findUnique({ where: { id } });
  if (!record || record.userId !== user.id || record.deletedAt) redirect("/");
  await assertStatusChangeAllowed(user.id, record.groupId);

  await prisma.readingRecord.update({
    where: { id },
    data: { status: STATUS.READING, startDate: record.startDate ?? new Date() },
  });
  revalidatePath("/");
}

/** [다 읽었어요!] — 독서중 → 완독, 완료일 자동 입력 후 별점 입력 화면으로 */
export async function finishReading(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("recordId") ?? "");
  const record = await prisma.readingRecord.findUnique({ where: { id } });
  if (!record || record.userId !== user.id || record.deletedAt) redirect("/");
  await assertStatusChangeAllowed(user.id, record.groupId);

  await prisma.readingRecord.update({
    where: { id },
    data: { status: STATUS.DONE, endDate: record.endDate ?? new Date() },
  });
  revalidatePath("/");
  redirect(`/books/${id}/edit?finished=1`);
}

/** soft delete — 작성자 본인 또는 운영자/그룹장 */
export async function softDeleteRecord(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("recordId") ?? "");
  const backTo = String(formData.get("backTo") ?? "/shelf");
  const record = await prisma.readingRecord.findUnique({ where: { id } });
  if (!record || record.deletedAt) redirect(backTo);

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: record.groupId } },
  });
  const canDelete = record.userId === user.id || (membership && isAdmin(membership.role));
  if (!canDelete) redirect("/");

  await prisma.readingRecord.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: user.id },
  });
  revalidatePath("/");
  revalidatePath("/shelf");
  revalidatePath("/admin/posts");
  redirect(backTo);
}

/** 삭제 복구 — 그룹장만 */
export async function restoreRecord(formData: FormData) {
  const user = await requireUser("/admin/group");
  const id = String(formData.get("recordId") ?? "");
  const record = await prisma.readingRecord.findUnique({ where: { id } });
  if (!record || !record.deletedAt) redirect("/admin/group");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: record.groupId } },
  });
  if (!membership || !isOwner(membership.role)) redirect("/");

  await prisma.readingRecord.update({
    where: { id },
    data: { deletedAt: null, deletedBy: null },
  });
  revalidatePath("/");
  revalidatePath("/admin/group");
}
