import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { joinGroup } from "@/lib/actions/group-actions";
import { fmtDateFull } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";
import { InAppBrowserGuard } from "@/components/InAppBrowserGuard";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ expired?: string }>;
}) {
  const { code } = await params;
  const { expired } = await searchParams;

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: { owner: { select: { name: true } }, members: { select: { userId: true } } },
  });

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

  // 이름 미등록이면 먼저 이름부터
  if (user && !user.name) redirect(`/welcome?next=${encodeURIComponent(`/join/${code}`)}`);

  const isExpired = group ? group.inviteExpiresAt < new Date() : false;
  const alreadyMember = Boolean(group && userId && group.members.some((m) => m.userId === userId));

  return (
    <div className="center-page">
      <div className="logo" style={{ fontSize: 26, fontWeight: 900 }}>
        📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
      </div>
      <p className="mini" style={{ margin: "4px 0 20px" }}>함께 읽고, 함께 기록하는 그룹 독서장</p>

      <InAppBrowserGuard />

      <div className="card">
        {!group ? (
          <>
            <p style={{ margin: 0, fontWeight: 800 }}>😢 유효하지 않은 초대 링크예요</p>
            <p className="mini" style={{ margin: "6px 0 0" }}>링크가 재발급되었을 수 있어요. 그룹장에게 새 링크를 요청해주세요.</p>
          </>
        ) : isExpired || expired ? (
          <>
            <p style={{ margin: 0, fontWeight: 800 }}>⏰ 초대 링크가 만료됐어요</p>
            <p className="mini" style={{ margin: "6px 0 0" }}>
              『{group.name}』 그룹장에게 새 초대 링크를 요청해주세요. (링크는 발급 후 7일간 유효)
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 4px", fontSize: 15 }}>
              <b>『{group.name}』</b> 그룹에 초대받았어요 🎉
            </p>
            <p className="mini" style={{ margin: "0 0 14px" }}>
              그룹장: {group.owner.name ?? "이름없음"} · 링크 유효기간: {fmtDateFull(group.inviteExpiresAt)}까지
            </p>
            {!userId ? (
              <Link href={`/login?next=${encodeURIComponent(`/join/${code}`)}`} className="btn pri" style={{ width: "100%", justifyContent: "center", padding: 11 }}>
                로그인하고 가입하기
              </Link>
            ) : alreadyMember ? (
              <>
                <p className="mini" style={{ margin: "0 0 10px" }}>이미 이 그룹의 멤버예요!</p>
                <Link href="/" className="btn pri" style={{ width: "100%", justifyContent: "center" }}>홈으로 가기</Link>
              </>
            ) : (
              <form action={joinGroup}>
                <input type="hidden" name="code" value={code} />
                <SubmitButton className="btn pri" pendingText="가입하는 중… 🎉">
                  <span style={{ width: "100%", textAlign: "center" }}>{user?.name}(으)로 가입하기</span>
                </SubmitButton>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
