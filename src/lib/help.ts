/**
 * 막혔을 때 도움말(/help)의 항목 id.
 * 오류 안내마다 "어떻게 해야 하나요?" 링크로 해당 항목에 바로 보내므로,
 * 도움말 페이지와 오류 화면이 같은 id를 쓰도록 여기 한 곳에서 정한다.
 */
export const HELP = {
  link: "link", // 유효하지 않은 입장 링크
  nickname: "nickname", // 명단에 없는 별명
  classPw: "class-pw", // 반 비밀번호가 틀림
  myPw: "my-pw", // 내 비밀번호가 틀림·잊음
  wrongPerson: "wrong-person", // 친구 계정으로 들어감
  notReady: "not-ready", // 입장 준비 중(반 비밀번호 미설정)
  ended: "ended", // 활동이 끝난 반(만료)
  inApp: "in-app", // 카카오톡 등 앱 안 브라우저
  loggedOut: "logged-out", // 로그아웃됨·다른 기기
  error: "error", // "잠깐 문제가 생겼어요" 오류 화면
  google: "google", // (선생님·보호자) 구글 로그인
} as const;

export type HelpId = (typeof HELP)[keyof typeof HELP];

export const helpHref = (id?: HelpId) => (id ? `/help#${id}` : "/help");

/** 학생·선생님이 해결 못 할 때 연락할 곳 — 개인정보 처리방침의 문의처와 같다 */
export const SUPPORT_EMAIL = "ppdolla@gmail.com";
