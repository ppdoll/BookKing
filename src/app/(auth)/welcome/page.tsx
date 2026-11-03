import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireSessionUser } from "@/lib/session";
import { updateName } from "@/lib/actions/user-actions";
import { googleEmail } from "@/lib/account";
import { GoogleAccount } from "@/components/GoogleAccount";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: nextRaw, error } = await searchParams;
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/";

  const user = await requireSessionUser();
  if (user.name) redirect(next);
  // 이름을 정하는 순간 이 계정에 개인 책장이 생긴다 — 그 전에 맞는 구글 계정인지 보여준다
  const acct = googleEmail(user.email);

  return (
    <div className="center-page">
      <div style={{ fontSize: 44 }}>🐿️</div>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 4px" }}>반가워요! 이름을 정해주세요</h1>
      <p className="mini" style={{ margin: "0 0 18px" }}>그룹원들에게 보이는 이름이에요. 나중에 바꿀 수 있어요.</p>

      {acct && (
        <p className="acct-note">
          <GoogleAccount email={acct} /> 계정으로 가입해요
        </p>
      )}

      {error === "empty" && <div className="toast err">이름을 입력해주세요.</div>}
      {error === "long" && <div className="toast err">이름은 20자 이내로 지어주세요.</div>}

      <div className="card">
        <form action={updateName}>
          <input type="hidden" name="next" value={next} />
          <label className="flabel" style={{ marginTop: 0 }}>
            사용할 이름 <span className="req">*</span>
          </label>
          <input className="input" name="name" placeholder="예) 책읽는 다람쥐" maxLength={20} required autoFocus />
          <button type="submit" className="btn pri" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
            시작하기 🎉
          </button>
        </form>
      </div>

      {/* 이름을 정하기 전에는 (app) 화면으로 못 나가므로 여기에도 빠져나갈 길을 둔다 */}
      <div style={{ marginTop: 16 }}>
        {acct && <p className="mini" style={{ margin: "0 0 6px" }}>이 계정이 아닌가요?</p>}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="btn sm">🔄 다른 계정으로 로그인</button>
        </form>
      </div>
    </div>
  );
}
