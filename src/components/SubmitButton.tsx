"use client";

import { useFormStatus } from "react-dom";

/** 서버 액션 폼 제출 중 pending 상태를 보여주는 버튼 (중복 제출 방지 겸용) */
export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className ?? "btn sm pri"} disabled={pending}>
      {pending ? (pendingText ?? "잠깐만요…") : children}
    </button>
  );
}
