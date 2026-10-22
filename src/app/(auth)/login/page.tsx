import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, googleEnabled, devLoginEnabled } from "@/auth";
import { prisma } from "@/lib/db";
import { InAppBrowserGuard } from "@/components/InAppBrowserGuard";
import { HelpLink } from "@/components/HelpLink";
import { HELP } from "@/lib/help";

/**
 * 로그인 오류 안내. Auth.js는 오류 종류를 ?error= 로 넘겨준다
 * (pages.signIn·pages.error 둘 다 이 페이지 — src/auth.ts).
 * 화면에 이름 그대로 오는 건 일부뿐이고 나머지는 전부 "Configuration"으로 온다.
 */
function loginErrorMessage(error: string): { title: string; sub: string } {
  switch (error) {
    case "AccessDenied":
      return {
        title: "구글 계정으로 들어가는 게 허락되지 않았어요",
        sub: "학교 구글 계정이라면 학교에서 바깥 서비스 로그인을 막아 뒀을 수 있어요. 개인 구글(gmail) 계정으로 다시 시도해 보세요.",
      };
    case "OAuthCallbackError":
      return {
        title: "구글 로그인이 중간에 끊겼어요",
        sub: "다시 시도해 주세요. 카카오톡 같은 앱 안에서 열었다면 크롬·사파리로 열어 주세요.",
      };
    case "OAuthAccountNotLinked":
    case "AccountNotLinked":
      return {
        title: "이미 다른 방법으로 가입된 이메일이에요",
        sub: "처음 가입할 때 썼던 방법으로 로그인해 주세요.",
      };
    case "MissingCSRF":
      return {
        title: "로그인 화면이 너무 오래 열려 있었어요",
        sub: "새로고침한 뒤 다시 시도해 주세요.",
      };
    case "Configuration":
      return {
        title: "지금 로그인 기능에 문제가 있어요",
        sub: "여러분 잘못이 아니에요. 잠시 뒤 다시 시도해 주세요. 계속되면 도움말에 있는 연락처로 알려 주세요.",
      };
    default:
      return { title: "로그인에 실패했어요", sub: "다시 시도해 주세요." };
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: nextRaw, error } = await searchParams;
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/";

  // 세션이 있어도 실제 유저가 존재할 때만 통과 —
  // 삭제된 계정의 세션 쿠키가 남아 있으면 / <-> /login 무한 리다이렉트가 되기 때문
  const session = await auth();
  if (session?.user?.id) {
    const exists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (exists) redirect(next);
  }

  return (
    <div className="center-page">
      <h1 className="logo" style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
        📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em> — 함께 쓰는 독서록·독서장
      </h1>
      <p className="mini" style={{ margin: "4px 0 22px" }}>가족·친구·학급이 함께 쓰는 무료 온라인 독서록 · 독서장</p>

      {error && (() => {
        const m = loginErrorMessage(error);
        return (
          <div className="toast err" style={{ textAlign: "left" }}>
            {m.title}
            <span className="toast-sub">{m.sub}</span>
            <HelpLink to={HELP.google} />
          </div>
        );
      })()}

      <InAppBrowserGuard />

      <div className="card">
        {googleEnabled ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: next });
            }}
          >
            <button type="submit" className="btn pri" style={{ width: "100%", justifyContent: "center", padding: 11 }}>
              G&nbsp;&nbsp;Google 계정으로 계속하기
            </button>
          </form>
        ) : (
          <p className="mini" style={{ margin: 0 }}>
            ⚠️ Google 로그인이 아직 설정되지 않았어요.
            <br />
            .env의 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET을 채우면 버튼이 나타나요.
          </p>
        )}

        {devLoginEnabled && (
          <form
            action={async (formData: FormData) => {
              "use server";
              const nickname = String(formData.get("nickname") ?? "").trim();
              try {
                await signIn("dev", { nickname, redirectTo: next });
              } catch (e) {
                if (e instanceof AuthError) {
                  redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
                }
                throw e;
              }
            }}
            style={{ marginTop: 16, borderTop: "2px dashed var(--soft-line)", paddingTop: 14 }}
          >
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800 }}>
              🛠 게스트 로그인 <span className="mini">(개발용 — 배포 시 꺼짐)</span>
            </p>
            <div className="fieldrow">
              <input className="input" name="nickname" placeholder="닉네임 입력" style={{ flex: 1 }} required />
              <button type="submit" className="btn">입장</button>
            </div>
          </form>
        )}
      </div>

      {/*
        홈 화면에 추가해 둔 아이콘이나 사이트 주소로 들어온 학생은 로그아웃되면 이 화면에 닿는다.
        구글 버튼만 보이면 학생은 자기가 어디로 가야 하는지 알 수 없다.
      */}
      <div className="card" style={{ marginTop: 12, background: "var(--mint-soft)" }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>🎒 학생인가요?</p>
        <p className="mini" style={{ margin: "4px 0 0", color: "var(--ink)" }}>
          구글 로그인은 필요 없어요. 선생님이 준 <b>우리 반 입장 링크(QR)</b>로 들어가요.
        </p>
        <HelpLink to={HELP.loggedOut}>🙋 입장 링크가 없어요</HelpLink>
      </div>

      <p className="mini" style={{ marginTop: 14 }}>
        <a href="/help" style={{ textDecoration: "underline" }}>🙋 로그인이 안 될 때</a>
        {" · "}
        <a href="/manual.html" style={{ textDecoration: "underline" }}>❓ BookKing 사용 설명서 보기</a>
        {" · "}
        <a href="/tips" style={{ textDecoration: "underline" }}>📖 독서록 쓰는 법</a>
      </p>

      <section style={{ marginTop: 28, textAlign: "left", maxWidth: 420 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>BookKing은 이런 서비스예요</h2>
        <ul className="mini" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
          <li><b>함께 쓰는 독서록</b> — 가족·친구·학급·독서모임끼리 그룹을 만들어 읽은 책을 각자 독서장에 기록해요</li>
          <li><b>읽을 예정 → 독서중 → 완독</b> 3단계 관리와 별점·기억에 남는 문장·감상 기록</li>
          <li><b>독서왕·인기 책 랭킹</b>으로 그룹원과 소소하게 겨루는 재미</li>
          <li><b>나만의 독서 결산 카드</b>를 만들어 카톡·SNS로 공유</li>
          <li>구글 로그인 한 번이면 시작, 앱 설치 없이 홈 화면에 추가 가능 (무료)</li>
        </ul>
        <p className="mini" style={{ marginTop: 12 }}>
          온라인 독서록, 학급 독서장 관리, 독서모임 기록을 한 곳에서 — 지금 무료로 시작해보세요.
        </p>
      </section>
    </div>
  );
}
