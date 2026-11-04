import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { fmtDateFull } from "@/lib/format";
import { requestOrigin } from "@/lib/origin";
import { API_TOKEN_LIMIT, canUseAiConnect } from "@/lib/api-token";
import { revokeTokenAction } from "@/lib/actions/token-actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { TokenIssueForm } from "@/components/TokenIssueForm";

/** 🤖 AI 연결 — Claude Desktop·Code에서 BookKing을 쓰도록 개인 토큰을 발급·관리한다 */
export default async function ConnectPage() {
  const user = await requireUser("/connect");
  const allowed = canUseAiConnect(user);
  const [tokens, origin] = await Promise.all([
    allowed
      ? prisma.apiToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    requestOrigin(),
  ]);
  const endpoint = `${origin}/api/mcp`;

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-h">
        <h1>🤖 AI 연결</h1>
        <span className="mini">Claude에서 BookKing 기록을 묻고 등록해요</span>
      </div>

      {!allowed ? (
        <section className="card">
          <p style={{ margin: 0 }}>학생 계정은 AI 연결을 쓸 수 없어요.</p>
        </section>
      ) : (
        <>
          <section className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>무엇을 할 수 있나요?</h3>
            <ul className="mini" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>"내 책장에서 올해 완독한 책 알려줘", "어린 왕자 다 읽었어, 별점 4.5"처럼 말로 조회·기록해요</li>
              <li>학교 모드 선생님이면 "3학년 2반 중 아직 기록 없는 학생?", "반 대항 순위 정리해줘" 같은 현황도 물어볼 수 있어요</li>
              <li>내가 화면에서 볼 수 있는 것만 볼 수 있고, 명렬·비밀번호·삭제 같은 관리 기능은 없어요</li>
            </ul>
            <p className="mini" style={{ margin: "10px 0 0", padding: "8px 12px", background: "var(--chip)", borderRadius: 10 }}>
              🔒 AI에 보내는 내용은 Claude를 만든 회사(Anthropic) 서버로 가요. 그래서 <b>학생이 쓴 기억에 남는 문장·읽고 느낀 점은 보내지 않고</b>,
              학생은 별명·반번호·권수·책 제목까지만 보내요. 내 기록의 문장·느낀 점은 내 것이라 보내요.
            </p>
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>🔑 토큰 만들기</h3>
            <p className="mini" style={{ margin: "0 0 10px" }}>
              토큰은 이 계정으로 BookKing에 들어가는 열쇠예요. 쓰는 기기마다 하나씩 만들고, 잃어버리면 아래에서 지우세요.
              (최대 {API_TOKEN_LIMIT}개)
            </p>
            {tokens.length >= API_TOKEN_LIMIT ? (
              <p className="mini" style={{ margin: 0, fontWeight: 700 }}>토큰이 {API_TOKEN_LIMIT}개라 더 만들 수 없어요. 안 쓰는 토큰을 먼저 지워주세요.</p>
            ) : (
              <TokenIssueForm endpoint={endpoint} />
            )}
            <p className="mini" style={{ margin: "12px 0 0" }}>
              연결 주소: <code>{endpoint}</code>
            </p>
          </section>

          <section className="card">
            <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
              내 토큰 <span className="mini">{tokens.length}개</span>
            </h3>
            {tokens.length === 0 ? (
              <p className="mini" style={{ margin: 0 }}>아직 만든 토큰이 없어요.</p>
            ) : (
              <div className="tablewrap">
                <table className="mt">
                  <thead>
                    <tr><th>이름</th><th>토큰</th><th>만든 날</th><th>마지막 사용</th><th style={{ width: 70 }}></th></tr>
                  </thead>
                  <tbody>
                    {tokens.map((t) => (
                      <tr key={t.id}>
                        <td><b>{t.name}</b></td>
                        <td className="mini num">{t.prefix}…</td>
                        <td className="mini num">{fmtDateFull(t.createdAt)}</td>
                        <td className="mini num">{t.lastUsedAt ? fmtDateFull(t.lastUsedAt) : "안 씀"}</td>
                        <td>
                          <form action={revokeTokenAction}>
                            <input type="hidden" name="tokenId" value={t.id} />
                            <ConfirmSubmit message={`『${t.name}』 토큰을 지울까요? 이 토큰을 넣은 AI 앱은 바로 연결이 끊겨요.`} className="btn sm dngr">
                              삭제
                            </ConfirmSubmit>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
