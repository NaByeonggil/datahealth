/**
 * 임가공 단가 조회 규칙
 *
 * "제형 + 수량 + 규격" 조건으로 등록된 단가 중 적용 가능한 후보를 골라 순위를 매긴다.
 * 업체마다 단가가 다른 것은 정상이므로 하나만 고르지 않고 후보 전체를 돌려주고,
 * 실제 선택은 담당자가 화면에서 한다.
 */

export interface TollingRateLike {
  id: string;
  vendorName: string;
  formName: string;
  formCode?: string | null;
  specLabel?: string | null;
  specMin?: number | null;
  specMax?: number | null;
  specUnit?: string | null;
  qtyMin: number;
  qtyMax?: number | null;
  unitCost: number;
  costBasis: string;
  supplyMode: string;
  vendorPrice?: number | null;
  ownMargin?: number | null;
  includesProfit: boolean;
  isNegotiable: boolean;
  effectiveDate: string | Date;
  sourceFile?: string | null;
  note?: string | null;
}

export interface ResolveCriteria {
  /** 제형/유형 이름 (액상스틱, 20ml 바이알 ...) */
  formName?: string;
  /** 생산 수량 (case/개) */
  quantity?: number;
  /** 규격 값 (내용량 등) */
  specValue?: number;
  vendorName?: string;
}

export interface RankedRate<T extends TollingRateLike = TollingRateLike> {
  rate: T;
  /** MOQ(수량구간 하한) 미달 — 적용은 가능하나 할증/협의 필요 */
  belowMoq: boolean;
  /** 규격 구간을 벗어남 */
  specMismatch: boolean;
  score: number;
  reasons: string[];
}

const norm = (v: string) => v.replace(/\s|\(|\)/g, "").toLowerCase();

/** 제형 이름이 얼마나 잘 맞는지 (2=완전일치, 1=부분일치, 0=불일치) */
export function formMatchLevel(rateForm: string, target: string): number {
  if (!target) return 1;
  const a = norm(rateForm);
  const b = norm(target);
  if (a === b) return 2;
  if (a.includes(b) || b.includes(a)) return 1;
  return 0;
}

export function rankTollingRates<T extends TollingRateLike>(
  rates: T[],
  criteria: ResolveCriteria
): RankedRate<T>[] {
  const { formName = "", quantity = 0, specValue, vendorName } = criteria;

  return rates
    .map((rate) => {
      const level = formMatchLevel(rate.formName, formName);
      if (level === 0) return null;
      if (vendorName && rate.vendorName !== vendorName) return null;

      const belowMoq = quantity > 0 && rate.qtyMin > 0 && quantity < rate.qtyMin;
      const aboveMax = quantity > 0 && rate.qtyMax != null && quantity > rate.qtyMax;
      if (aboveMax) return null; // 상한을 넘으면 다른 구간이 맞는 단가다

      const specMismatch =
        specValue != null &&
        ((rate.specMin != null && specValue < rate.specMin) ||
          (rate.specMax != null && specValue > rate.specMax));

      const reasons: string[] = [];
      if (level === 2) reasons.push("제형 일치");
      if (belowMoq) reasons.push(`MOQ ${rate.qtyMin.toLocaleString()} 미달`);
      if (specMismatch) reasons.push("규격 구간 밖");
      if (rate.isNegotiable) reasons.push("협의 가능");

      // 조건이 좁을수록(=구체적일수록) 우선. 최신 단가, 낮은 단가 순.
      const days = new Date(rate.effectiveDate).getTime() / 86400000;
      const score =
        level * 1000 +
        (belowMoq ? -500 : 0) +
        (specMismatch ? -300 : 0) +
        (rate.specMin != null ? 100 : 0) +
        (rate.qtyMin > 0 ? 50 : 0) +
        days / 1000;

      return { rate, belowMoq, specMismatch, score, reasons };
    })
    .filter((v): v is RankedRate<T> => v !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.rate.unitCost - b.rate.unitCost;
    });
}
