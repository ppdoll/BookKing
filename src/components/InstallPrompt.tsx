"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "bk_install_dismissed";

/**
 * 앱 설치 안내 칩 (우하단, 닫기 가능)
 * - Android/데스크톱 Chrome: beforeinstallprompt를 잡아 [앱 설치] 버튼 제공
 * - iOS Safari: 설치 이벤트가 없으므로 공유 → "홈 화면에 추가" 안내 표시
 * - 이미 설치(standalone)돼 있으면 아무것도 안 보임
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true); // 기본 숨김, 조건 충족 시 노출

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari 홈 화면 실행 여부
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = isIos && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);

    if (isIos) {
      // iOS는 Safari에서만 홈 화면 추가 가능
      if (isSafari) {
        setIosHint(true);
        setDismissed(false);
      }
      return;
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", () => close());
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    close();
  };

  if (dismissed || (!deferred && !iosHint)) return null;

  return (
    <div
      style={{
        position: "fixed", right: 14, bottom: 14, zIndex: 50, maxWidth: 300,
        background: "var(--panel, #fff)", color: "var(--ink, #3B2F28)",
        border: "2px solid var(--bd, #3B2F28)", borderRadius: 14,
        boxShadow: "3px 3px 0 var(--bd, #3B2F28)", padding: "12px 14px", fontSize: 13.5,
      }}
      role="dialog"
      aria-label="앱 설치 안내"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>📚</span>
        <b style={{ fontSize: 14 }}>홈 화면에 BookKing 추가</b>
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          style={{ marginLeft: "auto", border: 0, background: "none", fontSize: 18, cursor: "pointer", color: "var(--sub, #97826F)", lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      {deferred ? (
        <>
          <p style={{ margin: "0 0 10px", color: "var(--sub, #97826F)" }}>
            앱처럼 전체화면으로 빠르게 열 수 있어요.
          </p>
          <button
            type="button"
            onClick={install}
            style={{
              border: "2px solid var(--bd, #3B2F28)", background: "var(--accent, #FF8A5C)",
              color: "var(--on-accent, #3B2F28)", fontWeight: 800, borderRadius: 10,
              padding: "7px 16px", fontSize: 13.5, cursor: "pointer", boxShadow: "2px 2px 0 var(--bd, #3B2F28)",
            }}
          >
            📲 앱 설치
          </button>
        </>
      ) : (
        <p style={{ margin: 0, color: "var(--sub, #97826F)", lineHeight: 1.6 }}>
          하단의 <b>공유</b> 버튼 <span aria-hidden>⬆️</span> 을 누르고{" "}
          <b>&ldquo;홈 화면에 추가&rdquo;</b>를 선택하면 앱처럼 쓸 수 있어요.
        </p>
      )}
    </div>
  );
}
