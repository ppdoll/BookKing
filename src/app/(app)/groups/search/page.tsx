import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, getMemberships } from "@/lib/session";
import { fmtDate } from "@/lib/format";
import { joinPublicGroup } from "@/lib/actions/group-actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function GroupSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; welcome?: string; error?: string; applied?: string }>;
}) {
  const { q = "", welcome, error, applied } = await searchParams;
  const user = await requireUser("/groups/search");
  const memberships = await getMemberships(user.id);
  const myGroupIds = new Set(memberships.map((m) => m.groupId));
  const myPendingJoins = new Set(
    (
      await prisma.groupJoinRequest.findMany({
        where: { userId: user.id, status: "PENDING" },
        select: { groupId: true },
      })
    ).map((r) => r.groupId)
  );

  const query = q.trim();
  const groups = await prisma.group.findMany({
    where: {
      searchable: true,
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    include: {
      owner: { select: { name: true } },
      _count: { select: { members: true, records: { where: { deletedAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="page-h">
        <h1>👥 그룹 찾기</h1>
        <span className="mini">공개 그룹을 검색하고 바로 가입해보세요</span>
      </div>

      {error && <div className="toast err">{error}</div>}
      {applied && <div className="toast">🙋 가입 신청이 접수됐어요! 그룹장·운영자가 승인하면 자동으로 그룹에 들어가요.</div>}
      {welcome && (
        <div className="card" style={{ background: "var(--mint-soft)", marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>🌱 BookKing에 오신 걸 환영해요!</p>
          <p className="mini" style={{ margin: "6px 0 0" }}>
            아래에서 공개 그룹을 찾아 가입하거나,{" "}
            <Link href="/groups/new" style={{ textDecoration: "underline", fontWeight: 700 }}>나만의 그룹을 만들어</Link>{" "}
            시작해보세요. 초대 링크를 받았다면 그 링크로 바로 가입할 수 있어요.
          </p>
        </div>
      )}

      <form method="GET" action="/groups/search" className="fieldrow" style={{ marginBottom: 16 }}>
        <input className="input" name="q" defaultValue={q} placeholder="그룹 이름으로 검색" style={{ flex: 1 }} />
        <button type="submit" className="btn pri">🔍 검색</button>
      </form>

      {groups.length === 0 ? (
        <div className="emptybox">
          {query ? (
            <>“{query}” 이름의 공개 그룹을 못 찾았어요.<br />그룹 이름을 다시 확인하거나, 초대 링크로 가입해보세요.</>
          ) : (
            <>아직 공개된 그룹이 없어요.<br />그룹장이 👑 그룹 관리에서 &ldquo;외부 검색 허용&rdquo;을 켜면 여기에 나타나요.</>
          )}
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="card" style={{ marginBottom: 10 }}>
            <div className="fieldrow" style={{ gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 15 }}>{g.name}</b>{" "}
                {g.readOnly && <span className="pill p-ghost">👀 보기 전용</span>}{" "}
                {g.joinApproval && <span className="pill p-wish">🙋 승인제</span>}
                <p className="mini" style={{ margin: "3px 0 0" }}>
                  👑 {g.owner.name} · 멤버 {g._count.members}명 · 기록 {g._count.records}개 · {fmtDate(g.createdAt)} 개설
                </p>
              </div>
              {myGroupIds.has(g.id) ? (
                <span className="pill p-read">가입됨 ✅</span>
              ) : myPendingJoins.has(g.id) ? (
                <span className="pill p-wish">⏳ 승인 대기 중</span>
              ) : (
                <form action={joinPublicGroup}>
                  <input type="hidden" name="groupId" value={g.id} />
                  <SubmitButton className="btn pri" pendingText={g.joinApproval ? "신청 중…" : "가입 중…"}>
                    {g.joinApproval ? "가입 신청" : "가입하기"}
                  </SubmitButton>
                </form>
              )}
            </div>
          </div>
        ))
      )}

      <p className="mini" style={{ marginTop: 16 }}>
        🔒 검색을 허용한 그룹만 나와요. 비공개 그룹은 초대 링크로만 가입할 수 있어요.
      </p>
    </div>
  );
}
