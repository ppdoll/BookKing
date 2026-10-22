import { qrSvg } from "@/lib/qr";

/**
 * 링크를 QR 그림으로 보여주는 서버 컴포넌트.
 * SVG는 우리가 만든 링크(서버가 발급한 초대 코드)로만 생성하므로 그대로 넣어도 안전하다.
 * size를 주면 그 크기로 고정하고, 없으면 className(CSS)으로 크기를 정한다.
 */
export async function QrCode({
  text,
  label,
  size,
  className,
}: {
  text: string;
  label: string;
  size?: number;
  className?: string;
}) {
  const svg = await qrSvg(text);
  return (
    <span
      role="img"
      aria-label={label}
      className={className ? `qr ${className}` : "qr"}
      style={size ? { width: size, height: size } : undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
