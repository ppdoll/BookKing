import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://book-king-two.vercel.app";
const TITLE = "독서록·독서장 쓰는 법 — 꾸준히 기록하는 방법";
const DESCRIPTION =
  "독서록과 독서장의 차이부터 무엇을 적을지, 초등학생 독서록 쓰는 법, 꾸준히 쓰는 습관, 학급에서 독서록을 관리하는 방법까지 정리했어요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "독서록",
    "독서장",
    "독서록 쓰는 법",
    "독서장 쓰는 법",
    "초등 독서록",
    "독서 기록",
    "독서 감상문",
    "독서모임",
    "학급 독서록",
  ],
  alternates: { canonical: `${SITE_URL}/tips` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/tips`,
    siteName: "BookKing",
    locale: "ko_KR",
    type: "article",
  },
};

/** 섹션 제목 — 검색에서 그대로 잡히도록 질문형으로 */
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 19, fontWeight: 900, margin: "30px 0 10px" }}>{children}</h2>;
}

export default function TipsPage() {
  return (
    <main className="container" style={{ maxWidth: 720, lineHeight: 1.8 }}>
      <div style={{ margin: "8px 0 18px" }}>
        <Link href="/" className="logo" style={{ fontSize: 20, fontWeight: 900 }}>
          📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
        </Link>
      </div>

      <h1 style={{ fontSize: 25, fontWeight: 900, lineHeight: 1.4 }}>
        📖 독서록·독서장 쓰는 법
      </h1>
      <p className="mini" style={{ margin: "4px 0 0" }}>
        무엇을 적을지, 어떻게 꾸준히 쓸지, 학급에서 어떻게 관리할지 정리했어요.
      </p>

      <H2>독서록과 독서장, 무엇이 다른가요?</H2>
      <p>
        <b>독서록</b>은 책 한 권을 읽고 남기는 <b>한 편의 기록</b>이에요. 줄거리, 인상 깊은 문장,
        느낀 점을 적죠. <b>독서장</b>은 그런 독서록이 <b>쌓여서 만들어지는 공책 전체</b>를 가리켜요.
        학교에서 “독서장을 쓴다”고 하면 보통 한 권짜리 독서 공책에 계속 기록을 더해 가는 걸 뜻해요.
      </p>
      <p>
        둘을 굳이 나눌 필요는 없어요. 중요한 건 <b>한 권 읽을 때마다 짧게라도 남기고, 그게 쌓이는 것</b>이에요.
        기록이 쌓이면 “내가 이만큼 읽었구나”가 눈에 보여서 다음 책을 펼치기가 훨씬 쉬워져요.
      </p>

      <H2>독서록에 무엇을 적을까요? — 5가지만 기억하세요</H2>
      <div className="card">
        <table className="mt">
          <tbody>
            <tr>
              <td style={{ width: 96 }}><b>① 책 정보</b></td>
              <td>제목·글쓴이·출판사. 나중에 다시 찾을 때 꼭 필요해요</td>
            </tr>
            <tr>
              <td><b>② 읽은 날</b></td>
              <td>시작한 날과 다 읽은 날. 며칠 걸렸는지 알면 다음 계획이 쉬워져요</td>
            </tr>
            <tr>
              <td><b>③ 별점</b></td>
              <td>5점 만점으로 간단히. 나중에 “최고의 책”을 고를 때 기준이 돼요</td>
            </tr>
            <tr>
              <td><b>④ 기억에 남는 문장</b></td>
              <td>딱 한 문장이면 충분해요. 그대로 옮겨 적는 것만으로도 좋은 독서록이 돼요</td>
            </tr>
            <tr>
              <td><b>⑤ 느낀 점</b></td>
              <td>두세 줄이면 돼요. 아래 질문 중 하나만 답해도 좋아요</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>무엇을 쓸지 막막할 때 — 골라 쓰는 질문 10개</H2>
      <p>
        느낀 점을 쓰라고 하면 “재미있었다”에서 멈추기 쉬워요. 그럴 땐 아래 질문 중 <b>하나만 골라</b> 답해보세요.
      </p>
      <div className="card">
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>가장 마음에 든 인물은 누구이고, 왜 그런가요?</li>
          <li>내가 그 인물이었다면 어떻게 했을까요?</li>
          <li>가장 놀랐던 장면은 어디였나요?</li>
          <li>이해가 안 되거나 궁금했던 부분이 있나요?</li>
          <li>읽기 전에 예상한 것과 어떻게 달랐나요?</li>
          <li>내 경험 중 비슷한 일이 있었나요?</li>
          <li>작가는 이 책으로 무슨 말을 하고 싶었을까요?</li>
          <li>이 책을 누구에게 추천하고 싶나요?</li>
          <li>제목을 다시 짓는다면 뭐라고 할까요?</li>
          <li>이 책 다음에 읽고 싶어진 책이 있나요?</li>
        </ol>
      </div>

      <H2>초등학생 독서록, 이렇게 시작하세요</H2>
      <p>
        처음부터 길게 쓰게 하면 독서 자체가 숙제처럼 느껴져요. <b>짧게 시작해서 늘려가는 것</b>이 훨씬 오래 갑니다.
      </p>
      <ul>
        <li><b>1~2학년</b> — 제목, 별점, 좋았던 장면 <b>한 줄</b>이면 충분해요. 그림을 곁들여도 좋아요.</li>
        <li><b>3~4학년</b> — 기억에 남는 문장 하나를 그대로 옮겨 적고, 왜 좋았는지 <b>두 줄</b>.</li>
        <li><b>5~6학년</b> — 위 질문 10개 중 하나를 골라 <b>대여섯 줄</b>. 인물·주제로 생각을 확장해요.</li>
      </ul>
      <div className="card" style={{ background: "var(--sun-soft)" }}>
        <p style={{ margin: 0 }}>
          💡 <b>맞춤법을 먼저 고치지 마세요.</b> 처음엔 &ldquo;쓰는 게 즐겁다&rdquo;가 가장 중요해요.
          내용에 대해 한 마디 반응해 주는 것이 빨간 펜보다 훨씬 큰 힘이 됩니다.
        </p>
      </div>

      <H2>꾸준히 쓰는 습관, 어떻게 만들까요?</H2>
      <ul>
        <li><b>다 읽고 몰아 쓰지 않기</b> — 읽는 도중 마음에 걸린 문장을 그때그때 적어두면 훨씬 수월해요.</li>
        <li><b>완독만 기록하지 않기</b> — &ldquo;읽을 예정&rdquo;과 &ldquo;읽는 중&rdquo;도 남기면 흐름이 끊기지 않아요.</li>
        <li><b>같은 시간에</b> — 자기 전 5분처럼 정해두면 기억에 의존하지 않아도 돼요.</li>
        <li><b>혼자보다 함께</b> — 친구·가족이 뭘 읽는지 보이면 &ldquo;나도 한 권&rdquo; 하게 돼요.</li>
        <li><b>숫자로 확인하기</b> — 이번 달 몇 권인지 보이면 그 자체가 동기가 돼요.</li>
      </ul>

      <H2>학급에서 독서록을 관리하는 방법 (선생님용)</H2>
      <p>
        종이 독서장은 걷고 나눠주는 데만 시간이 많이 들고, 누가 얼마나 읽었는지 한눈에 보기 어려워요.
        학급 단위로 운영할 때는 아래를 확인해 보세요.
      </p>
      <ul>
        <li><b>개인정보</b> — 실명 대신 <b>별명</b>으로 쓰게 하면 안전해요. 학생 기록에 이름·연락처가 남지 않게요.</li>
        <li><b>참여 현황</b> — 누가 아직 한 권도 안 썼는지 파악할 수 있어야 독려가 가능해요.</li>
        <li><b>비공개 배려</b> — 개인적인 감상은 친구에게 안 보이고 선생님만 볼 수 있으면 아이들이 더 솔직해져요.</li>
        <li><b>학년말 정리</b> — 활동이 끝나면 학생 기록을 정해진 시점에 정리하는 절차를 미리 정해두세요.</li>
      </ul>

      <H2>독서모임에서 기록을 나누는 법</H2>
      <ul>
        <li><b>한 문장씩 가져오기</b> — 각자 인상 깊은 문장 하나만 가져와 읽어도 대화가 시작돼요.</li>
        <li><b>별점 먼저 공개</b> — 점수가 갈릴수록 이야기가 재미있어져요.</li>
        <li><b>추천은 대상과 함께</b> — &ldquo;누구에게 권하고 싶은지&rdquo;를 붙이면 훨씬 유용한 추천이 돼요.</li>
      </ul>

      <div className="card" style={{ marginTop: 28, textAlign: "center" }}>
        <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800 }}>
          📚 독서록·독서장을 온라인으로 써보세요
        </p>
        <p className="mini" style={{ margin: "0 0 12px" }}>
          BookKing은 가족·친구·학급이 <b>함께 쓰는 무료 독서장</b>이에요. 읽을 예정 → 독서중 → 완독 3단계로
          정리되고, 별점·기억에 남는 문장·느낀 점을 남기면 나만의 독서 결산이 자동으로 만들어져요.
        </p>
        <Link href="/login" className="btn pri">무료로 시작하기</Link>
        <p className="mini" style={{ margin: "10px 0 0" }}>
          <Link href="/manual.html" style={{ textDecoration: "underline" }}>사용 설명서 보기</Link>
          {" · "}
          <Link href="/privacy" style={{ textDecoration: "underline" }}>개인정보 처리방침</Link>
        </p>
      </div>
    </main>
  );
}
