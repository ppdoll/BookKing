"use client";

import { useActionState } from "react";
import { issueTokenAction, type IssueTokenState } from "@/lib/actions/token-actions";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";

/** 연결 설정 — 발급한 토큰을 넣은 그대로 복사할 수 있게 만든다 */
function setupTexts(endpoint: string, token: string) {
  const claudeCode = `claude mcp add --transport http bookking ${endpoint} --header "Authorization: Bearer ${token}"`;
  const desktop = JSON.stringify(
    {
      mcpServers: {
        bookking: {
          command: "npx",
          args: ["-y", "mcp-remote", endpoint, "--header", "Authorization:${BOOKKING_AUTH}"],
          env: { BOOKKING_AUTH: `Bearer ${token}` },
        },
      },
    },
    null,
    2
  );
  return { claudeCode, desktop };
}

const pre = {
  margin: "6px 0", padding: "8px 10px", background: "var(--chip)", border: "2px solid var(--bd)",
  borderRadius: 10, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all",
} as const;

export function TokenIssueForm({ endpoint }: { endpoint: string }) {
  const [state, action] = useActionState<IssueTokenState, FormData>(issueTokenAction, {});
  const texts = state.token ? setupTexts(endpoint, state.token) : null;

  return (
    <>
      <form action={action} className="fieldrow" style={{ gap: 8 }}>
        <input className="input" name="name" placeholder="토큰 이름 (예: 집 노트북 Claude)" maxLength={30} style={{ flex: 1, minWidth: 180 }} />
        <SubmitButton className="btn pri" pendingText="만드는 중…">
          🔑 토큰 만들기
        </SubmitButton>
      </form>
      {state.error && <p className="mini" style={{ color: "var(--danger)", fontWeight: 700, margin: "8px 0 0" }}>{state.error}</p>}

      {state.token && texts && (
        <div style={{ marginTop: 14, padding: 12, border: "2px solid var(--bd)", borderRadius: 12, background: "var(--sun-soft)" }}>
          <p style={{ margin: 0, fontWeight: 800 }}>✅ 『{state.name}』 토큰이 만들어졌어요</p>
          <p className="mini" style={{ margin: "4px 0 8px" }}>
            이 화면을 벗어나면 <b>다시 볼 수 없어요.</b> 아래 설정을 지금 복사해 두세요. 토큰은 비밀번호처럼 다른 사람에게 보내지 마세요.
          </p>
          <pre style={pre}>{state.token}</pre>
          <CopyButton text={state.token} />

          <p style={{ margin: "14px 0 0", fontWeight: 800, fontSize: 13.5 }}>Claude Code — 터미널에 붙여넣기</p>
          <pre style={pre}>{texts.claudeCode}</pre>
          <CopyButton text={texts.claudeCode} />

          <p style={{ margin: "14px 0 0", fontWeight: 800, fontSize: 13.5 }}>Claude Desktop — 설정 파일(claude_desktop_config.json)에 넣기</p>
          <p className="mini" style={{ margin: "2px 0 0" }}>
            Claude Desktop → 설정 → 개발자 → <b>구성 편집</b>으로 파일을 열고, 아래 내용을 넣은 뒤 Claude를 완전히 껐다 켜세요.
            (컴퓨터에 Node.js가 설치돼 있어야 해요. 이미 다른 mcpServers가 있으면 그 안에 "bookking" 부분만 추가하세요)
          </p>
          <pre style={pre}>{texts.desktop}</pre>
          <CopyButton text={texts.desktop} />
        </div>
      )}
    </>
  );
}
