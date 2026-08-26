import type { MetadataRoute } from "next";

const SITE = "https://book-king-two.vercel.app";

/** 검색엔진 크롤링 규칙 — 공개 페이지만 허용, 로그인·개인 페이지는 차단 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/manual.html", "/tips", "/privacy", "/terms"],
        // 로그인 뒤 개인/그룹 페이지, API, 개인 공유 링크, 반 입장 링크는 색인 제외
        disallow: ["/api/", "/admin/", "/books/", "/records/", "/shelf", "/search", "/wrapped", "/w/", "/report/", "/join/", "/class/", "/groups/", "/slots", "/welcome", "/suspended"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
