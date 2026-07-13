import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { updateName } from "@/lib/actions/user-actions";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: nextRaw, error } = await searchParams;
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/";

  const user = await requireSessionUser();
  if (user.name) redirect(next);

  return (
    <div className="center-page">
      <div style={{ fontSize: 44 }}>🐿️</div>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 4px" }}>반가워요! 이름을 정해주세요</h1>
      <p className="mini" style={{ margin: "0 0 18px" }}>그룹원들에게 보이는 이름이에요. 나중에 바꿀 수 있어요.</p>

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
    </div>
  );
}
