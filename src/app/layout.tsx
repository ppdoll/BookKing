import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/InstallPrompt";

const SITE_URL = "https://book-king-two.vercel.app";
const TITLE = "BookKing — 함께 쓰는 독서록·독서장";
const DESCRIPTION =
  "가족·친구·학급이 함께 쓰는 무료 온라인 독서록. 읽은 책을 독서장에 기록하고 별점·문장·느낀 점을 남기면 나만의 독서 결산이 만들어져요.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "독서록", "독서장", "독서 기록", "독서록 쓰는 법", "온라인 독서록",
    "학급 독서록", "독서모임", "독서 감상문", "독서 기록 앱",
  ],
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
        <footer style={{ textAlign: "center", padding: "28px 12px 40px", fontSize: 12, color: "var(--sub)" }}>
          <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>개인정보 처리방침</a>
          {" · "}
          <a href="/terms" style={{ color: "inherit", textDecoration: "underline" }}>이용약관</a>
          {" · "}
          <a href="/manual.html" style={{ color: "inherit", textDecoration: "underline" }}>도움말</a>
        </footer>
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
