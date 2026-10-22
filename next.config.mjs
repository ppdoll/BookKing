/** @type {import('next').NextConfig} */
// 이미지 최적화(next/image)는 쓰지 않는다 — 책 표지는 <img>로 바로 띄운다.
// 예전 네이버 표지용 remotePatterns가 남아 있으면 /_next/image가 외부 이미지를
// 받아 변환해주는 입구가 열려 있게 되므로(이미지 최적화 API 취약점의 공격면) 두지 않는다.
const nextConfig = {};

export default nextConfig;
