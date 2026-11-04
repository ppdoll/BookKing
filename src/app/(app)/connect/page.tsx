import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { fmtDateFull } from "@/lib/format";
import { requestOrigin } from "@/lib/origin";
import { API_TOKEN_LIMIT, canUseAiConnect } from "@/lib/api-token";
import { revokeTokenAction } from "@/lib/actions/token-actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { TokenIssueForm } from "@/components/TokenIssueForm";
import { CopyButton } from "@/components/CopyButton";

/** Claude 대화창에 그대로 붙여 쓰는 질문 예시 */
const EXAMPLES: { who: string; items: string[] }[] = [
  {
    who: "학교 모드 선생님",
    items: [
      "BookKing에서 우리 학교 그룹 현황을 정리해 줘. 반별 입장·참여율과 챙겨볼 반을 표로 보여 주고, 이번 주에 할 일을 3가지로 제안해 줘.",
      "BookKing에서 3학년 2반 학생 목록을 보고, 아직 입장하지 않은 학생과 입장했지만 기록이 없는 학생을 반번호 순으로 알려 줘.",
      "BookKing 반 대항 순위와 개인 상위 10명을 알려 주고, 학생들에게 공지할 짧은 응원 글을 써 줘.",
      "BookKing에서 우리 학교 학생들이 많이 읽은 책과 별점 높은 책을 알려 주고, 다음 달 추천 도서 5권을 골라 줘.",
    ],
  },
  {
    who: "내 독서 기록",
    items: [
      "BookKing 내 책장에서 올해 완독한 책을 월별로 정리해 줘.",
      "어린 왕자를 오늘 다 읽었어. 별점 4.5로 BookKing 개인 책장에 기록해 줘.",
      "BookKing에서 지금 읽고 있는 책 목록을 보여 줘.",
    ],
  },
];

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
            <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>🔗 연결 주소 만들기</h3>
            <p className="mini" style={{ margin: "0 0 10px" }}>
              연결 주소를 만들어 Claude 설정의 <b>커스텀 커넥터</b>에 한 번 붙여넣으면 끝이에요. 이 주소는 내 계정으로 BookKing에
              들어가는 열쇠라, 남에게 보내지 말고 잃어버리면 아래에서 지우세요. (최대 {API_TOKEN_LIMIT}개)
            </p>
            {tokens.length >= API_TOKEN_LIMIT ? (
              <p className="mini" style={{ margin: 0, fontWeight: 700 }}>연결 주소가 {API_TOKEN_LIMIT}개라 더 만들 수 없어요. 안 쓰는 주소를 먼저 지워주세요.</p>
            ) : (
              <TokenIssueForm endpoint={endpoint} />
            )}
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>💬 이렇게 물어보세요</h3>
            <p className="mini" style={{ margin: "0 0 10px" }}>
              연결한 뒤 Claude 대화창에 복사해 붙여넣으세요. 질문에 <b>BookKing</b>을 넣으면 Claude가 BookKing을 찾아봐요.
            </p>
            {EXAMPLES.map((g) => (
              <div key={g.who} style={{ marginBottom: 10 }}>
                <p className="mini" style={{ margin: "0 0 4px", fontWeight: 800 }}>{g.who}</p>
                {g.items.map((q) => (
                  <div key={q} className="fieldrow" style={{ gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: "1.5px dashed var(--soft-line)" }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{q}</span>
                    <CopyButton text={q} />
                  </div>
                ))}
              </div>
            ))}
          </section>

          <section className="card">
            <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
              내 연결 주소 <span className="mini">{tokens.length}개</span>
            </h3>
            {tokens.length === 0 ? (
              <p className="mini" style={{ margin: 0 }}>아직 만든 연결 주소가 없어요.</p>
            ) : (
              <div className="tablewrap">
                <table className="mt">
                  <thead>
                    <tr><th>이름</th><th>구분</th><th>만든 날</th><th>마지막 사용</th><th style={{ width: 70 }}></th></tr>
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
                            <ConfirmSubmit message={`『${t.name}』 연결 주소를 지울까요? 이 주소를 넣은 Claude는 바로 연결이 끊겨요.`} className="btn sm dngr">
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
