/** 날짜 표시 유틸 */
export const fmtDate = (d: Date | null | undefined) =>
  d ? `${d.getMonth() + 1}/${d.getDate()}` : "";

export const fmtDateFull = (d: Date | null | undefined) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";

/** input[type=date]용 yyyy-mm-dd */
export const toDateInput = fmtDateFull;

/** 독서 기간 (일수) */
export const readingDays = (start: Date | null, end: Date | null) => {
  if (!start || !end) return null;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return days > 0 ? days : null;
};
