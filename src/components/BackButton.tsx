"use client";

/** 바로 전 화면으로 — 오류 안내에서 도움말로 왔다가 다시 입력하러 돌아갈 때 쓴다 */
export function BackButton({ children = "← 돌아가기" }: { children?: React.ReactNode }) {
  return (
    <button
      type="button"
      className="btn sm"
      onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign("/"))}
    >
      {children}
    </button>
  );
}
