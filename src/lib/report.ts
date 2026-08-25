/**
 * 보고서 기준 시각을 한국 시간 문자열로.
 * 배포 서버는 UTC로 동작하므로 오프셋을 직접 적용한다.
 */
export function nowInKst(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())} ${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`;
}
