"use client";

import { useActionState } from "react";
import { issueTokenAction, type IssueTokenState } from "@/lib/actions/token-actions";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";

/** 연결 설정 — 발급한 토큰을 넣은 그대로 복사할 수 있게 만든다 */
function setupTexts(endpoint: string, token: string) {
  // Claude 앱 커스텀 커넥터는 헤더를 못 넣어서 토큰을 주소에 담는다
  const connectorUrl = `${endpoint}/${token}`;
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
  return { connectorUrl, claudeCode, desktop };
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
        <input className="input" name="name" placeholder="이름 (예: 내 Claude)" maxLength={30} style={{ flex: 1, minWidth: 180 }} />
        <SubmitButton className="btn pri" pendingText="만드는 중…">
          🔗 연결 주소 만들기
        </SubmitButton>
      </form>
      {state.error && <p className="mini" style={{ color: "var(--danger)", fontWeight: 700, margin: "8px 0 0" }}>{state.error}</p>}

      {state.token && texts && (
        <div style={{ marginTop: 14, padding: 12, border: "2px solid var(--bd)", borderRadius: 12, background: "var(--sun-soft)" }}>
          <p style={{ margin: 0, fontWeight: 800 }}>✅ 『{state.name}』 연결 주소가 만들어졌어요</p>
          <p className="mini" style={{ margin: "4px 0 8px" }}>
            이 화면을 벗어나면 <b>다시 볼 수 없어요.</b> 지금 복사해서 Claude에 붙여 넣으세요.
            이 주소는 비밀번호와 같아요 — 다른 사람에게 보내지 마세요.
          </p>
          <pre style={pre}>{texts.connectorUrl}</pre>
          <CopyButton text={texts.connectorUrl} />

          <p style={{ margin: "14px 0 4px", fontWeight: 800, fontSize: 13.5 }}>Claude 앱에 붙이는 법 (웹·PC·휴대폰 공통, 한 번만)</p>
          <ol className="mini" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            <li>Claude(claude.ai 또는 Claude 앱)에서 왼쪽 아래 내 이름 → <b>설정</b> → <b>커넥터</b></li>
            <li><b>커스텀 커넥터 추가</b>를 누르고, 이름은 <b>BookKing</b>, 주소(URL)에 위 연결 주소를 붙여넣기 → <b>추가</b></li>
            <li>새 대화에서 입력창 아래 <b>도구(＋)</b> 메뉴에 BookKing이 켜져 있는지 확인</li>
            <li>아래 예시처럼 물어보세요. 처음 쓸 때 Claude가 &quot;허용할까요?&quot;라고 물으면 허용</li>
          </ol>

          <details style={{ marginTop: 12 }}>
            <summary className="mini" style={{ cursor: "pointer", fontWeight: 700 }}>개발자용 — Claude Code·Claude Desktop 설정 파일로 연결</summary>
            <p style={{ margin: "10px 0 0", fontWeight: 800, fontSize: 13 }}>Claude Code — 터미널에 붙여넣기</p>
            <pre style={pre}>{texts.claudeCode}</pre>
            <CopyButton text={texts.claudeCode} />
            <p style={{ margin: "12px 0 0", fontWeight: 800, fontSize: 13 }}>Claude Desktop 설정 파일(claude_desktop_config.json)</p>
            <p className="mini" style={{ margin: "2px 0 0" }}>커넥터를 쓸 수 없을 때만. Node.js가 설치돼 있어야 해요.</p>
            <pre style={pre}>{texts.desktop}</pre>
            <CopyButton text={texts.desktop} />
          </details>
        </div>
      )}
    </>
  );
}
