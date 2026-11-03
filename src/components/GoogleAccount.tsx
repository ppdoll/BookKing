/**
 * 지금 로그인한 구글 계정 — 학교·개인 구글 계정을 함께 쓰는 사람이
 * 어느 계정으로 들어와 있는지 바로 알아보게 한다.
 */
export function GoogleAccount({ email }: { email: string }) {
  // 좁은 화면에서 긴 주소가 줄바꿈될 때 "@se / nedu.kr"처럼 끊기지 않고 @ 앞에서 끊기게
  const at = email.lastIndexOf("@");
  return (
    <span className="acct" title={`로그인한 구글 계정: ${email}`}>
      <span className="acct-g" aria-hidden="true">G</span>
      <span className="acct-email">
        {at > 0 ? (
          <>
            {email.slice(0, at)}
            <wbr />
            {email.slice(at)}
          </>
        ) : (
          email
        )}
      </span>
    </span>
  );
}
