import { userFromApiToken } from "@/lib/api-token";
import { handleMessage } from "@/lib/mcp/server";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

/** MCP HTTP 요청 하나 처리 — 토큰 확인 후 JSON-RPC 메시지(또는 배치)에 답한다 */
export async function handleMcpHttp(req: Request, authorization: string | null) {
  const user = await userFromApiToken(authorization);
  if (!user) {
    return json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "BookKing 토큰이 없거나 맞지 않아요. BookKing의 🤖 AI 연결 화면에서 연결 주소를 다시 만들어 주세요." } },
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
