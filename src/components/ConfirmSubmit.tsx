"use client";

import { useState } from "react";

/**
 * 2단계 확인 제출 버튼 (그룹장 위임, 삭제 등 위험한 동작용)
 * 첫 클릭 → 확인 문구와 [확인]/[취소]로 전환, 확인 클릭 시 실제 제출
 */
export function ConfirmSubmit({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [arming, setArming] = useState(false);

  if (!arming) {
    return (
      <button type="button" className={className ?? "btn sm"} onClick={() => setArming(true)}>
        {children}
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
      <span className="mini" style={{ fontWeight: 700 }}>{message}</span>
      <button type="submit" className="btn sm dngr">확인</button>
      <button type="button" className="btn sm" onClick={() => setArming(false)}>취소</button>
    </span>
  );
}
