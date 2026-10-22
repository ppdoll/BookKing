import { headers } from "next/headers";

/**
 * 지금 요청이 들어온 사이트 주소 (예: https://book-king-two.vercel.app).
 * 그룹 관리에 보이는 링크와 QR 안내문 속 링크가 반드시 같은 주소가 되도록 한 곳에서 만든다.
 */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
