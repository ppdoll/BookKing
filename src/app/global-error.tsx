"use client";

import "./globals.css";

/**
 * 가장 바깥(루트 레이아웃)에서 문제가 났을 때의 마지막 안내.
 * 루트 레이아웃을 대신하므로 <html>·<body>와 전역 CSS를 직접 넣는다.
 * 레이아웃부터 깨진 상황이라 '다시 시도'는 페이지를 새로 불러온다.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="ko">
      <body>
        <div className="center-page">
          <div className="err-emoji" aria-hidden="true">🛠</div>
          <h1 className="err-title">잠깐 문제가 생겼어요</h1>
          <p className="mini" style={{ margin: "0 0 18px" }}>
            여러분 잘못이 아니에요. 잠시 뒤 다시 시도해 주세요.
          </p>
          <div className="card">
            <ol className="err-steps">
              <li>
                아래 <b>🔄 다시 시도</b>를 눌러요.
              </li>
              <li>와이파이나 데이터가 연결돼 있는지 확인해요.</li>
              <li>계속 같으면 아래 오류 코드를 선생님께 알려 드려요.</li>
            </ol>
            {error.digest && (
              <p className="err-code">
                오류 코드 <b>{error.digest}</b>
              </p>
            )}
            <div className="err-actions">
              <button type="button" className="btn pri" onClick={() => window.location.reload()}>
                🔄 다시 시도
              </button>
              <a href="/" className="btn">🏠 처음 화면으로</a>
              <a href="/help#error" className="btn">🙋 도움말</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
