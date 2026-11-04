import { userFromApiToken } from "@/lib/api-token";
import { handleMessage } from "@/lib/mcp/server";

/**
 * BookKing MCP 엔드포인트 — Claude Desktop·Code 등에서 개인 토큰으로 연결한다.
 * 토큰 발급·연결 방법은 /connect 화면.
 */

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

export async function POST(req: Request) {
  const user = await userFromApiToken(req.headers.get("authorization"));
  if (!user) {
    return json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "BookKing 토큰이 없거나 맞지 않아요. BookKing의 🤖 AI 연결 화면에서 토큰을 확인해 주세요." } },
      401,
      { "WWW-Authenticate": 'Bearer realm="BookKing"' }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  const batch = Array.isArray(body);
  const messages = (batch ? body : [body]) as Parameters<typeof handleMessage>[0][];
  const replies = [];
  for (const m of messages) {
    const r = await handleMessage(m, user);
    if (r) replies.push(r);
  }
  // 알림만 왔으면 본문 없이 202
  if (replies.length === 0) return new Response(null, { status: 202 });
  return json(batch ? replies : replies[0]);
}

/** 서버가 먼저 보내는 스트림(SSE)과 세션은 쓰지 않는다 */
export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
export const DELETE = GET;
