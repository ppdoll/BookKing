import { handleMcpHttp } from "@/lib/mcp/http";

/**
 * BookKing MCP 엔드포인트 — Authorization: Bearer 토큰으로 연결 (Claude Code·Desktop 설정 파일용).
 * 헤더를 넣을 수 없는 Claude 앱 커스텀 커넥터는 토큰을 주소에 넣은 /api/mcp/[token]을 쓴다.
 */
export function POST(req: Request) {
  return handleMcpHttp(req, req.headers.get("authorization"));
}

/** 서버가 먼저 보내는 스트림(SSE)과 세션은 쓰지 않는다 */
export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
export const DELETE = GET;
