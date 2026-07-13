import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, googleEnabled, devLoginEnabled } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: nextRaw, error } = await searchParams;
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/";

  const session = await auth();
  if (session?.user?.id) redirect(next);

  return (
    <div className="center-page">
      <div className="logo" style={{ fontSize: 28, fontWeight: 900 }}>
        📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
      </div>
      <p className="mini" style={{ margin: "4px 0 22px" }}>함께 읽고, 함께 기록하는 그룹 독서장</p>

      {error && (
        <div className="toast err">로그인에 실패했어요. 다시 시도해주세요.</div>
      )}

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
      <p className="mini" style={{ marginTop: 14 }}>
        <a href="/manual.html" style={{ textDecoration: "underline" }}>❓ BookKing 사용 설명서 보기</a>
      </p>
    </div>
  );
}
