/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // 네이버 책 표지 썸네일
      { protocol: "https", hostname: "shopping-phinf.pstatic.net" },
      { protocol: "http", hostname: "shopping-phinf.pstatic.net" },
    ],
  },
};

export default nextConfig;
