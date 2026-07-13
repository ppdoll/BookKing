import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookKing — 함께 읽는 그룹 독서장",
  description: "그룹원끼리 읽은 책을 기록하고 랭킹을 나누는 독서 기록 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
