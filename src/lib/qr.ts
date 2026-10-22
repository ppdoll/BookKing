import QRCode from "qrcode";

/**
 * 입장·초대 링크용 QR — 서버에서 직접 만든다.
 * 외부 QR 생성 서비스를 쓰면 학생 입장 링크가 제3자에게 넘어가므로 쓰지 않는다.
 *
 * 인쇄해 교실에 붙여두는 용도라 오류 정정은 Q(약 25% 손상까지 복구),
 * 테두리 여백(quiet zone)은 스캔에 필요한 최소치인 4칸을 지킨다.
 */
const OPTIONS = {
  errorCorrectionLevel: "Q" as const,
  margin: 4,
  color: { dark: "#3b2f28", light: "#ffffff" },
};

/** 화면·인쇄용 — 어떤 크기로 키워도 선명한 SVG 문자열 */
export function qrSvg(text: string) {
  return QRCode.toString(text, { ...OPTIONS, type: "svg" });
}

/** 저장용 — 한글 문서·발표 자료에 붙여 넣기 좋은 PNG (data URL) */
export function qrPngDataUrl(text: string, width = 1024) {
  return QRCode.toDataURL(text, { ...OPTIONS, type: "image/png", width });
}
