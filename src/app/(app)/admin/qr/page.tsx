import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, getCurrentMembership, isOwner } from "@/lib/session";
import { fmtDateFull } from "@/lib/format";
import { requestOrigin } from "@/lib/origin";
import { qrPngDataUrl } from "@/lib/qr";
import { QrCode } from "@/components/QrCode";
import { PrintButton } from "@/components/PrintButton";

/**
 * 입장·초대 QR 안내문 — 수업 화면에 띄우거나 인쇄해 교실에 붙여두는 용도.
 * 학교 모드 그룹은 학생 입장 링크, 일반 그룹은 초대 링크를 보여준다.
 * (학교 모드에서 초대 링크는 어차피 학생 입장 화면으로 넘어가므로 따로 만들지 않는다)
 */
export default async function AdminQrPage() {
  const user = await requireUser("/admin/qr");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isOwner(membership.role) || membership.group.isPersonal) redirect("/");

  const group = membership.group;
  const isClass = group.classroomMode;
  const origin = await requestOrigin();
  const url = `${origin}/${isClass ? "class" : "join"}/${group.inviteCode}`;
  // 만료된 초대 링크로 QR을 인쇄하면 붙여둔 뒤에야 안 열리는 걸 알게 된다 — 아예 만들지 않는다
  const inviteExpired = !isClass && group.inviteExpiresAt < new Date();
  const png = inviteExpired ? null : await qrPngDataUrl(url);
  const fileName = `BookKing-${isClass ? "입장" : "초대"}QR-${group.name.replace(/[\\/:*?"<>|]/g, "")}.png`;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <p className="fieldrow no-print" style={{ gap: 8, marginBottom: 14 }}>
        <Link href="/admin/group" className="btn sm">← 그룹 관리로</Link>
        <span style={{ flex: 1 }} />
        {png && (
          <a href={png} download={fileName} className="btn sm">⬇ QR 이미지 저장</a>
        )}
        {png && <PrintButton />}
      </p>

      <div className="card print-plain qr-sheet">
        <p className="logo" style={{ margin: 0, fontSize: 20 }}>
          📚 Book<em>King</em>
        </p>
        <h1 style={{ margin: "6px 0 2px", fontSize: 24, fontWeight: 900 }}>『{group.name}』</h1>
        <p className="mini" style={{ margin: "0 0 18px" }}>
          {isClass ? "우리 반 독서장 입장 QR" : "그룹 초대 QR"}
        </p>

        {inviteExpired ? (
          <div className="toast err" style={{ textAlign: "left" }}>
            ⏰ 초대 링크가 만료됐어요. <Link href="/admin/group" style={{ textDecoration: "underline" }}>그룹 관리</Link>에서
            새 링크를 발급한 뒤 QR을 다시 만들어주세요.
          </div>
        ) : (
          <>
            <QrCode text={url} label={isClass ? "학생 입장 링크 QR" : "초대 링크 QR"} className="qr-big" />

            <ol className="qr-steps">
              <li>📱 휴대폰 카메라로 QR을 비춰요</li>
              {isClass ? (
                <>
                  <li>✏️ 선생님이 정해준 <b>별명</b>을 입력해요</li>
                  <li>
                    🔑 처음엔 <b>반 비밀번호</b>(선생님이 알려줘요)를 넣고 <b>내 비밀번호</b>를 정해요
                  </li>
                  <li>🎉 다음부터는 <b>별명 + 내 비밀번호</b>로 들어와요</li>
                </>
              ) : (
                <>
                  <li>🔑 구글 계정으로 로그인해요</li>
                  <li>
                    🎉 『{group.name}』에 가입하면 끝!
                    {group.joinApproval && " (그룹장이 승인하면 들어올 수 있어요)"}
                  </li>
                </>
              )}
            </ol>

            <p className="mini" style={{ margin: "18px 0 0" }}>
              QR이 안 찍히면 주소를 직접 입력하세요
              <br />
              <b className="qr-url">{url}</b>
            </p>
            {!isClass && (
              <p className="mini" style={{ margin: "8px 0 0" }}>
                이 링크는 <b>{fmtDateFull(group.inviteExpiresAt)}</b>까지 유효해요.
              </p>
            )}
          </>
        )}
      </div>

      <p className="mini no-print" style={{ marginTop: 14 }}>
        💡 수업 화면에 띄우거나 인쇄해서 교실에 붙여두세요. 그룹 관리에서 <b>새 링크 발급</b>을 누르면
        이 QR은 더 이상 열리지 않으니, 그때는 새 QR을 다시 나눠주세요.
      </p>
    </div>
  );
}
