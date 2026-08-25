import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { isExpired } from "@/lib/group-expiry";
import { SubmitButton } from "@/components/SubmitButton";
import { InAppBrowserGuard } from "@/components/InAppBrowserGuard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true, classroomMode: true, iconVersion: true },
  });
  if (!group || !group.classroomMode) return {};
  const title = `『${group.name}』 반 입장 — BookKing`;
  const description = "별명으로 우리 반 독서장에 들어가요 📚";
  const images = group.iconVersion
    ? [{ url: `/api/group-icon/${group.id}?v=${group.iconVersion}`, width: 256, height: 256, alt: group.name }]
    : undefined;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, ...(images ? { images } : {}) },
  };
}

/**
 * 학생 입장 — 두 단계로 진행한다.
 *  1단계: 별명만 입력
 *  2단계: 그 별명이 비밀번호를 정해뒀으면 개인 비밀번호를, 아직이면
 *         (본인 확인을 위해) 선생님이 알려준 반 비밀번호를 받는다.
 *         반 비밀번호를 통과하면 곧바로 개인 비밀번호를 정하는 화면으로 간다.
 */
export default async function ClassEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ nick?: string; error?: string }>;
}) {
  const { code } = await params;
  const { nick, error } = await searchParams;

  // 이미 로그인돼 있으면 홈으로
  const session = await auth();
  if (session?.user?.id) redirect("/");

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true, classroomMode: true, joinPassword: true, expiresAt: true },
  });

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="center-page">
      <div className="logo" style={{ fontSize: 26, fontWeight: 900 }}>
        📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
      </div>
      <p className="mini" style={{ margin: "4px 0 20px" }}>우리 반 독서장</p>
      <InAppBrowserGuard />
      <div className="card">{children}</div>
      <p className="mini" style={{ marginTop: 14 }}>
        별명으로만 활동해요 · <Link href="/privacy" style={{ textDecoration: "underline" }}>개인정보 처리방침</Link>
      </p>
    </div>
  );

  if (!group || !group.classroomMode) {
    return (
      <Shell>
        <p style={{ margin: 0, fontWeight: 800 }}>😢 유효하지 않은 입장 링크예요</p>
        <p className="mini" style={{ margin: "6px 0 0" }}>선생님께 정확한 링크를 다시 받아주세요.</p>
      </Shell>
    );
  }
  if (isExpired(group)) {
    return (
      <Shell>
        <p style={{ margin: 0, fontWeight: 800 }}>🗓 활동이 끝난 반이에요</p>
        <p className="mini" style={{ margin: "6px 0 0" }}>
          『{group.name}』은 만료일이 지나 기록이 모두 정리됐어요. 그동안 함께 읽어줘서 고마워요! 📚
        </p>
      </Shell>
    );
  }
  if (!group.joinPassword) {
    return (
      <Shell>
        <p style={{ margin: 0, fontWeight: 800 }}>🔒 아직 입장 준비 중이에요</p>
        <p className="mini" style={{ margin: "6px 0 0" }}>선생님이 비밀번호를 설정하면 입장할 수 있어요.</p>
      </Shell>
    );
  }

  // ── 1단계: 별명 입력 ──────────────────────────────
  const nickname = (nick ?? "").trim();
  if (!nickname) {
    return (
      <Shell>
        <p style={{ margin: "0 0 4px", fontSize: 15 }}>
          <b>『{group.name}』</b> 반에 들어가요 🏫
        </p>
        <p className="mini" style={{ margin: "0 0 14px" }}>
          선생님이 정해준 <b>내 별명</b>을 입력하세요.
        </p>
        {error === "nonick" && (
          <div className="toast err" style={{ marginBottom: 12 }}>
            명렬에 없는 별명이에요. 선생님께 확인해주세요.
          </div>
        )}
        <form
          action={async (formData: FormData) => {
            "use server";
            const typed = String(formData.get("nickname") ?? "").trim();
            if (!typed) redirect(`/class/${code}`);
            redirect(`/class/${code}?nick=${encodeURIComponent(typed)}`);
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <input className="input" name="nickname" placeholder="내 별명" required autoFocus />
            <SubmitButton className="btn pri" pendingText="확인 중…">
              <span style={{ width: "100%", textAlign: "center" }}>다음</span>
            </SubmitButton>
          </div>
        </form>
      </Shell>
    );
  }

  // ── 2단계: 별명으로 상태를 판단 ────────────────────
  const candidates = await prisma.classroomStudent.findMany({
    where: { groupId: group.id, nickname },
    select: { id: true, classNo: true, password: true, claimedByUserId: true },
    orderBy: { classNo: "asc" },
  });

  if (candidates.length === 0) redirect(`/class/${code}?error=nonick`);

  const backLink = (
    <p className="mini" style={{ margin: "12px 0 0" }}>
      <Link href={`/class/${code}`} style={{ textDecoration: "underline" }}>
        ← 다른 별명으로 시작하기
      </Link>
    </p>
  );

  // 비밀번호를 이미 정한 학생이 있으면 개인 비밀번호로 들어온다
  const ready = candidates.filter((c) => c.password && c.claimedByUserId);
  if (ready.length > 0) {
    return (
      <Shell>
        <p style={{ margin: "0 0 4px", fontSize: 15 }}>
          🔑 <b>{nickname}</b>님, 비밀번호를 입력하세요
        </p>
        <p className="mini" style={{ margin: "0 0 14px" }}>처음 들어올 때 직접 정한 비밀번호예요.</p>
        {error === "pw" && (
          <div className="toast err" style={{ marginBottom: 12 }}>비밀번호가 맞지 않아요.</div>
        )}
        <form
          action={async (formData: FormData) => {
            "use server";
            const password = String(formData.get("password") ?? "");
            try {
              await signIn("classroom-name", { code, nickname, password, redirectTo: "/" });
            } catch (e) {
              if (e instanceof AuthError) {
                redirect(`/class/${code}?nick=${encodeURIComponent(nickname)}&error=pw`);
              }
              throw e;
            }
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <input className="input" name="password" type="password" placeholder="내 비밀번호" required autoFocus />
            <SubmitButton className="btn pri" pendingText="들어가는 중… 🎉">
              <span style={{ width: "100%", textAlign: "center" }}>들어가기</span>
            </SubmitButton>
          </div>
        </form>
        <p className="mini" style={{ margin: "12px 0 0" }}>
          💡 비밀번호를 잊었다면 선생님께 말씀드리세요. 초기화해주시면 다시 정할 수 있어요.
        </p>
        {backLink}
      </Shell>
    );
  }

  // 아직 비밀번호가 없는 학생 — 본인 확인을 위해 반 비밀번호를 한 번 받는다
  const single = candidates.length === 1 ? candidates[0] : null;
  return (
    <Shell>
      <p style={{ margin: "0 0 4px", fontSize: 15 }}>
        👋 <b>{nickname}</b>님, 처음이시군요!
      </p>
      <p className="mini" style={{ margin: "0 0 14px" }}>
        선생님이 알려준 <b>반 비밀번호</b>를 한 번만 확인할게요. 그다음 <b>내 비밀번호</b>를 정하면 끝이에요.
      </p>
      {error === "first" && (
        <div className="toast err" style={{ marginBottom: 12 }}>
          {single ? "반 비밀번호가 맞지 않아요." : "반번호나 반 비밀번호가 맞지 않아요."}
        </div>
      )}
      <form
        action={async (formData: FormData) => {
          "use server";
          const classNo = String(formData.get("classNo") ?? "").trim();
          const password = String(formData.get("password") ?? "");
          try {
            await signIn("classroom", { code, classNo, password, redirectTo: "/" });
          } catch (e) {
            if (e instanceof AuthError) {
              redirect(`/class/${code}?nick=${encodeURIComponent(nickname)}&error=first`);
            }
            throw e;
          }
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          {single ? (
            <input type="hidden" name="classNo" value={single.classNo} />
          ) : (
            // 같은 별명이 여러 명이면 반번호로 누구인지 확인한다
            <input className="input" name="classNo" placeholder="내 반번호" required autoFocus />
          )}
          <input
            className="input"
            name="password"
            type="password"
            placeholder="선생님이 알려준 반 비밀번호"
            required
            autoFocus={Boolean(single)}
          />
          <SubmitButton className="btn pri" pendingText="확인 중…">
            <span style={{ width: "100%", textAlign: "center" }}>확인하고 비밀번호 정하기</span>
          </SubmitButton>
        </div>
      </form>
      {backLink}
    </Shell>
  );
}
