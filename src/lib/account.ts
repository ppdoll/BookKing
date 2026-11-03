/**
 * 구글로 가입한 계정이면 그 구글 이메일, 아니면 null.
 * 학생(class-…@bookking.local)·개발용(dev-…@dev.local) 계정의 이메일은 src/auth.ts가
 * 지어 붙인 가짜 주소라 화면에 보여주지 않는다. 그 밖의 로그인 방법은 구글뿐이다.
 */
export function googleEmail(email: string | null | undefined): string | null {
  if (!email || /@(bookking|dev)\.local$/i.test(email)) return null;
  return email;
}
