import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { getStudentEntry } from "@/lib/student";
import { setStudentPassword } from "@/lib/actions/group-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { HelpLink } from "@/components/HelpLink";
import { HELP } from "@/lib/help";

/**
 * 학생 개인 비밀번호 설정 — 최초 입장 직후, 그리고 이미 입장했지만
 * 아직 비밀번호가 없는 기존 학생이 다음 접속 때 거쳐 가는 화면.
 */
export default async function SetStudentPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireUser("/class/set-password");

  const entry = await getStudentEntry(user.id);
  if (!entry || !entry.group.classroomMode) redirect("/");
  if (entry.password) redirect("/"); // 이미 정했으면 볼 일이 없다

  return (
    <div className="center-page">
      <div className="logo" style={{ fontSize: 26, fontWeight: 900 }}>
        📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
      </div>
      <p className="mini" style={{ margin: "4px 0 20px" }}>『{entry.group.name}』</p>

      <div className="card">
        <p style={{ margin: "0 0 4px", fontSize: 15 }}>
          🔑 <b>{entry.nickname}</b>님, 비밀번호를 정해주세요
        </p>
        <p className="mini" style={{ margin: "0 0 14px" }}>
          다음부터는 <b>별명과 이 비밀번호</b>로 들어올 수 있어요. 반번호는 몰라도 돼요.
        </p>

        {error === "short" && (
          <div className="toast err" style={{ marginBottom: 12 }}>
            비밀번호는 4자 이상으로 정해 주세요.
            <span className="toast-sub">예: 좋아하는 동물 이름 + 숫자처럼, 나만 알고 잊지 않을 걸로 정해 보세요.</span>
          </div>
        )}
        {error === "mismatch" && (
          <div className="toast err" style={{ marginBottom: 12 }}>
            두 번 입력한 비밀번호가 서로 달라요.
            <span className="toast-sub">두 칸에 똑같이 입력해 주세요. 자판이 한글로 쳐지고 있지 않은지도 확인해요.</span>
          </div>
        )}
        <p className="mini" style={{ margin: "0 0 10px" }}>
          🔒 잊지 않을 비밀번호로 정하고, <b>친구에게는 알려 주지 마세요.</b>
        </p>

        <form action={setStudentPassword}>
          <div style={{ display: "grid", gap: 8 }}>
            <input className="input" name="password" type="password" placeholder="새 비밀번호 (4자 이상)" minLength={4} required autoFocus />
            <input className="input" name="password2" type="password" placeholder="한 번 더 입력" minLength={4} required />
            <SubmitButton className="btn pri" pendingText="저장하는 중…">
              <span style={{ width: "100%", textAlign: "center" }}>비밀번호 저장하고 시작하기</span>
            </SubmitButton>
          </div>
        </form>

        <p className="mini" style={{ margin: "12px 0 0" }}>
          💡 잊어버리면 선생님께 <b>비밀번호 초기화</b>를 부탁하세요. 내 기록은 그대로 남고, 새로 정할 수 있어요.{" "}
          <HelpLink to={HELP.myPw}>자세히 보기</HelpLink>
        </p>
      </div>

      {/*
        내가 아닌 별명으로 들어왔을 때 빠져나갈 길.
        이 화면은 (app) 레이아웃이 계속 되돌려 보내므로 여기에 로그아웃이 없으면
        (같은 기기를 돌려 쓰는 교실에서) 다른 학생이 들어올 방법이 없다.
        로그아웃 후에는 로그인 화면 대신 우리 반 입장 화면으로 바로 보낸다.
      */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: `/class/${entry.group.inviteCode}` });
        }}
        style={{ marginTop: 16 }}
      >
        <button type="submit" className="btn sm">🔄 내가 아니에요 — 다른 별명으로 들어가기</button>
      </form>
    </div>
  );
}
