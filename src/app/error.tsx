"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HELP, helpHref } from "@/lib/help";

/**
 * 화면을 그리다 문제가 생겼을 때(서버 오류·DB 연결 실패 등) 보이는 안내.
 * 오류 내용은 보여주지 않고(내부 정보), 서버 로그와 맞춰볼 수 있는 오류 코드(digest)만 보여준다.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // 서버에서 난 오류는 다시 그리기만으로는 안 풀리므로 서버 데이터를 새로 받아온 뒤 다시 그린다
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div className="center-page">
      <div className="err-emoji" aria-hidden="true">🛠</div>
      <h1 className="err-title">잠깐 문제가 생겼어요</h1>
      <p className="mini" style={{ margin: "0 0 18px" }}>
        여러분 잘못이 아니에요. 대부분 금방 괜찮아져요.
      </p>

      <div className="card">
        <p style={{ margin: "0 0 4px", fontWeight: 800 }}>이렇게 해 보세요</p>
        <ol className="err-steps">
          <li>
            아래 <b>🔄 다시 시도</b>를 눌러요.
          </li>
          <li>와이파이나 데이터가 연결돼 있는지 확인해요.</li>
          <li>계속 같은 화면이 나오면 아래 오류 코드를 선생님께 알려 드려요.</li>
        </ol>
        {error.digest && (
          <p className="err-code">
            오류 코드 <b>{error.digest}</b>
          </p>
        )}
        <div className="err-actions">
          <button type="button" className="btn pri" onClick={retry}>
            🔄 다시 시도
          </button>
          <Link href="/" className="btn">🏠 처음 화면으로</Link>
          <Link href={helpHref(HELP.error)} className="btn">🙋 도움말</Link>
        </div>
      </div>
    </div>
  );
}
