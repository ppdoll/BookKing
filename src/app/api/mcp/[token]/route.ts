import { handleMcpHttp } from "@/lib/mcp/http";

/**
 * 개인 연결 주소 — Claude 앱(웹·데스크톱·휴대폰)의 "커스텀 커넥터 추가"에 주소만 붙여넣어 쓴다.
 * 커넥터는 요청 헤더를 넣을 수 없어서 토큰을 주소에 담는다. 이 주소는 비밀번호처럼 다룬다.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return handleMcpHttp(req, `Bearer ${token}`);
}

export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
export const DELETE = GET;
