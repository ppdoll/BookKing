import type { MetadataRoute } from "next";

const SITE = "https://book-king-two.vercel.app";

/** 색인 대상 공개 페이지 목록 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/login`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/manual.html`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
