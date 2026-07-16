"use client";

import { useEffect } from "react";

/** 서비스워커 등록 — PWA 설치·오프라인 폴백을 위해 (프로덕션에서만) */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 등록 실패는 조용히 무시 — 앱 동작에는 지장 없음 */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
