import Link from "next/link";
import { HELP, helpHref } from "@/lib/help";

/** 없는 주소·삭제된 페이지 — 학생이 다음에 뭘 하면 되는지 바로 보이게 */
export default function NotFound() {
  return (
    <div className="center-page">
      <div className="err-emoji" aria-hidden="true">🧭</div>
      <h1 className="err-title">이 페이지를 찾을 수 없어요</h1>
      <p className="mini" style={{ margin: "0 0 18px" }}>주소가 잘못됐거나, 없어진 페이지예요.</p>

      <div className="card">
        <p style={{ margin: "0 0 4px", fontWeight: 800 }}>이렇게 해 보세요</p>
        <ol className="err-steps">
          <li>주소를 끝까지 정확하게 입력했는지 확인해요.</li>
          <li>
            🎒 학생이라면 선생님이 준 <b>우리 반 입장 링크(QR)</b>로 다시 들어가요.
          </li>
          <li>링크가 안 열리면 선생님께 새 링크를 받아요.</li>
        </ol>
        <div className="err-actions">
          <Link href="/" className="btn pri">🏠 처음 화면으로</Link>
          <Link href={helpHref(HELP.link)} className="btn">🙋 도움말</Link>
        </div>
      </div>
    </div>
  );
}
