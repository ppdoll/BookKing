import Link from "next/link";
import { headers } from "next/headers";
import { requireUser, getMemberships } from "@/lib/session";
import { getWrappedStats, getCardState } from "@/lib/wrapped";
import { setWrappedPublic, toggleWrappedGroup } from "@/lib/actions/wrapped-actions";
import { WrappedCard } from "@/components/WrappedCard";
import { SubmitButton } from "@/components/SubmitButton";
import { CopyButton } from "@/components/CopyButton";

export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearRaw } = await searchParams;
  const user = await requireUser("/wrapped");

  const thisYear = new Date().getFullYear();
  const year =
    yearRaw && /^\d{4}$/.test(yearRaw) ? Math.min(thisYear, Math.max(2000, Number(yearRaw))) : thisYear;

  const [stats, card, memberships] = await Promise.all([
    getWrappedStats(user.id, year),
    getCardState(user.id, year),
    getMemberships(user.id),
  ]);
  const sharedGroupIds = new Set((card?.groups ?? []).map((g) => g.groupId));
  const shareableGroups = memberships.filter((m) => !m.group.isPersonal);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const publicUrl = card?.publicSlug ? `${proto}://${host}/w/${card.publicSlug}` : null;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="page-h">
        <h1>🎉 독서 결산</h1>
        <span className="fieldrow" style={{ gap: 6 }}>
          {[thisYear, thisYear - 1].map((y) => (
            <Link key={y} href={`/wrapped?year=${y}`} className={`fchip ${y === year ? "on" : ""}`}>
              {y}
            </Link>
          ))}
        </span>
      </div>

      <WrappedCard stats={stats} />

      <section className="card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>🌐 전체 공개</h3>
        <p className="mini" style={{ margin: "0 0 10px" }}>
          공개 링크를 만들면 로그인 없이 누구나 볼 수 있어요. 카톡·인스타에 공유하기 좋아요.
        </p>
        {publicUrl ? (
          <>
            <div className="fieldrow" style={{ gap: 8 }}>
              <input className="input" readOnly value={publicUrl} style={{ flex: 1 }} aria-label="공개 링크" />
              <CopyButton text={publicUrl} />
            </div>
            <form action={setWrappedPublic} style={{ marginTop: 8 }}>
              <input type="hidden" name="year" value={year} />
              <input type="hidden" name="on" value="0" />
              <SubmitButton className="btn sm" pendingText="처리 중…">공개 중지</SubmitButton>
            </form>
          </>
        ) : (
          <form action={setWrappedPublic}>
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="on" value="1" />
            <SubmitButton className="btn pri" pendingText="만드는 중…">🔗 공개 링크 만들기</SubmitButton>
          </form>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>👥 그룹에 공유</h3>
        <p className="mini" style={{ margin: "0 0 10px" }}>
          선택한 그룹의 홈에 내 결산 카드가 표시돼요. 그룹원만 볼 수 있어요.
        </p>
        {shareableGroups.length === 0 ? (
          <p className="mini" style={{ margin: 0 }}>공유할 그룹이 없어요. (개인 책장은 혼자 쓰는 공간이라 제외돼요)</p>
        ) : (
          <div className="fieldrow" style={{ gap: 8 }}>
            {shareableGroups.map((m) => {
              const on = sharedGroupIds.has(m.groupId);
              return (
                <form action={toggleWrappedGroup} key={m.groupId}>
                  <input type="hidden" name="year" value={year} />
                  <input type="hidden" name="groupId" value={m.groupId} />
                  <SubmitButton className={`btn sm ${on ? "pri" : ""}`} pendingText="…">
                    {on ? `✓ ${m.group.name}` : m.group.name}
                  </SubmitButton>
                </form>
              );
            })}
          </div>
        )}
        {sharedGroupIds.size > 0 && (
          <p className="mini" style={{ margin: "8px 0 0" }}>✓ 표시된 그룹에 공유 중 — 다시 누르면 해제돼요.</p>
        )}
      </section>
    </div>
  );
}
