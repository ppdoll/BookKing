import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/InstallPrompt";

const SITE_URL = "https://book-king-two.vercel.app";
const TITLE = "BookKing — 함께 읽는 그룹 독서장";
const DESCRIPTION =
  "가족·친구·동료와 그룹을 만들어 읽은 책을 기록하고, 별점과 문장을 나누고, 랭킹을 겨루는 독서 기록 서비스";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "BookKing",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  // 홈 화면에 추가 시 앱처럼(전체화면) 실행 + iOS 아이콘/제목
  appleWebApp: {
    capable: true,
    title: "BookKing",
    statusBarStyle: "default",
  },
  // 구형 iOS(16.3 이하) 호환용 — 홈 화면 실행 시 전체화면 유지
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#FF8A5C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
