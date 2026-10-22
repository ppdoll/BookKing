import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { isExpired } from "@/lib/group-expiry";
import { SubmitButton } from "@/components/SubmitButton";
import { InAppBrowserGuard } from "@/components/InAppBrowserGuard";
import { HelpLink } from "@/components/HelpLink";
import { HELP } from "@/lib/help";

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
  searchParams: Promise<{ nick?: string; error?: string; tried?: string }>;
}) {
  const { code } = await params;
  const { nick, error, tried: triedRaw } = await searchParams;
  // 명단에 없다고 나온 별명 — 무엇을 쳤는지 보여주고 입력칸에 다시 채워 고치기 쉽게 한다
  const tried = (triedRaw ?? "").trim().slice(0, 30);

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
      <InAppBrowserGuard variant="class" />
      <div className="card">{children}</div>
      <p className="mini" style={{ marginTop: 14 }}>
        별명으로만 활동해요 · <Link href="/privacy" style={{ textDecoration: "underline" }}>개인정보 처리방침</Link>
      </p>
      {/*
        이 링크를 열면 어느 단계에서든 별명 입력만 요구받는다. 선생님이 학생용 링크를
        열어봤거나, 학부모·다른 계정 사용자가 들어온 경우 빠져나갈 길이 필요하다.
        (모든 상태 — 잘못된 링크·만료·준비중·별명·비밀번호 — 에서 보이도록 Shell에 둔다)
      */}
      <p className="err-actions" style={{ marginTop: 10, justifyContent: "center" }}>
        <Link href="/help" className="btn sm">🙋 들어가기가 어려워요</Link>
        <Link href="/login" className="btn sm">🔑 선생님·일반 계정으로 로그인</Link>
      </p>
    </div>
  );

  if (!group || !group.classroomMode) {
    return (
      <Shell>
        <p style={{ margin: 0, fontWeight: 800 }}>😢 유효하지 않은 입장 링크예요</p>
        <p className="mini" style={{ margin: "6px 0 0" }}>
          링크가 중간에 잘렸거나, 선생님이 새 링크로 바꾸셨을 수 있어요. 선생님께 새 링크(QR)를 받아 주세요.
        </p>
        <HelpLink to={HELP.link} />
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
        <HelpLink to={HELP.ended} />
      </Shell>
    );
  }
  if (!group.joinPassword) {
    return (
      <Shell>
        <p style={{ margin: 0, fontWeight: 800 }}>🔒 아직 입장 준비 중이에요</p>
        <p className="mini" style={{ margin: "6px 0 0" }}>
          선생님이 아직 반 비밀번호를 정하지 않으셨어요. 정해지면 바로 들어올 수 있어요.
        </p>
        <HelpLink to={HELP.notReady} />
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
            {tried ? <>「{tried}」(이)라는 별명은 우리 반 명단에 없어요.</> : <>우리 반 명단에 없는 별명이에요.</>}
            <span className="toast-sub">
              띄어쓰기와 받침을 확인해 보세요. 선생님이 번호를 별명으로 정해 주셨을 수도 있어요.
            </span>
            <HelpLink to={HELP.nickname} />
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
            <input className="input" name="nickname" placeholder="내 별명" defaultValue={tried} required autoFocus />
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

  if (candidates.length === 0) redirect(`/class/${code}?error=nonick&tried=${encodeURIComponent(nickname)}`);

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
          <div className="toast err" style={{ marginBottom: 12 }}>
            비밀번호가 맞지 않아요.
            <span className="toast-sub">
              자판이 한글로 쳐지고 있지 않은지, 대문자·소문자를 확인해 보세요. 반 비밀번호가 아니라 내가 정한
              비밀번호예요.
            </span>
            <HelpLink to={HELP.myPw}>🙋 비밀번호를 잊었어요</HelpLink>
          </div>
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
          💡 비밀번호를 잊었다면 선생님께 <b>비밀번호 초기화</b>를 부탁하세요. 내 기록은 그대로 남고, 새로 정할 수
          있어요. <HelpLink to={HELP.myPw}>자세히 보기</HelpLink>
        </p>
        {backLink}
      </Shell>
    );
  }

  // 아직 비밀번호가 없는 학생 — 본인 확인을 위해 반 비밀번호를 한 번 받는다
  const single = candidates.length === 1 ? candidates[0] : null;
  // 이미 들어와 본 적이 있는 학생인가 — 개인 비밀번호가 생기기 전에 입장한 경우다.
  // 이들에게 "처음이시군요"는 자기가 엉뚱한 곳에 온 줄 알게 만든다.
  const returning = candidates.some((c) => c.claimedByUserId);
  return (
    <Shell>
      <p style={{ margin: "0 0 4px", fontSize: 15 }}>
        {returning ? (
          <>🔄 <b>{nickname}</b>님, 다시 오셨군요!</>
        ) : (
          <>👋 <b>{nickname}</b>님, 처음이시군요!</>
        )}
      </p>
      <p className="mini" style={{ margin: "0 0 14px" }}>
        {returning ? (
          <>
            로그인 방법이 바뀌었어요. <b>반 비밀번호</b>를 한 번만 더 확인할게요.
            그다음 <b>내 비밀번호</b>를 정하면, 앞으로는 그것만으로 들어올 수 있어요.
          </>
        ) : (
          <>
            선생님이 알려준 <b>반 비밀번호</b>를 한 번만 확인할게요. 그다음 <b>내 비밀번호</b>를 정하면 끝이에요.
          </>
        )}
      </p>
      {error === "first" && (
        <div className="toast err" style={{ marginBottom: 12 }}>
          {single ? "반 비밀번호가 맞지 않아요." : "반번호나 반 비밀번호가 맞지 않아요."}
          <span className="toast-sub">
            반 비밀번호는 선생님이 수업 때 알려준, 우리 반이 다 같이 쓰는 비밀번호예요. 기억이 안 나면 선생님께
            다시 여쭤보세요.
          </span>
          <HelpLink to={HELP.classPw} />
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
