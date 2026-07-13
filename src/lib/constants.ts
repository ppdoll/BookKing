// 역할 (그룹별로 부여)
export const ROLE = {
  OWNER: "OWNER", // 그룹장
  ADMIN: "ADMIN", // 운영자
  MEMBER: "MEMBER", // 사용자
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "그룹장",
  ADMIN: "운영자",
  MEMBER: "사용자",
};

// 독서 상태
export const STATUS = {
  WISH: "WISH",
  READING: "READING",
  DONE: "DONE",
} as const;
export type Status = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_LABEL: Record<Status, string> = {
  WISH: "읽을 예정",
  READING: "독서중",
  DONE: "완독",
};

export const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
] as const;

export const MBTI_ALL = "ALL"; // "모두에게 추천"

// 랭킹에 오르려면 필요한 최소 완독자 수
export const RANKING_MIN_READERS = 3;

// 초대 링크 유효기간 (일)
export const INVITE_EXPIRY_DAYS = 7;

// rating은 반 개 단위 정수(0~10)로 저장 — 표시용 변환
export const ratingToStars = (rating: number) => rating / 2;
export const starsToRating = (stars: number) => Math.round(stars * 2);
