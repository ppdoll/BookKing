/** 별점 표시 (0~5, 0.5 단위) — rating은 반 개 단위 정수(0~10) */
export function Stars({ rating, size }: { rating: number; size?: number }) {
  const full = Math.floor(rating / 2);
  const half = rating % 2 === 1;
  const off = 5 - full - (half ? 1 : 0);
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined} aria-label={`별점 ${rating / 2}점`}>
      {"★".repeat(full)}
      {half && (
        <span className="half">
          <span className="off">★</span>
          <span className="fill">★</span>
        </span>
      )}
      {off > 0 && <span className="off">{"★".repeat(off)}</span>}
    </span>
  );
}
