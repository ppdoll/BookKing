import type { MetadataRoute } from "next";

/** PWA 설치 정보 — /manifest.webmanifest 로 제공됨 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BookKing — 함께 읽는 그룹 독서장",
    short_name: "BookKing",
    description:
      "가족·친구·동료와 그룹을 만들어 읽은 책을 기록하고, 별점과 문장을 나누고, 랭킹을 겨루는 독서 기록 서비스",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ko",
    background_color: "#FFF6E9",
    theme_color: "#FF8A5C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
