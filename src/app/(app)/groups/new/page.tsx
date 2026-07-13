import { requireUser } from "@/lib/session";
import { createGroup } from "@/lib/actions/group-actions";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireUser("/groups/new");

  return (
    <div style={{ maxWidth: 480, margin: "24px auto" }}>
      <div className="page-h">
        <h1>🌱 새 그룹 만들기</h1>
      </div>
      {error === "empty" && <div className="toast err">그룹 이름을 입력해주세요.</div>}
      {error === "long" && <div className="toast err">그룹 이름은 30자 이내로 지어주세요.</div>}
      <div className="card">
        <form action={createGroup}>
          <label className="flabel" style={{ marginTop: 0 }}>
            그룹 이름 <span className="req">*</span>
          </label>
          <input className="input" name="name" placeholder="예) 우리 가족 책모임" maxLength={30} required autoFocus />
          <p className="mini" style={{ margin: "10px 0 0" }}>
            그룹을 만들면 <b>그룹장</b>이 되고, 7일간 유효한 초대 링크가 발급돼요.
          </p>
          <button type="submit" className="btn pri" style={{ marginTop: 14 }}>
            그룹 만들기 🎉
          </button>
        </form>
      </div>
    </div>
  );
}
