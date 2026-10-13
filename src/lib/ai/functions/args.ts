/**
 * 모델이 넘긴 인자를 숫자로 읽는다.
 * 작은 모델은 20000 대신 "20,000" 이나 "2만개" 처럼 문자열로 주는 일이 잦다.
 */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value !== "string") return fallback;

  const m = value.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)\s*(억|만|천)?/);
  if (!m) return fallback;
  const unit = m[2] === "억" ? 100_000_000 : m[2] === "만" ? 10_000 : m[2] === "천" ? 1_000 : 1;
  return Number(m[1]) * unit;
}

/** 공백·괄호를 빼고 소문자로 — 이름 대조용 */
export const normName = (v: string) => v.replace(/\s|\(|\)/g, "").toLowerCase();
