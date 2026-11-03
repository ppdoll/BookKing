/**
 * 반번호로 학년·반 알아내기 — 학교 전체(또는 한 학년 전체)를 학교 모드 그룹 하나로 운영할 때,
 * 그룹을 쪼개지 않고 반번호에서 학년·반을 읽어 랭킹·대시보드를 나눈다.
 *
 * 형식: 학년 1자리 + 반 2자리 + 번호 2자리 (예: 30107 = 3학년 1반 7번)
 * 명렬 대부분이 이 형식일 때만 나누고, 아니면 지금처럼 한 반으로 본다.
 */
export type RoomKey = { grade: number; room: number };

/** "30107" → { grade: 3, room: 1 }. 형식이 아니면 null */
export function parseClassNo(classNo: string): RoomKey | null {
  const m = /^(\d)(\d{2})(\d{2})$/.exec(classNo.trim());
  if (!m) return null;
  const grade = Number(m[1]);
  const room = Number(m[2]);
  if (grade < 1 || room < 1) return null;
  return { grade, room };
}

export const roomId = (k: RoomKey) => `${k.grade}-${k.room}`;
export const roomLabel = (k: RoomKey) => `${k.grade}학년 ${k.room}반`;
/** 순위표처럼 좁은 곳에 쓰는 짧은 이름 — "3-1" */
export const roomShort = (k: RoomKey) => `${k.grade}-${k.room}`;

export function parseRoomId(id: string | undefined | null): RoomKey | null {
  const m = /^(\d+)-(\d+)$/.exec(id ?? "");
  return m ? { grade: Number(m[1]), room: Number(m[2]) } : null;
}

export const sameRoom = (a: RoomKey | null | undefined, b: RoomKey | null | undefined) =>
  Boolean(a && b && a.grade === b.grade && a.room === b.room);

export type RoomLayout = {
  /** 학년 목록 (오름차순) */
  grades: number[];
  /** 모든 반 (학년·반 오름차순) */
  rooms: RoomKey[];
  /** 형식에 맞지 않아 반을 알 수 없는 학생 수 — 관리 화면에서 고치도록 알려준다 */
  unmatched: number;
};

/**
 * 명렬의 반번호로 반 구성을 알아낸다.
 * 90% 이상이 형식에 맞고 반이 둘 이상이어야 나눈다 — 반이 하나뿐이면 지금처럼 보여주면 된다.
 */
export function detectRoomLayout(classNos: string[]): RoomLayout | null {
  if (classNos.length === 0) return null;
  const parsed = classNos.map(parseClassNo);
  const matched = parsed.filter((p): p is RoomKey => p !== null);
  if (matched.length / classNos.length < 0.9) return null;

  const byId = new Map<string, RoomKey>();
  for (const k of matched) byId.set(roomId(k), k);
  if (byId.size < 2) return null;

  const rooms = [...byId.values()].sort((a, b) => a.grade - b.grade || a.room - b.room);
  const grades = [...new Set(rooms.map((r) => r.grade))];
  return { grades, rooms, unmatched: classNos.length - matched.length };
}
