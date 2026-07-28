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
  // 구형 iOS(16.3 이하) 호환용 + 검색엔진 소유확인(Vercel 환경변수로 코드만 넣으면 됨)
  other: {
    "apple-mobile-web-app-capable": "yes",
    // 네이버 서치어드바이저 소유확인 (환경변수 설정 시 그 값 우선)
    "naver-site-verification":
      process.env.NAVER_SITE_VERIFICATION ?? "d964bbe938e0d6fe8d4fd089fcb7e331d4d1b1e0",
  },
  verification: {
    // 구글 서치 콘솔 소유확인 (환경변수 설정 시 그 값 우선)
    google: process.env.GOOGLE_SITE_VERIFICATION ?? "0PpPo4bINVY-5kETwF3FShArtLEOBEKzb2Remaj32QM",
  },
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
