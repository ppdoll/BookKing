import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireSessionUser } from "@/lib/session";
import { fmtDateFull } from "@/lib/format";

/** 정지된 계정 안내 — requireUser가 이곳으로 보냄 (이 페이지는 정지 여부만 확인) */
export default async function SuspendedPage() {
  const user = await requireSessionUser();
  if (!user.suspendedAt) redirect("/");

  return (
    <div className="center-page">
      <div style={{ fontSize: 44 }}>🚫</div>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 4px" }}>계정이 정지됐어요</h1>
      <p className="mini" style={{ margin: "0 0 18px" }}>
        {fmtDateFull(user.suspendedAt)}부터 이용이 제한된 상태예요.
      </p>
      <div className="card" style={{ textAlign: "left" }}>
        <p style={{ margin: 0, fontSize: 14 }}>
          <b>사유</b>
          <br />
          {user.suspendedReason || "운영 정책 위반"}
        </p>
        <p className="mini" style={{ margin: "10px 0 0" }}>
          문의가 필요하면 운영자에게 연락해주세요. 정지가 해제되면 다시 정상적으로 이용할 수 있어요.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        style={{ marginTop: 16 }}
      >
        <button type="submit" className="btn">로그아웃</button>
      </form>
    </div>
  );
}
