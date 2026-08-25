"use client";

/** 브라우저 인쇄 대화상자 열기 — PDF로 저장도 여기서 선택할 수 있다 */
export function PrintButton() {
  return (
    <button type="button" className="btn pri no-print" onClick={() => window.print()}>
      🖨 인쇄 / PDF로 저장
    </button>
  );
}
