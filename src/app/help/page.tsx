import type { Metadata } from "next";
import Link from "next/link";
import { HELP, SUPPORT_EMAIL, type HelpId } from "@/lib/help";
import { BackButton } from "@/components/BackButton";

export const metadata: Metadata = {
  title: "막혔을 때 도움말 — BookKing",
  description: "우리 반 독서장에 들어가지 못할 때 — 화면에 나온 말을 찾아 하나씩 따라 해 보세요.",
};

type Item = {
  id: HelpId;
  icon: string;
  /** 목차에 보이는 짧은 이름 */
  short: string;
  /** 학생이 실제로 보는 화면 문구(또는 상황) */
  title: string;
  steps: React.ReactNode[];
  /** 선생님께 그대로 말하면 되는 문장 */
  say?: string;
  /** 선생님이 할 일 */
  teacher?: React.ReactNode;
};

const ITEMS: Item[] = [
  {
    id: HELP.link,
    icon: "😢",
    short: "입장 링크가 안 열려요",
    title: "“유효하지 않은 입장 링크예요”가 나와요",
    steps: [
      "링크를 끝까지 다 복사했는지 확인해요. 중간에 잘리면 열리지 않아요.",
      "QR 코드라면 카메라로 다시 한번 비춰 봐요.",
      "선생님이 링크를 새로 만드셨을 수 있어요. 새 링크나 QR을 받아요.",
    ],
    say: "입장 링크가 안 열려요. 새 링크를 주실 수 있나요?",
    teacher: (
      <>
        그룹 관리의 <b>학생 입장 링크·QR</b>을 다시 나눠 주세요. <b>새 링크 발급</b>을 누르면 예전 링크와
        붙여 둔 QR은 더 이상 열리지 않아요.
      </>
    ),
  },
  {
    id: HELP.nickname,
    icon: "✏️",
    short: "별명이 명단에 없대요",
    title: "“명단에 없는 별명이에요”가 나와요",
    steps: [
      "띄어쓰기와 받침을 확인해요. (예: 책읽는사자 ↔ 책 읽는 사자)",
      <>
        선생님이 <b>번호</b>(예: 10205)를 별명으로 정해 주셨을 수도 있어요.
      </>,
      "그래도 안 되면 선생님께 내 별명을 여쭤봐요.",
    ],
    say: "제 별명이 명단에 없대요. 제 별명이 뭐예요?",
    teacher: (
      <>
        그룹 관리 → <b>학생 입장 관리</b>의 명단에서 그 학생의 별명을 확인하거나 추가해 주세요.
      </>
    ),
  },
  {
    id: HELP.classPw,
    icon: "🔑",
    short: "반 비밀번호가 틀렸대요",
    title: "“반 비밀번호가 맞지 않아요”가 나와요",
    steps: [
      <>
        <b>반 비밀번호</b>는 우리 반이 다 같이 쓰는 비밀번호예요. 선생님이 수업 때 알려 주세요.
      </>,
      "영어 대문자·소문자와 띄어쓰기를 확인해요. 자판이 한글로 쳐지고 있지 않은지도 봐요.",
      "기억이 안 나면 선생님께 다시 여쭤봐요.",
    ],
    say: "반 비밀번호를 다시 알려 주세요.",
    teacher: (
      <>
        반 비밀번호는 암호로 바꿔서 저장하기 때문에 선생님도 다시 볼 수 없어요. 기억나지 않으면 그룹 관리 →
        학생 입장 관리에서 <b>새로 정한 뒤</b> 알려 주세요.
      </>
    ),
  },
  {
    id: HELP.myPw,
    icon: "🤔",
    short: "내 비밀번호를 잊었어요",
    title: "“비밀번호가 맞지 않아요”가 나와요 · 내 비밀번호를 잊었어요",
    steps: [
      <>
        <b>내 비밀번호</b>는 처음 들어올 때 <b>내가 직접 정한</b> 비밀번호예요. 반 비밀번호와 달라요.
      </>,
      "자판이 한글로 쳐지고 있지 않은지, 대문자·소문자를 확인해요.",
      <>
        정말 기억이 안 나면 선생님께 <b>비밀번호 초기화</b>를 부탁해요.
      </>,
      "초기화가 끝나면 반 비밀번호로 다시 들어와서 새 비밀번호를 정하면 돼요. 내 기록은 그대로 남아 있어요.",
    ],
    say: "제 별명은 ○○○예요. 비밀번호를 잊어버렸어요. 초기화해 주세요.",
    teacher: (
      <>
        그룹 관리 → 학생 입장 관리 명단에서 그 학생의 <b>🔑 비번 초기화</b>를 눌러 주세요. 기록은 그대로
        남아요. (<b>배정 초기화</b>는 계정 연결을 끊어서 다시 들어오면 새 계정이 되니, 비밀번호 문제에는 쓰지
        마세요.)
      </>
    ),
  },
  {
    id: HELP.wrongPerson,
    icon: "🔄",
    short: "친구 이름으로 들어갔어요",
    title: "친구 이름으로 들어가졌어요",
    steps: [
      <>
        “비밀번호를 정해주세요” 화면이라면 아래쪽의 <b>🔄 내가 아니에요</b> 버튼을 눌러요.
      </>,
      <>
        이미 들어갔다면 <b>로그아웃</b>한 뒤 내 별명으로 다시 들어가요. (휴대폰: 화면 아래 <b>☰ 더보기</b> →
        로그아웃)
      </>,
      "친구 계정에 비밀번호까지 정해 버렸다면 선생님께 알려요.",
    ],
    say: "친구 계정으로 잘못 들어가서 비밀번호를 정해 버렸어요.",
    teacher: (
      <>
        잘못 정해진 <b>그 친구의 🔑 비번 초기화</b>를 눌러 주세요. 그 친구가 반 비밀번호로 다시 들어와 자기
        비밀번호를 정하면 돼요.
      </>
    ),
  },
  {
    id: HELP.notReady,
    icon: "🔒",
    short: "입장 준비 중이래요",
    title: "“아직 입장 준비 중이에요”가 나와요",
    steps: ["선생님이 아직 반 비밀번호를 정하지 않으셨어요. 조금만 기다려요."],
    say: "입장 준비 중이라고 나와요.",
    teacher: (
      <>
        그룹 관리 → 학생 입장 관리에서 <b>입장 비밀번호</b>를 정해 주세요.
      </>
    ),
  },
  {
    id: HELP.ended,
    icon: "🗓",
    short: "활동이 끝난 반이래요",
    title: "“활동이 끝난 반이에요”가 나와요",
    steps: [
      "선생님이 정한 날짜가 지나서 반과 기록이 정리됐어요. 이 반에는 다시 들어갈 수 없어요.",
      "새 반에 들어가야 한다면 선생님께 새 입장 링크를 받아요.",
    ],
  },
  {
    id: HELP.inApp,
    icon: "💬",
    short: "카카오톡에서 열었어요",
    title: "카카오톡·인스타그램에서 열었더니 이상해요",
    steps: [
      "앱 안에서 열린 화면에서는 일부 기능이 막힐 수 있어요.",
      <>
        화면 위쪽 메뉴(<b>⋮</b> 또는 공유 버튼)에서 <b>“다른 브라우저로 열기”</b>를 눌러 크롬이나 사파리로 열어요.
      </>,
      "학생 입장(별명·비밀번호)은 앱 안에서도 돼요. 구글 로그인은 꼭 크롬·사파리에서 해요.",
    ],
  },
  {
    id: HELP.loggedOut,
    icon: "🚪",
    short: "로그아웃됐어요",
    title: "로그아웃됐어요 · 다른 기기에서 들어가고 싶어요",
    steps: [
      <>
        선생님이 준 <b>우리 반 입장 링크(QR)</b>로 들어가요. 구글 로그인 버튼은 누르지 않아도 돼요.
      </>,
      <>
        <b>내 별명</b> → <b>내 비밀번호</b>를 입력하면 돼요.
      </>,
      "휴대폰을 바꾸거나 인터넷 기록을 지우면 다시 들어와야 해요. 입장 링크를 즐겨찾기해 두면 편해요.",
    ],
  },
  {
    id: HELP.error,
    icon: "🛠",
    short: "“문제가 생겼어요” 화면",
    title: "“잠깐 문제가 생겼어요” 화면이 나와요",
    steps: [
      <>
        잠시 기다렸다가 <b>🔄 다시 시도</b>를 눌러요. 대부분 금방 괜찮아져요.
      </>,
      "와이파이나 데이터가 연결돼 있는지 확인해요.",
      <>
        계속 같은 화면이 나오면 화면에 있는 <b>오류 코드</b>를 선생님께 알려 드려요.
      </>,
    ],
    say: "“문제가 생겼어요” 화면이 계속 나와요. 오류 코드는 ○○○예요.",
    teacher: (
      <>
        여러 학생에게 같은 화면이 나오면 오류 코드와 시각을 적어 <b>{SUPPORT_EMAIL}</b>로 알려 주세요.
      </>
    ),
  },
  {
    id: HELP.google,
    icon: "👩‍🏫",
    short: "(선생님) 구글 로그인",
    title: "(선생님·보호자) 구글 로그인이 안 돼요 · 다른 계정으로 들어가졌어요",
    steps: [
      <>
        로그인하면 <b>구글 계정을 고르는 화면</b>이 나와요. 쓰려는 계정을 고르고, 목록에 없으면{" "}
        <b>“다른 계정 사용”</b>을 눌러요.
      </>,
      <>
        지금 어떤 계정인지는 화면 오른쪽 위(휴대폰은 <b>☰ 더보기</b>)에 <b>Ⓖ 이메일</b>로 나와요. 다른 계정이면
        로그아웃한 뒤 다시 로그인하면서 맞는 계정을 골라요.
      </>,
      "카카오톡 같은 앱 안에서 열면 구글이 로그인을 막아요. 크롬·사파리로 열어 주세요.",
      "학교 구글 계정은 학교에서 바깥 서비스 로그인을 막아 둔 경우가 있어요. 개인 구글(gmail) 계정으로 시도해 보세요.",
      <>
        <b>학생은 구글 로그인이 필요 없어요.</b> 선생님이 준 반 입장 링크로 들어가요.
      </>,
      <>
        그래도 안 되면 <b>{SUPPORT_EMAIL}</b>로 알려 주세요.
      </>,
    ],
  },
];

/** 막혔을 때 도움말 — 학생이 화면에 나온 말을 찾아 하나씩 따라 하도록 (로그인 없이 열림) */
export default function HelpPage() {
  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <p className="fieldrow" style={{ gap: 8, margin: "4px 0 14px" }}>
        <BackButton />
        <span style={{ flex: 1 }} />
        <Link href="/" className="logo" style={{ fontSize: 18 }}>
          📚 Book<em>King</em>
        </Link>
      </p>

      <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>🙋 막혔을 때 도움말</h1>
      <p className="mini" style={{ margin: "0 0 14px" }}>
        화면에 나온 말을 아래에서 찾아 하나씩 따라 해 보세요. 그래도 안 되면 <b>이 화면을 선생님께 보여 드려요</b>.
      </p>

      <nav className="help-toc" aria-label="도움말 목차">
        {ITEMS.map((it) => (
          <a key={it.id} href={`#${it.id}`} className="fchip">
            {it.icon} {it.short}
          </a>
        ))}
      </nav>

      {ITEMS.map((it) => (
        <section key={it.id} id={it.id} className="card help-item">
          <h2>
            {it.icon} {it.title}
          </h2>
          <p className="mini" style={{ margin: "0 0 4px", fontWeight: 800 }}>이렇게 해 보세요</p>
          <ol>
            {it.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {it.say && (
            <p className="help-say">
              💬 선생님께 이렇게 말해요 — <b>“{it.say}”</b>
            </p>
          )}
          {it.teacher && <p className="help-teacher">👩‍🏫 선생님은: {it.teacher}</p>}
        </section>
      ))}

      <p className="mini" style={{ textAlign: "center", margin: "18px 0 0" }}>
        <Link href="/manual.html" style={{ textDecoration: "underline" }}>
          전체 사용 설명서 보기
        </Link>
      </p>
    </main>
  );
}
