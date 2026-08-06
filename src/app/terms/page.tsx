import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 — BookKing",
  description: "BookKing 서비스 이용약관",
};

const CONTACT = "ppdolla@gmail.com";
const EFFECTIVE_DATE = "2026년 7월 29일";

export default function TermsPage() {
  return (
    <main className="container" style={{ maxWidth: 720, lineHeight: 1.75 }}>
      <div style={{ margin: "8px 0 18px" }}>
        <Link href="/" className="logo" style={{ fontSize: 20, fontWeight: 900 }}>
          📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900 }}>이용약관</h1>
      <p className="mini">시행일: {EFFECTIVE_DATE}</p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>제1조 (목적)</h2>
      <p>
        본 약관은 BookKing(이하 “서비스”)이 제공하는 그룹 독서 기록 서비스의 이용 조건과 절차, 이용자와 서비스의
        권리·의무를 규정하는 것을 목적으로 합니다.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>제2조 (서비스 내용)</h2>
      <p>
        서비스는 읽은 책의 기록, 별점·문장·감상 공유, 그룹(반) 단위 독서 활동, 랭킹, 독서 결산 등의 기능을 무료로
        제공합니다. 서비스 내용은 운영상 필요에 따라 변경될 수 있습니다.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>제3조 (계정과 이용)</h2>
      <ul>
        <li>이용자는 구글 로그인 또는 학교(교실) 모드의 반번호·비밀번호로 서비스를 이용합니다.</li>
        <li>학교(교실) 모드에서는 담당 선생님(그룹장)이 명렬(반번호·별명)과 입장 비밀번호를 관리합니다.</li>
        <li>이용자는 타인의 계정·반번호를 도용하거나 부정하게 이용해서는 안 됩니다.</li>
      </ul>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>제4조 (이용자의 의무·금지행위)</h2>
      <ul>
        <li>타인의 권리를 침해하거나 모욕·비방·음란·불법적인 내용을 게시하는 행위</li>
        <li>서비스의 정상적인 운영을 방해하는 행위</li>
        <li>타인의 개인정보를 무단으로 수집·게시하는 행위</li>
      </ul>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>제5조 (게시물과 저작권)</h2>
      <p>
        이용자가 작성한 독서 기록·문장·감상 등 게시물의 권리는 작성자에게 있습니다. 서비스는 기능 제공에 필요한
        범위에서 게시물을 저장·표시합니다. 운영자는 관계 법령이나 본 약관을 위반한 게시물을 사전 통지 없이 삭제할 수
        있습니다.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>제6조 (광고·제휴)</h2>
      <p>
        서비스에는 도서 구매·구독을 위한 제휴 링크가 포함될 수 있고, 이를 통해 운영자가 수수료를 받을 수 있습니다.
        학교(교실) 모드에서는 상업 링크가 표시되지 않습니다.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>제7조 (면책)</h2>
      <p>
        서비스는 무료로 제공되며, 천재지변·인프라 장애 등 불가항력으로 인한 서비스 중단이나 이용자 게시물로 인한
        분쟁에 대해 관련 법령이 허용하는 범위에서 책임을 지지 않습니다.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>제8조 (미성년자·학교 이용)</h2>
      <p>
        학교에서의 이용은 담당 교사의 관리 아래 이루어지며, 학생 개인정보는 <Link href="/privacy" style={{ textDecoration: "underline" }}>개인정보 처리방침</Link>에
        따라 최소한으로(가명) 처리됩니다. 학교·교육청의 관련 지침을 함께 준수해 주세요.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>제9조 (약관의 변경·문의)</h2>
      <p>
        본 약관은 관련 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 본 페이지에 공지합니다. 문의: {CONTACT}
      </p>
    </main>
  );
}
