"use client";

import { useState } from "react";

/** 별점 입력 (0.5 단위) — hidden input "stars"에 0~5 값 저장 */
export function StarInput({ defaultStars }: { defaultStars?: number | null }) {
  const [stars, setStars] = useState<number>(defaultStars ?? 0);

  return (
    <div className="starinput">
      <span className="srow">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ display: "inline-flex" }}>
            <button
              type="button"
              className={stars >= n - 0.5 ? "lit" : ""}
              aria-label={`별 ${n - 0.5}개`}
              onClick={() => setStars(n - 0.5)}
            >
              ★
            </button>
            <button
              type="button"
              className={`rhalf ${stars >= n ? "lit" : ""}`}
              aria-label={`별 ${n}개`}
              onClick={() => setStars(n)}
            >
              ★
            </button>
          </span>
        ))}
      </span>
      <b className="num" style={{ fontSize: 15 }}>{stars.toFixed(1)}</b>
      {stars > 0 && (
        <button type="button" className="btn sm" onClick={() => setStars(0)}>
          지우기
        </button>
      )}
      <input type="hidden" name="stars" value={stars > 0 ? String(stars) : ""} />
    </div>
  );
}
