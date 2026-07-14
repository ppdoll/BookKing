import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getSlotStatus } from "@/lib/slots";
import { createGroup } from "@/lib/actions/group-actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireUser("/groups/new");
  const slots = await getSlotStatus(user.id);

  return (
    <div style={{ maxWidth: 480, margin: "24px auto" }}>
      <div className="page-h">
        <h1>🌱 새 그룹 만들기</h1>
        <span className={`pill ${slots.available > 0 ? "p-read" : "p-ghost"}`}>
          🎟️ 이용권 {slots.available}개 남음
        </span>
      </div>
      {error === "empty" && <div className="toast err">그룹 이름을 입력해주세요.</div>}
      {error === "long" && <div className="toast err">그룹 이름은 30자 이내로 지어주세요.</div>}
      {(error === "noslot" || slots.available <= 0) && (
        <div className="card" style={{ background: "var(--sun-soft)", marginBottom: 14 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>🎟️ 이용권이 모두 사용됐어요</p>
          <p className="mini" style={{ margin: "6px 0 10px" }}>
            그룹 생성은 기본 1개까지 무료예요. 더 만들려면 쿠폰을 사용하거나 운영자에게 이용권을 요청해주세요.
          </p>
          <Link href="/slots" className="btn pri">🎟️ 이용권 페이지로 가기</Link>
        </div>
      )}
      <div className="card">
        <form action={createGroup}>
          <label className="flabel" style={{ marginTop: 0 }}>
            그룹 이름 <span className="req">*</span>
          </label>
          <input className="input" name="name" placeholder="예) 우리 가족 책모임" maxLength={30} required autoFocus />
          <p className="mini" style={{ margin: "10px 0 0" }}>
            그룹을 만들면 <b>그룹장</b>이 되고, 7일간 유효한 초대 링크가 발급돼요.
          </p>
          <div style={{ marginTop: 14 }}>
            <SubmitButton className="btn pri" pendingText="그룹 만드는 중…">그룹 만들기 🎉</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
