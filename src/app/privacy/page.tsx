import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — BookKing",
  description: "BookKing이 수집·이용하는 개인정보와 처리 방침 안내",
};

const CONTACT = "ppdolla@gmail.com";
const EFFECTIVE_DATE = "2026년 7월 29일";

export default function PrivacyPage() {
  return (
    <main className="container" style={{ maxWidth: 720, lineHeight: 1.75 }}>
      <div style={{ margin: "8px 0 18px" }}>
        <Link href="/" className="logo" style={{ fontSize: 20, fontWeight: 900 }}>
          📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900 }}>개인정보 처리방침</h1>
      <p className="mini">시행일: {EFFECTIVE_DATE}</p>

      <p style={{ marginTop: 16 }}>
        BookKing(이하 “서비스”)은 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
        본 방침은 서비스가 어떤 정보를 수집·이용하고 어떻게 보호하는지 설명합니다.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>1. 수집하는 개인정보 항목</h2>
      <ul>
        <li><b>모든 이용자</b>: 서비스 표시 별명(이름), 독서 기록(책 정보·읽기 상태·별점·기억에 남는 문장·감상), 서비스 이용 기록.</li>
        <li><b>구글 로그인 이용자</b>(주로 교사·성인): 구글 계정 이메일, 프로필 정보(이름·프로필 이미지).</li>
        <li>
          <b>학교(교실) 모드 학생</b>: 선생님이 등록한 <b>반번호·별명</b>만 수집합니다. 실명·이메일·연락처·구글 계정은
          수집하지 않으며, 학생 정보는 특정 개인을 직접 식별하지 않는 <b>가명 정보</b>로 처리됩니다.
        </li>
      </ul>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>2. 개인정보의 이용 목적</h2>
      <ul>
        <li>독서 기록 서비스 및 그룹(반) 운영, 회원 식별·로그인 유지</li>
        <li>랭킹·독서 결산 등 서비스 기능 제공</li>
        <li>부정 이용 방지 및 서비스 개선</li>
      </ul>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>3. 보유 및 파기</h2>
      <p>
        개인정보는 수집·이용 목적이 달성되면 지체 없이 파기합니다. 회원 탈퇴, 그룹(반) 삭제, 또는 명렬에서 삭제 시
        관련 정보는 삭제되며, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안만 보관합니다.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>4. 제3자 제공 및 처리위탁·국외 이전</h2>
      <p>
        서비스는 이용자의 개인정보를 제3자에게 판매·제공하지 않습니다. 다만 서비스 운영을 위해 아래의 클라우드
        인프라를 이용하며, 이 과정에서 데이터가 국외 서버에 저장될 수 있습니다.
      </p>
      <ul>
        <li><b>호스팅</b>: Vercel Inc. (데이터 처리·저장, 미국/싱가포르 등 리전)</li>
        <li><b>데이터베이스</b>: Neon Inc. (독서 기록·계정 정보 저장)</li>
      </ul>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>5. 만 14세 미만 아동</h2>
      <p>
        만 14세 미만 아동의 개인정보를 수집·이용할 때에는 법정대리인(보호자)의 동의가 필요합니다. 학교(교실) 모드는
        구글 계정 없이 별명 기반으로 운영되어 개인 식별정보 수집을 최소화합니다. 학교에서 이용하실 경우 학교·교육청의
        개인정보 관련 지침과 보호자 안내 절차를 함께 확인해 주세요.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>6. 이용자·법정대리인의 권리</h2>
      <p>
        이용자 및 법정대리인은 언제든지 자신(또는 아동)의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있습니다.
        학교 모드 학생 정보는 담당 선생님(그룹장)이 그룹 관리 화면에서 수정·삭제할 수 있으며, 그 밖의 요청은 아래
        문의처로 연락해 주세요.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>7. 광고·제휴 링크 안내</h2>
      <p>
        서비스에는 도서 구매·구독을 위한 제휴 링크가 포함될 수 있으며, 이를 통해 운영자가 수수료를 받을 수 있습니다.
        <b> 학교(교실) 모드에서는 이러한 상업 링크가 표시되지 않습니다.</b>
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>8. 문의처</h2>
      <p>개인정보 관련 문의: {CONTACT}</p>

      <p className="mini" style={{ marginTop: 24 }}>
        본 방침은 관련 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 본 페이지에 공지합니다.
      </p>

      <p style={{ marginTop: 20 }}>
        <Link href="/terms" style={{ textDecoration: "underline" }}>이용약관 보기 →</Link>
      </p>
    </main>
  );
}
