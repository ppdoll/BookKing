import Link from "next/link";
import { getBookRankings, getTopReaders } from "@/lib/rankings";
import { RANKING_MIN_READERS } from "@/lib/constants";
import { Stars } from "@/components/Stars";

const MEDALS = ["🥇", "🥈", "🥉"];
const ANIMALS = ["🦉", "🐿️", "🦔", "🐰", "🦊"];

/** 우측 랭킹 사이드바 — rt: group|all, rb: rating|count (링크 탭, JS 불필요) */
export async function RankingSidebar({
  groupId,
  rt,
  rb,
}: {
  groupId: string;
  rt: string;
  rb: string;
}) {
  const scope = rt === "all" ? "all" : "group";
  const by = rb === "count" ? "count" : "rating";
  const [books, readers] = await Promise.all([
    getBookRankings(scope === "all" ? null : groupId, by),
    scope === "group" ? getTopReaders(groupId, new Date().getFullYear()) : Promise.resolve([]),
  ]);

  const tab = (nrt: string, nrb: string) => `/?rt=${nrt}&rb=${nrb}`;

  return (
    <aside className="card">
      <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>🏅 랭킹</h3>
      <div className="rank-tabs">
        <Link href={tab("group", by)} className={scope === "group" ? "on" : ""}>우리 그룹</Link>
        <Link href={tab("all", by)} className={scope === "all" ? "on" : ""}>통합</Link>
      </div>
      <p style={{ fontSize: 12.5, fontWeight: 800, margin: "12px 0 6px" }}>📚 책 랭킹</p>
      <div className="rank-tabs">
        <Link href={tab(scope, "rating")} className={by === "rating" ? "on" : ""}>별점 순</Link>
        <Link href={tab(scope, "count")} className={by === "count" ? "on" : ""}>많이 읽은 순</Link>
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

      {scope === "group" && (
        <>
          <p style={{ fontSize: 12.5, fontWeight: 800, margin: "16px 0 4px" }}>
            👑 독서왕 <span className="mini">올해 완독 수</span>
          </p>
          {readers.length === 0 ? (
            <p className="mini" style={{ margin: "4px 0 0" }}>올해 완독한 그룹원이 아직 없어요.</p>
          ) : (
            readers.map((r, i) => (
              <div className="rankrow" key={r.userId}>
                <span className="rankno">{MEDALS[i] ?? i + 1}</span>
                <span className="avatar">{ANIMALS[i % ANIMALS.length]}</span>
                <div className="grow">
                  <b>{r.name}</b>
                  <span className="mini">{r.doneCount}권 완독</span>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </aside>
  );
}
