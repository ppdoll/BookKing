import { prisma } from "@/lib/db";
import { getMemberships, isAdmin, canWriteInGroup } from "@/lib/session";
import { STATUS, STATUS_LABEL, ROLE_LABEL, ratingToStars, starsToRating, type Role, type Status } from "@/lib/constants";
import { fmtDateFull } from "@/lib/format";
import { parseRoomId, roomLabel } from "@/lib/class-no";
import { getBookRankings, getTopReaders } from "@/lib/rankings";
import { getClassroomRankingData, readerStandings, roomStandings, scopedBookRankings } from "@/lib/class-rankings";
import {
  getClassroomProgress, getSchoolView, roomsNeedingCare, studentsInRoom, summarizeProgress,
} from "@/lib/classroom-dashboard";
import { searchBooks } from "@/lib/book-search";
import { upsertBook, validateRecord } from "@/lib/records";

/**
 * BookKing MCP 도구 — 토큰 주인이 화면에서 할 수 있는 것만 한다.
 * - 조회: 내 그룹, 내 책장, 그룹 현황·랭킹, (학교 모드 선생님) 학생별 권수·책 제목, 책 검색
 * - 쓰기: 내 책 기록 등록, 내 기록 상태 바꾸기
 * 학생이 쓴 기억에 남는 문장·느낀 점은 어떤 도구도 내보내지 않는다 (사용자 결정 — 외부 AI로 나가지 않게).
 * 명렬·비밀번호·삭제 같은 관리 기능은 없다.
 */

type User = { id: string; name: string | null };
type Args = Record<string, unknown>;

/** 도구가 사용자에게 돌려줄 오류 — isError 결과로 바뀐다 */
export class ToolError extends Error {}

const str = (a: Args, k: string, required = false) => {
  const v = a[k];
  if (v === undefined || v === null || v === "") {
    if (required) throw new ToolError(`'${k}' 값이 필요해요.`);
    return undefined;
  }
  if (typeof v !== "string") throw new ToolError(`'${k}'는 문자열이어야 해요.`);
  return v.trim();
};
const num = (a: Args, k: string) => {
  const v = a[k];
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) throw new ToolError(`'${k}'는 숫자여야 해요.`);
  return n;
};
const date = (a: Args, k: string) => {
  const v = str(a, k);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new ToolError(`'${k}'는 YYYY-MM-DD 형식이어야 해요.`);
  return new Date(v);
};
const statusArg = (a: Args, k: string, fallback?: Status): Status => {
  const v = (str(a, k) ?? fallback)?.toUpperCase();
  if (v !== STATUS.WISH && v !== STATUS.READING && v !== STATUS.DONE) {
    throw new ToolError(`'${k}'는 WISH(읽을 예정)·READING(독서중)·DONE(완독) 중 하나예요.`);
  }
  return v;
};
/** 별점 0~5, 0.5 단위 → 저장값(0~10) */
const starsArg = (a: Args, k: string) => {
  const s = num(a, k);
  if (s === undefined) return null;
  if (s < 0 || s > 5 || Math.round(s * 2) !== s * 2) throw new ToolError("별점은 0~5 사이, 0.5 단위예요.");
  return starsToRating(s);
};
const day = (d: Date | null) => (d ? fmtDateFull(d) : null);

async function membershipOf(user: User, groupId: string) {
  const m = (await getMemberships(user.id)).find((x) => x.groupId === groupId);
  if (!m) throw new ToolError("그 그룹에 속해 있지 않거나 만료된 그룹이에요. list_groups로 groupId를 확인해 주세요.");
  return m;
}

// ── 조회 ─────────────────────────────────────────

async function listGroups(user: User) {
  const ms = await getMemberships(user.id);
  return ms.map((m) => ({
    groupId: m.groupId,
    name: m.group.name,
    role: ROLE_LABEL[m.role as Role] ?? m.role,
    personalShelf: m.group.isPersonal,
    classroomMode: m.group.classroomMode,
    canWrite: canWriteInGroup(m.role, m.group),
    expiresAt: day(m.group.expiresAt),
  }));
}

async function getMyShelf(user: User, a: Args) {
  const groupId = str(a, "groupId");
  const status = str(a, "status") ? statusArg(a, "status") : undefined;
  const limit = Math.min(Math.max(num(a, "limit") ?? 50, 1), 200);
  const groupIds = groupId ? [(await membershipOf(user, groupId)).groupId] : (await getMemberships(user.id)).map((m) => m.groupId);

  const records = await prisma.readingRecord.findMany({
    where: { userId: user.id, deletedAt: null, groupId: { in: groupIds }, ...(status ? { status } : {}) },
    include: { book: true, group: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  // 내 기록이라 내가 쓴 문장·느낀 점도 함께 준다
  return records.map((r) => ({
    recordId: r.id,
    group: r.group.name,
    title: r.book.title,
    author: r.book.author,
    isbn: r.book.isbn,
    status: STATUS_LABEL[r.status as Status],
    stars: r.rating !== null ? ratingToStars(r.rating) : null,
    startDate: day(r.startDate),
    endDate: day(r.endDate),
    private: r.isPrivate,
    memorableQuote: r.memorableQuote,
    review: r.review,
  }));
}

async function getGroupOverview(user: User, a: Args) {
  const m = await membershipOf(user, str(a, "groupId", true)!);
  const year = new Date().getFullYear();
  const myCounts = await prisma.readingRecord.groupBy({
    by: ["status"],
    where: { userId: user.id, groupId: m.groupId, deletedAt: null },
    _count: true,
  });
  const base = {
    group: m.group.name,
    myRole: ROLE_LABEL[m.role as Role] ?? m.role,
    classroomMode: m.group.classroomMode,
    myRecords: Object.fromEntries(myCounts.map((c) => [STATUS_LABEL[c.status as Status], c._count])),
  };
  if (m.group.isPersonal) return base;

  const books = (list: { title: string; avgStars: number; readerCount: number }[]) =>
    list.map((b) => ({ title: b.title, avgStars: b.avgStars, readers: b.readerCount }));

  // 학교 그룹(반번호로 반이 나뉨) — 반 대항·개인 상위·책 랭킹
  const school = m.group.classroomMode ? await getClassroomRankingData(m.groupId, year) : null;
  const rankings = school
    ? {
        roomStandingsThisYear: roomStandings(school, { kind: "school" }).map((s) => ({
          room: roomLabel(s.room), rank: s.done > 0 ? s.rank : null, perStudentDone: s.avg, done: s.done, roster: s.roster,
        })),
        topReadersThisYear: readerStandings(school, { kind: "school" }).slice(0, 10).map((r) => ({
          rank: r.rank, nickname: r.nickname, room: roomLabel(r.room), done: r.doneCount,
        })),
        topBooksByRating: books(scopedBookRankings(school, { kind: "school" }, "rating")),
        mostReadBooks: books(scopedBookRankings(school, { kind: "school" }, "count")),
      }
    : {
        topReadersThisYear: (await getTopReaders(m.groupId, year)).map((r) => ({ name: r.name, done: r.doneCount })),
        topBooksByRating: books(await getBookRankings(m.groupId, "rating")),
        mostReadBooks: books(await getBookRankings(m.groupId, "count")),
      };

  // 학교 모드 선생님에게는 학생 참여 현황까지
  if (!(m.group.classroomMode && isAdmin(m.role))) return { ...base, rankings };
  const progress = await getClassroomProgress(m.groupId);
  const view = await getSchoolView(m.groupId, progress.students, year);
  return {
    ...base,
    rankings,
    students: summarizeProgress(progress.students),
    rooms: view?.rooms.map((r) => ({
      room: roomLabel(r.room), roster: r.roster, entered: r.entered, recorded: r.active,
      activeThisWeek: r.weekActive, noPassword: r.noPassword, participationRate: r.participationRate,
    })),
    roomsNeedingCare: view ? roomsNeedingCare(view.rooms).map((c) => ({ room: roomLabel(c.room), reason: c.reason })) : undefined,
  };
}

async function listStudents(user: User, a: Args) {
  const m = await membershipOf(user, str(a, "groupId", true)!);
  if (!m.group.classroomMode || !isAdmin(m.role)) {
    throw new ToolError("학교(교실) 모드 그룹의 그룹장·운영자(선생님)만 학생 목록을 볼 수 있어요.");
  }
  const progress = await getClassroomProgress(m.groupId);
  const roomParam = str(a, "room");
  let students = progress.students;
  if (roomParam) {
    const room = parseRoomId(roomParam);
    if (!room) throw new ToolError("'room'은 3-1처럼 학년-반 형식이에요.");
    students = studentsInRoom(students, room);
    if (students.length === 0) throw new ToolError(`${roomLabel(room)} 학생이 명렬에 없어요.`);
  }
  // 학생이 쓴 문장·느낀 점은 넣지 않는다 — 권수와 책 제목까지만
  return {
    summary: summarizeProgress(students),
    students: students.map((s) => ({
      classNo: s.classNo,
      nickname: s.nickname,
      entered: s.entered,
      personalPasswordSet: s.hasPassword,
      wish: s.wish,
      reading: s.reading,
      done: s.done,
      lastActivity: day(s.lastAt),
      books: s.books.map((b) => ({ status: STATUS_LABEL[b.status as Status], title: b.title, endDate: day(b.endDate) })),
    })),
  };
}

async function searchBookTool(_user: User, a: Args) {
  const query = str(a, "query", true)!;
  const r = await searchBooks(query, 10);
  if (r.error && r.items.length === 0) throw new ToolError(`책 검색에 실패했어요: ${r.error}`);
  return r.items.map((b) => ({
    title: b.title, author: b.author, publisher: b.publisher, isbn: b.isbn,
    price: b.price, link: b.link, thumbnailUrl: b.image, pubdate: b.pubdate,
    description: b.description.slice(0, 200),
  }));
}

// ── 쓰기 ─────────────────────────────────────────

async function addBookRecord(user: User, a: Args) {
  const memberships = await getMemberships(user.id);
  const wanted = a.groupIds;
  if (wanted !== undefined && (!Array.isArray(wanted) || wanted.some((g) => typeof g !== "string"))) {
    throw new ToolError("'groupIds'는 groupId 문자열 목록이에요.");
  }
  // 그룹을 안 고르면 개인 책장에
  const targets = wanted?.length
    ? memberships.filter((m) => (wanted as string[]).includes(m.groupId))
    : memberships.filter((m) => m.group.isPersonal);
  if (targets.length === 0) {
    throw new ToolError("등록할 그룹을 찾지 못했어요. list_groups로 groupId를 확인해 groupIds에 넣어 주세요.");
  }
  const denied = targets.filter((m) => !canWriteInGroup(m.role, m.group));
  if (denied.length > 0) {
    throw new ToolError(`보기 전용 그룹이라 기록할 수 없어요: ${denied.map((m) => m.group.name).join(", ")}`);
  }

  const status = statusArg(a, "status", STATUS.WISH);
  const today = new Date(fmtDateFull(new Date()));
  const d = {
    status,
    title: str(a, "title", true)!,
    author: str(a, "author", true)!,
    publisher: str(a, "publisher") ?? "",
    thumbnailUrl: str(a, "thumbnailUrl") ?? "",
    link: str(a, "link") ?? "",
    price: num(a, "price") ?? null,
    isbn: str(a, "isbn") ?? null,
    // 화면의 [독서 시작!]·[다 읽었어요!]처럼 날짜를 안 주면 오늘
    startDate: date(a, "startDate") ?? (status === STATUS.READING ? today : null),
    endDate: date(a, "endDate") ?? (status === STATUS.DONE ? today : null),
    rating: starsArg(a, "stars"),
  };
  const error = validateRecord(d);
  if (error) throw new ToolError(error === "완독한 책은 별점을 매겨주세요." ? "완독한 책은 별점(stars, 0~5)이 필요해요." : error);

  const isPrivate = a.isPrivate === true;
  const book = await upsertBook(d);
  const created = await prisma.readingRecord.createManyAndReturn({
    data: targets.map((m) => ({
      userId: user.id,
      groupId: m.groupId,
      bookId: book.id,
      status: d.status,
      isPrivate,
      notesToAdmin: isPrivate && a.notesToAdmin === true,
      startDate: d.startDate,
      endDate: d.endDate,
      rating: d.rating,
      memorableQuote: str(a, "memorableQuote") ?? null,
      review: str(a, "review") ?? null,
    })),
    select: { id: true, groupId: true },
  });
  return {
    added: created.map((c) => ({ recordId: c.id, group: targets.find((m) => m.groupId === c.groupId)?.group.name })),
    book: { title: book.title, author: book.author, isbn: book.isbn },
    status: STATUS_LABEL[d.status],
  };
}

async function setRecordStatus(user: User, a: Args) {
  const id = str(a, "recordId", true)!;
  const record = await prisma.readingRecord.findUnique({ where: { id }, include: { book: true } });
  if (!record || record.deletedAt || record.userId !== user.id) {
    throw new ToolError("내 기록을 찾지 못했어요. get_my_shelf로 recordId를 확인해 주세요.");
  }
  const m = await membershipOf(user, record.groupId);
  if (!canWriteInGroup(m.role, m.group)) throw new ToolError("보기 전용 그룹이라 바꿀 수 없어요.");

  const status = statusArg(a, "status");
  const rating = starsArg(a, "stars");
  const updated = await prisma.readingRecord.update({
    where: { id },
    data: {
      status,
      // 화면의 상태 버튼처럼 날짜가 비어 있으면 오늘로
      ...(status !== STATUS.WISH && !record.startDate ? { startDate: new Date() } : {}),
      ...(status === STATUS.DONE && !record.endDate ? { endDate: new Date() } : {}),
      ...(rating !== null ? { rating } : {}),
    },
  });
  return {
    recordId: updated.id,
    title: record.book.title,
    status: STATUS_LABEL[updated.status as Status],
    stars: updated.rating !== null ? ratingToStars(updated.rating) : null,
    startDate: day(updated.startDate),
    endDate: day(updated.endDate),
    note: updated.status === STATUS.DONE && updated.rating === null ? "별점이 아직 없어요. stars로 매겨 주세요." : undefined,
  };
}

// ── 도구 목록 ───────────────────────────────────

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
  run: (user: User, args: Args) => Promise<unknown>;
};

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object", properties, required, additionalProperties: false,
});
const groupIdProp = { type: "string", description: "list_groups로 얻은 groupId" };
const statusProp = { type: "string", enum: ["WISH", "READING", "DONE"], description: "WISH 읽을 예정 · READING 독서중 · DONE 완독" };

export const TOOLS: Tool[] = [
  {
    name: "list_groups",
    description: "내가 속한 BookKing 그룹 목록 (개인 책장 포함). 다른 도구에 넘길 groupId를 여기서 얻는다.",
    inputSchema: obj({}),
    readOnly: true,
    run: (u) => listGroups(u),
  },
  {
    name: "get_my_shelf",
    description: "내 독서 기록(책, 상태, 별점, 날짜, 내가 쓴 문장·느낀 점). 최근 수정 순.",
    inputSchema: obj({
      groupId: { ...groupIdProp, description: "이 그룹 기록만 (생략하면 모든 그룹)" },
      status: statusProp,
      limit: { type: "number", description: "최대 개수 (기본 50, 최대 200)" },
    }),
    readOnly: true,
    run: getMyShelf,
  },
  {
    name: "get_group_overview",
    description:
      "그룹 현황: 내 기록 수, 랭킹(독서왕·책 랭킹, 학교 그룹이면 반 대항). 학교(교실) 모드 그룹의 선생님에게는 학생 참여 요약과 반별 현황·챙겨볼 반도 준다.",
    inputSchema: obj({ groupId: groupIdProp }, ["groupId"]),
    readOnly: true,
    run: getGroupOverview,
  },
  {
    name: "list_students",
    description:
      "학교(교실) 모드 그룹의 학생별 현황 — 반번호, 별명, 입장 여부, 읽을 예정·독서중·완독 권수, 최근 활동, 읽은 책 제목. 선생님(그룹장·운영자)만. 학생이 쓴 문장·느낀 점은 주지 않는다.",
    inputSchema: obj({ groupId: groupIdProp, room: { type: "string", description: "학년-반 (예: 3-1). 생략하면 전체" } }, ["groupId"]),
    readOnly: true,
    run: listStudents,
  },
  {
    name: "search_books",
    description: "책 검색 (카카오·구글 북스). add_book_record에 넘길 제목·저자·ISBN을 찾을 때 쓴다.",
    inputSchema: obj({ query: { type: "string", description: "제목·저자·ISBN" } }, ["query"]),
    readOnly: true,
    run: searchBookTool,
  },
  {
    name: "add_book_record",
    description:
      "내 독서 기록 등록. groupIds를 생략하면 개인 책장에 넣는다. 완독(DONE)이면 stars가 필요하다. 날짜를 생략하면 독서중은 시작일, 완독은 완독일이 오늘. 사용자가 원할 때만 호출할 것.",
    inputSchema: obj(
      {
        title: { type: "string" },
        author: { type: "string" },
        isbn: { type: "string", description: "search_books 결과의 ISBN (있으면 같은 책끼리 랭킹이 묶인다)" },
        publisher: { type: "string" },
        thumbnailUrl: { type: "string" },
        link: { type: "string" },
        price: { type: "number" },
        status: statusProp,
        stars: { type: "number", description: "별점 0~5, 0.5 단위" },
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
        memorableQuote: { type: "string", description: "기억에 남는 문장" },
        review: { type: "string", description: "읽고 느낀 점" },
        isPrivate: { type: "boolean", description: "문장·느낀 점을 나만 보기" },
        notesToAdmin: { type: "boolean", description: "비공개여도 그룹장·운영자(선생님)에게는 보여주기" },
        groupIds: { type: "array", items: { type: "string" }, description: "기록할 그룹들 (생략하면 개인 책장)" },
      },
      ["title", "author"]
    ),
    readOnly: false,
    run: addBookRecord,
  },
  {
    name: "set_record_status",
    description: "내 기록의 상태 바꾸기(독서 시작·완독 등)와 별점 매기기. 사용자가 원할 때만 호출할 것.",
    inputSchema: obj(
      {
        recordId: { type: "string", description: "get_my_shelf로 얻은 recordId" },
        status: statusProp,
        stars: { type: "number", description: "별점 0~5, 0.5 단위 (완독할 때)" },
      },
      ["recordId", "status"]
    ),
    readOnly: false,
    run: setRecordStatus,
  },
];
