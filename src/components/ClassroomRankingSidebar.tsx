import Link from "next/link";
import { RANKING_MIN_READERS } from "@/lib/constants";
import { roomShort, roomLabel, sameRoom, type RoomKey } from "@/lib/class-no";
import {
  roomStandings, readerStandings, scopedBookRankings,
  type ClassroomRankingData, type RankScope,
} from "@/lib/class-rankings";
import { Stars } from "@/components/Stars";

const MEDALS = ["🥇", "🥈", "🥉"];
const ANIMALS = ["🦉", "🐿️", "🦔", "🐰", "🦊"];

type Tab = { rt: string; label: string; scope: RankScope };

/**
 * 반번호로 나뉘는 학교 모드 그룹의 랭킹 (C안) — RankingSidebar가 명렬로 반을 알아낼 수 있을 때 대신 그린다.
 * - 우리 반: 개인 순위(독서왕)
 * - 우리 학년·우리 학교: 반 대항(1인 평균 완독) + 개인 상위 10명
 * 학생은 우리 반 / 우리 학년 / 우리 학교, 관리자(반이 없음)는 학교 전체 / 학년별로 본다.
 */
export function ClassroomRankingSidebar({
  data,
  viewerId,
  rt,
  rb,
}: {
  data: ClassroomRankingData;
  viewerId: string;
  rt: string;
  rb: string;
}) {
  const by = rb === "count" ? "count" : "rating";
  const me = data.students.get(viewerId)?.room ?? null;
  const multiGrade = data.layout.grades.length > 1;
  const roomsIn = (g: number) => data.layout.rooms.filter((r) => r.grade === g).length;

  const tabs: Tab[] = [];
  if (me) {
    tabs.push({ rt: "room", label: "우리 반", scope: { kind: "room", room: me } });
    if (roomsIn(me.grade) > 1) tabs.push({ rt: "grade", label: "우리 학년", scope: { kind: "grade", grade: me.grade } });
    if (multiGrade) tabs.push({ rt: "school", label: "우리 학교", scope: { kind: "school" } });
  } else if (multiGrade) {
    tabs.push({ rt: "school", label: "학교 전체", scope: { kind: "school" } });
    for (const g of data.layout.grades) tabs.push({ rt: `grade-${g}`, label: `${g}학년`, scope: { kind: "grade", grade: g } });
  } else {
    const g = data.layout.grades[0];
    tabs.push({ rt: `grade-${g}`, label: `${g}학년 전체`, scope: { kind: "grade", grade: g } });
  }
  const active = tabs.find((t) => t.rt === rt) ?? tabs[0];
  const scope = active.scope;
  const isRoom = scope.kind === "room";
  const href = (nrt: string, nrb: string) => `/?rt=${nrt}&rb=${nrb}`;

  // 반 대항 — 완독이 있는 반만 상위 5개(0권끼리 공동 1위·🥉가 되지 않게), 우리 반이 그 밖이면 맨 아래에 따로
  const standings = isRoom ? [] : roomStandings(data, scope);
  const topRooms = standings.filter((s) => s.done > 0).slice(0, 5);
  const myRoom = standings.find((s) => sameRoom(s.room, me));
  const showMyRoom = myRoom && topRooms.length > 0 && !topRooms.includes(myRoom);

  // 개인 — 우리 반은 5명, 학년·학교는 10명까지 별명을 보여주고, 내가 그 밖이면 내 순위만 따로
  const readers = readerStandings(data, scope);
  const topReaders = readers.slice(0, isRoom ? 5 : 10);
  const myRank = readers.findIndex((r) => r.userId === viewerId);
  // 학년 안에서는 "3반", 학교 전체에서는 "3-1"처럼 반을 덧붙인다
  const roomTag = (room: RoomKey) => (scope.kind === "grade" ? ` · ${room.room}반` : scope.kind === "school" ? ` · ${roomShort(room)}` : "");

  const books = scopedBookRankings(data, scope, by);

  return (
    <aside className="card">
      <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>🏅 랭킹</h3>
      {tabs.length > 1 && (
        <div className="rank-tabs">
          {tabs.map((t) => (
            <Link key={t.rt} href={href(t.rt, by)} className={t.rt === active.rt ? "on" : ""}>
              {t.label}
            </Link>
          ))}
        </div>
      )}

      {!isRoom && (
        <>
          <p style={{ fontSize: 12.5, fontWeight: 800, margin: "12px 0 4px" }}>
            🏫 반 대항 <span className="mini">1인 평균 완독 (올해)</span>
          </p>
          {topRooms.length === 0 && (
            <p className="mini" style={{ margin: "4px 0 0" }}>
              올해 완독한 반이 아직 없어요.{me ? " 첫 완독으로 우리 반을 올려 보세요!" : ""}
            </p>
          )}
          {topRooms.map((s) => (
            <div className={`rankrow${sameRoom(s.room, me) ? " mine" : ""}`} key={roomShort(s.room)}>
              <span className="rankno">{MEDALS[s.rank - 1] ?? s.rank}</span>
              <div className="grow">
                <b>
                  {roomLabel(s.room)}
                  {sameRoom(s.room, me) && " (우리 반)"}
                </b>
                <span className="mini">
                  1인 {s.avg}권 · 완독 {s.done}권 · {s.roster}명
                </span>
              </div>
            </div>
          ))}
          {showMyRoom && (
            <div className="rankrow mine">
              <span className="rankno">{myRoom.done > 0 ? myRoom.rank : "–"}</span>
              <div className="grow">
                <b>{roomLabel(myRoom.room)} (우리 반)</b>
                <span className="mini">
                  {myRoom.done > 0
                    ? `1인 ${myRoom.avg}권 · 완독 ${myRoom.done}권 · ${myRoom.roster}명`
                    : `아직 완독 0권 · ${myRoom.roster}명`}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 12.5, fontWeight: 800, margin: isRoom ? "12px 0 4px" : "16px 0 4px" }}>
        👑 {isRoom ? "우리 반 독서왕" : "개인 상위 10명"} <span className="mini">올해 완독 수</span>
      </p>
      {topReaders.length === 0 ? (
        <p className="mini" style={{ margin: "4px 0 0" }}>올해 완독한 학생이 아직 없어요.</p>
      ) : (
        topReaders.map((r, i) => (
          <div className={`rankrow${r.userId === viewerId ? " mine" : ""}`} key={r.userId}>
            <span className="rankno">{MEDALS[r.rank - 1] ?? r.rank}</span>
            <span className="avatar">{ANIMALS[i % ANIMALS.length]}</span>
            <div className="grow">
              <b>
                {r.nickname}
                {r.userId === viewerId && " (나)"}
              </b>
              <span className="mini">
                {r.doneCount}권 완독{roomTag(r.room)}
              </span>
            </div>
          </div>
        ))
      )}
      {myRank >= topReaders.length && (
        <div className="rankrow mine">
          <span className="rankno">{readers[myRank].rank}</span>
          <span className="avatar">📖</span>
          <div className="grow">
            <b>{readers[myRank].nickname} (나)</b>
            <span className="mini">{readers[myRank].doneCount}권 완독</span>
          </div>
        </div>
      )}

      <p style={{ fontSize: 12.5, fontWeight: 800, margin: "16px 0 6px" }}>📚 책 랭킹</p>
      <div className="rank-tabs">
        <Link href={href(active.rt, "rating")} className={by === "rating" ? "on" : ""}>별점 순</Link>
        <Link href={href(active.rt, "count")} className={by === "count" ? "on" : ""}>많이 읽은 순</Link>
      </div>
      {books.length === 0 ? (
        <p className="mini" style={{ margin: "8px 0" }}>
          아직 랭킹에 오른 책이 없어요. {RANKING_MIN_READERS}명 이상 완독하면 올라와요!
        </p>
      ) : (
        books.map((b, i) => (
          <div className="rankrow" key={b.bookId}>
            <span className="rankno">{i + 1}</span>
            <span className="cover">
              {b.thumbnailUrl ? <img src={b.thumbnailUrl} alt="" /> : <span className="bk">📕</span>}
            </span>
            <div className="grow">
              <b>{b.title}</b>
              <span className="mini">
                <Stars rating={Math.round(b.avgStars * 2)} size={11} /> {b.avgStars} · {b.readerCount}명 완독
              </span>
            </div>
          </div>
        ))
      )}
      <p className="mini" style={{ margin: "6px 0 0" }}>
        {RANKING_MIN_READERS}명 이상 완독한 책만 올라와요
      </p>
    </aside>
  );
}
