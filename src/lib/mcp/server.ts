import { TOOLS, ToolError } from "@/lib/mcp/tools";

/**
 * MCP(Model Context Protocol) — Streamable HTTP, 상태 없는(stateless) 서버.
 * 요청마다 JSON-RPC 메시지를 받아 JSON으로 바로 답한다(SSE 스트림·세션 없음).
 * 도구만 제공하므로 initialize · ping · tools/list · tools/call 만 처리한다.
 */

const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS = [
  "BookKing은 함께 쓰는 독서록 서비스예요. 먼저 list_groups로 groupId를 얻으세요.",
  "날짜는 YYYY-MM-DD, 별점(stars)은 0~5에 0.5 단위예요.",
  "기록을 만들거나 바꾸는 도구(add_book_record, set_record_status)는 사용자가 원할 때만 쓰세요.",
  "학교(교실) 모드 학생이 쓴 문장·느낀 점은 제공하지 않아요.",
].join(" ");

type Json = Record<string, unknown>;
type RpcMessage = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
type User = { id: string; name: string | null };

const ok = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

/** 메시지 하나 처리 — 알림(id 없음)이면 null(응답 없음) */
export async function handleMessage(msg: RpcMessage, user: User): Promise<Json | null> {
  const isRequest = msg && typeof msg === "object" && "id" in msg;
  const id = isRequest ? msg.id : null;
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return isRequest ? fail(id, -32600, "Invalid Request") : null;
  }
  if (!isRequest) return null; // notifications/initialized 등 — 할 일 없음

  const params = (msg.params && typeof msg.params === "object" ? msg.params : {}) as Json;
  switch (msg.method) {
    case "initialize": {
      const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      return ok(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "bookking", title: "BookKing", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: { readOnlyHint: t.readOnly, destructiveHint: false, openWorldHint: false },
        })),
      });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${String(params.name)}`);
      const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Json;
      try {
        const data = await tool.run(user, args);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
      } catch (e) {
        // 사용자에게 알려 줄 오류는 그대로, 나머지는 내부 내용을 숨긴다
        const message = e instanceof ToolError ? e.message : "처리 중 오류가 났어요. 잠시 뒤 다시 시도해 주세요.";
        if (!(e instanceof ToolError)) console.error("[mcp] tool error", tool.name, e);
        return ok(id, { content: [{ type: "text", text: message }], isError: true });
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${msg.method}`);
  }
}
