"use client";

import { useEffect, useState } from "react";

/**
 * 카카오톡·인스타그램 등 인앱 브라우저(WebView) 감지 시 안내 + 외부 브라우저 열기.
 * Google OAuth는 인앱 브라우저에서 403 disallowed_useragent로 차단되므로
 * 로그인 진입점(로그인/초대 페이지)에서 미리 탈출시킨다.
 */
type InAppInfo = { kakao: boolean; line: boolean; android: boolean };

function detectInApp(): InAppInfo | null {
  const ua = navigator.userAgent;
  const inApp =
    /KAKAOTALK|Instagram|NAVER\(inapp|FBAN|FBAV|FB_IAB|DaumApps|everytimeapp|kakaostory|\bLine\//i.test(ua);
  if (!inApp) return null;
  return {
    kakao: /KAKAOTALK/i.test(ua),
    line: /\bLine\//i.test(ua),
    android: /Android/i.test(ua),
  };
}

/**
 * variant="class": 학생 입장 화면용 문구. 학생은 구글 로그인을 쓰지 않으므로
 * "구글 로그인이 막혀요"는 엉뚱한 겁을 준다 — 학생 입장은 앱 안에서도 된다고 알려준다.
 */
export function InAppBrowserGuard({ variant = "login" }: { variant?: "login" | "class" }) {
  const [info, setInfo] = useState<InAppInfo | null>(null);

  useEffect(() => {
    const detected = detectInApp();
    setInfo(detected);
    // 카카오톡은 외부 브라우저 열기 스킴이 안정적이라 자동으로 시도
    if (detected?.kakao) {
      window.location.href =
        "kakaotalk://web/openExternal?url=" + encodeURIComponent(window.location.href);
    }
  }, []);

  if (!info) return null;

  const openExternal = () => {
    const url = window.location.href;
    if (info.kakao) {
      window.location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
    } else if (info.line) {
      window.location.href = url + (url.includes("?") ? "&" : "?") + "openExternalBrowser=1";
    } else if (info.android) {
      window.location.href =
        `intent://${window.location.host}${window.location.pathname}${window.location.search}` +
        `#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    }
  };

  const canAutoOpen = info.kakao || info.line || info.android;

  return (
    <div className="card" style={{ background: "var(--sun-soft)", marginBottom: 14, textAlign: "left" }}>
      {variant === "class" ? (
        <>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>
            💬 {info.kakao ? "카카오톡" : "앱"} 안에서 열렸어요
          </p>
          <p className="mini" style={{ margin: "6px 0 10px" }}>
            {info.kakao
              ? "크롬·사파리로 옮겨 여는 중이에요. 넘어가지 않으면 아래 버튼을 눌러 주세요. 그래도 안 되면 여기서 그대로 입장해도 돼요."
              : "여기서도 우리 반에 들어갈 수 있어요. 화면이 이상하거나 다음으로 넘어가지 않으면 크롬·사파리로 열어 주세요."}
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>
            ⚠️ 앱 안 브라우저에서는 Google 로그인이 막혀요
          </p>
          <p className="mini" style={{ margin: "6px 0 10px" }}>
            카카오톡·인스타그램 등에서 링크를 열면 Google이 보안 정책으로 로그인을 차단해요.
            기본 브라우저(Chrome/Safari)로 열면 정상적으로 로그인돼요.
          </p>
        </>
      )}
      {canAutoOpen ? (
        <button type="button" className="btn pri" onClick={openExternal}>
          🌐 기본 브라우저로 열기
        </button>
      ) : (
        <p className="mini" style={{ margin: 0 }}>
          화면 모서리의 메뉴(<b>⋮</b> 또는 공유 버튼)에서 <b>&ldquo;다른 브라우저로 열기&rdquo;</b>{" "}
          / <b>&ldquo;Safari로 열기&rdquo;</b>를 선택해주세요.
        </p>
      )}
      <p className="mini" style={{ margin: "8px 0 0" }}>
        버튼이 동작하지 않으면 주소를 복사해서 브라우저 주소창에 붙여넣어 주세요.
      </p>
    </div>
  );
}
