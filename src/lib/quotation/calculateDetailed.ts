/**
 * 상세견적서 계산 로직 — 단일 진실 공급원(Single Source of Truth)
 *
 * 원본 엑셀(whang 상세견적.xlsx / 정제양식5)의 수식을 그대로 옮긴 것이다.
 * 폼 / 상세보기 / Excel·PDF 출력 / API 저장 / AI 견적 생성은 모두 이 파일만 사용한다.
 *
 * 엑셀 수식 대응표
 *   단위중량(CASE)  B6  = 내용량 × 포장단위
 *   총중량(kg)      C6  = 내용량 × 제조단위 × 로스율(1.1) ÷ 1000
 *   배합비율        C9  = 함량(mg) ÷ 내용량 ÷ 1000        (이 파일에서는 % 로 보관)
 *   투입량(kg)      E9  = 총중량 × 배합비율
 *   원료 금액       G9  = 단가 × 투입량
 *   자재 금액       G26 = 투입량 × 단가                   (함량은 참고값, 곱하지 않는다)
 *   공정 금액       G35 = 수량(case) × 공정단가
 *   원료비/case     G43 = 원료비 합계 ÷ 실제수량(case)
 *   자재비/case     G44 = 자재비 소계 ÷ 실제수량
 *   직접제조비/case G45 = 공정비 소계 ÷ 실제수량
 *   간접제조비/case G46 = 간접비 소계 ÷ 실제수량
 *   소계(원가)      G47 = 위 4개 합
 *   기업이윤        G48 = 원가 × 이윤율(%)
 *   합계(별도)      G49 = 원가 + 이윤                      (VAT 제외, 1 case당)
 *   1case 납품가    G50 = 사람이 올려서 넣는 값(VAT 포함)
 *   총납품 예상가   G51 = 1case 납품가 × 실제수량
 */

/** 로스율 기본값: 총중량 산출 시 10% 여유 (엑셀 C6의 1.1) */
export const DEFAULT_LOSS_RATE = 1.1;
/** 부가세율 기본값(%) */
export const DEFAULT_VAT_RATE = 10;
/** 기업이윤 기본값(%) */
export const DEFAULT_PROFIT_RATE = 5;

export interface MaterialRowInput {
  materialName?: string | null;
  /** 1포(1개)당 함량 (mg) */
  contentMg?: number | string | null;
  /** 배합비율 (%) */
  mixRatio?: number | string | null;
  /** 투입량 (kg) */
  inputKg?: number | string | null;
  /** kg 당 단가 (원) */
  unitPrice?: number | string | null;
  totalPrice?: number | string | null;
}

export interface SupplyRowInput {
  supplyName?: string | null;
  /** 함량(개) — 참고값. 금액 계산에 쓰지 않는다. */
  quantity?: number | string | null;
  /** 투입량(개) */
  inputQty?: number | string | null;
  unitPrice?: number | string | null;
  totalPrice?: number | string | null;
}

export interface ProcessRowInput {
  processName?: string | null;
  /** 수량 (case) */
  quantity?: number | string | null;
  unitCost?: number | string | null;
  totalCost?: number | string | null;
}

export interface OverheadRowInput {
  name?: string | null;
  amount?: number | string | null;
}

export interface DetailedQuotationCalcInput {
  /** 내용량 (g / 1포) */
  contentAmount?: number | string | null;
  /** 포장단위 (1 case 당 개수) */
  packageUnit?: number | string | null;
  /** 제조단위 (총 생산 개수) */
  productionQty?: number | string | null;
  /** 로스율 배수 (기본 1.1) */
  lossRate?: number | string | null;
  /** 수율 (%) — 실제수량 산정 참고값 */
  yieldRate?: number | string | null;
  /** 실제수량 (case). 0 이면 이론수량을 사용한다. */
  caseQty?: number | string | null;
  /** 기업이윤 (%) */
  profitRate?: number | string | null;
  /** 부가세율 (%) */
  vatRate?: number | string | null;
  /** 확정 납품단가 (VAT 포함, 사람이 올림해서 넣는 값). 0 이면 제안가를 쓴다. */
  finalUnitPrice?: number | string | null;

  materials?: MaterialRowInput[];
  supplies?: SupplyRowInput[];
  processes?: ProcessRowInput[];
  overheads?: OverheadRowInput[];
}

export interface DetailedQuotationTotals {
  /** 단위중량 CASE (g) */
  unitWeight: number;
  /** 총중량 (kg) */
  totalWeight: number;
  /** 이론수량 (case) */
  theoreticalQty: number;
  /** 실제수량 (case) — 원가 환산의 분모 */
  caseQty: number;

  /** 섹션별 총액 (원) */
  materialCost: number;
  supplyCost: number;
  processCost: number;
  overheadCost: number;
  /** 원가 총액 (4개 섹션 합) */
  totalCostAmount: number;

  /** 섹션별 1 case 당 금액 (원) */
  materialPerCase: number;
  supplyPerCase: number;
  processPerCase: number;
  overheadPerCase: number;

  /** 1 case 당 원가 */
  costPerCase: number;
  /** 1 case 당 기업이윤 */
  profitPerCase: number;
  /** 1 case 당 합계 (VAT 별도) */
  pricePerCaseExVat: number;
  /** 1 case 당 합계 (VAT 포함, 반올림 전) */
  pricePerCaseIncVat: number;
  /** 100원 단위로 올린 제안 납품단가 (VAT 포함) */
  suggestedUnitPrice: number;
  /** 실제 적용되는 납품단가 (VAT 포함) */
  finalUnitPrice: number;
  /** 총 납품 예상가 = 납품단가 × 실제수량 (VAT 포함) */
  totalAmount: number;
  /** 총 납품 예상가 (VAT 별도) */
  totalAmountExVat: number;
  /** 기업이윤 총액 */
  totalProfitAmount: number;
}

/** 문자열/undefined 가 섞여 들어와도 안전하게 숫자로 만든다. ("12g" → 12) */
export function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;
  const parsed = parseFloat(String(value).replace(/,/g, "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 부동소수 오차 정리 (0.1 + 0.2 문제) */
export function round(value: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** 단위중량(CASE, g) = 내용량 × 포장단위 */
export function calcUnitWeight(contentAmount: unknown, packageUnit: unknown): number {
  return round(num(contentAmount) * num(packageUnit), 4);
}

/** 총중량(kg) = 내용량 × 제조단위 × 로스율 ÷ 1000 */
export function calcTotalWeight(
  contentAmount: unknown,
  productionQty: unknown,
  lossRate: unknown = DEFAULT_LOSS_RATE
): number {
  const loss = num(lossRate) || DEFAULT_LOSS_RATE;
  return round((num(contentAmount) * num(productionQty) * loss) / 1000, 4);
}

/** 이론수량(case) = 제조단위 ÷ 포장단위 (내림) */
export function calcTheoreticalQty(productionQty: unknown, packageUnit: unknown): number {
  const unit = num(packageUnit);
  if (unit <= 0) return 0;
  return Math.floor(num(productionQty) / unit);
}

/** 배합비율(%) = 함량(mg) ÷ 내용량(g) ÷ 1000 × 100 */
export function calcMixRatio(contentMg: unknown, contentAmount: unknown): number {
  const content = num(contentAmount);
  if (content <= 0) return 0;
  return round((num(contentMg) / content / 1000) * 100, 6);
}

/** 함량(mg) = 배합비율(%) × 내용량(g) × 1000 ÷ 100 — 배합비를 직접 입력했을 때의 역산 */
export function calcContentMg(mixRatio: unknown, contentAmount: unknown): number {
  return round((num(mixRatio) / 100) * num(contentAmount) * 1000, 4);
}

/** 투입량(kg) = 총중량(kg) × 배합비율(%) ÷ 100 */
export function calcInputKg(totalWeight: unknown, mixRatio: unknown): number {
  return round(num(totalWeight) * (num(mixRatio) / 100), 4);
}

/** 원료 금액 = 투입량(kg) × 단가 */
export function calcMaterialTotal(inputKg: unknown, unitPrice: unknown): number {
  return round(num(inputKg) * num(unitPrice), 2);
}

/** 자재 금액 = 투입량(개) × 단가 — 함량(개)은 곱하지 않는다 */
export function calcSupplyTotal(inputQty: unknown, unitPrice: unknown): number {
  return round(num(inputQty) * num(unitPrice), 2);
}

/** 공정 금액 = 수량(case) × 공정단가 */
export function calcProcessTotal(quantity: unknown, unitCost: unknown): number {
  return round(num(quantity) * num(unitCost), 2);
}

/** 제안 납품단가: VAT 포함 금액을 100원 단위로 올림 */
export function suggestUnitPrice(pricePerCaseExVat: number, vatRate: unknown = DEFAULT_VAT_RATE): number {
  const incVat = pricePerCaseExVat * (1 + num(vatRate) / 100);
  if (incVat <= 0) return 0;
  return Math.ceil(incVat / 100) * 100;
}

/**
 * 원료 한 행을 다시 계산한다.
 * 함량(mg)이 있으면 배합비 → 투입량이 연쇄로 자동 계산되고,
 * 함량이 없고 배합비만 있으면 배합비를 기준으로 투입량을 계산한다.
 * 둘 다 없으면 사용자가 직접 넣은 투입량을 존중한다.
 */
export function recalcMaterialRow<T extends MaterialRowInput>(
  row: T,
  ctx: { contentAmount: unknown; totalWeight: unknown },
  changedField?: keyof MaterialRowInput
): T & { mixRatio: number; contentMg: number; inputKg: number; totalPrice: number } {
  const contentAmount = num(ctx.contentAmount);
  const totalWeight = num(ctx.totalWeight);

  let contentMg = num(row.contentMg);
  let mixRatio = num(row.mixRatio);

  if (changedField === "mixRatio") {
    // 배합비를 직접 고쳤으면 함량을 역산한다
    contentMg = contentAmount > 0 ? calcContentMg(mixRatio, contentAmount) : contentMg;
  } else if (contentAmount > 0 && contentMg > 0) {
    mixRatio = calcMixRatio(contentMg, contentAmount);
  }

  // 배합비를 알면 투입량은 항상 총중량에서 파생된다 (엑셀 E열)
  const inputKg =
    mixRatio > 0 && totalWeight > 0 ? calcInputKg(totalWeight, mixRatio) : num(row.inputKg);

  return {
    ...row,
    contentMg,
    mixRatio,
    inputKg,
    totalPrice: calcMaterialTotal(inputKg, row.unitPrice),
  };
}

export function recalcSupplyRow<T extends SupplyRowInput>(row: T): T & { totalPrice: number } {
  return { ...row, totalPrice: calcSupplyTotal(row.inputQty, row.unitPrice) };
}

export function recalcProcessRow<T extends ProcessRowInput>(row: T): T & { totalCost: number } {
  return { ...row, totalCost: calcProcessTotal(row.quantity, row.unitCost) };
}

/** 상세견적서 전체 계산 — 화면/저장/출력이 모두 이 함수를 통과한다 */
export function calculateDetailedQuotation(
  input: DetailedQuotationCalcInput
): DetailedQuotationTotals {
  const contentAmount = num(input.contentAmount);
  const packageUnit = num(input.packageUnit);
  const productionQty = num(input.productionQty);
  const lossRate = num(input.lossRate) || DEFAULT_LOSS_RATE;
  const profitRate = num(input.profitRate);
  const vatRate = num(input.vatRate);

  const unitWeight = calcUnitWeight(contentAmount, packageUnit);
  const totalWeight = calcTotalWeight(contentAmount, productionQty, lossRate);
  const theoreticalQty = calcTheoreticalQty(productionQty, packageUnit);
  const caseQty = num(input.caseQty) || theoreticalQty;

  const materialCost = round(
    (input.materials || []).reduce(
      (sum, m) => sum + (m.totalPrice != null ? num(m.totalPrice) : calcMaterialTotal(m.inputKg, m.unitPrice)),
      0
    ),
    2
  );
  const supplyCost = round(
    (input.supplies || []).reduce(
      (sum, s) => sum + (s.totalPrice != null ? num(s.totalPrice) : calcSupplyTotal(s.inputQty, s.unitPrice)),
      0
    ),
    2
  );
  const processCost = round(
    (input.processes || []).reduce(
      (sum, p) => sum + (p.totalCost != null ? num(p.totalCost) : calcProcessTotal(p.quantity, p.unitCost)),
      0
    ),
    2
  );
  const overheadCost = round(
    (input.overheads || []).reduce((sum, o) => sum + num(o.amount), 0),
    2
  );

  const totalCostAmount = round(materialCost + supplyCost + processCost + overheadCost, 2);

  const perCase = (amount: number) => (caseQty > 0 ? round(amount / caseQty, 4) : 0);
  const materialPerCase = perCase(materialCost);
  const supplyPerCase = perCase(supplyCost);
  const processPerCase = perCase(processCost);
  const overheadPerCase = perCase(overheadCost);

  const costPerCase = round(
    materialPerCase + supplyPerCase + processPerCase + overheadPerCase,
    4
  );
  const profitPerCase = round(costPerCase * (profitRate / 100), 4);
  const pricePerCaseExVat = round(costPerCase + profitPerCase, 4);
  const pricePerCaseIncVat = round(pricePerCaseExVat * (1 + vatRate / 100), 4);
  const suggestedUnitPrice = suggestUnitPrice(pricePerCaseExVat, vatRate);

  const finalUnitPrice = num(input.finalUnitPrice) || suggestedUnitPrice;
  const totalAmount = round(finalUnitPrice * caseQty, 2);
  const totalAmountExVat = round(pricePerCaseExVat * caseQty, 2);
  const totalProfitAmount = round(profitPerCase * caseQty, 2);

  return {
    unitWeight,
    totalWeight,
    theoreticalQty,
    caseQty,
    materialCost,
    supplyCost,
    processCost,
    overheadCost,
    totalCostAmount,
    materialPerCase,
    supplyPerCase,
    processPerCase,
    overheadPerCase,
    costPerCase,
    profitPerCase,
    pricePerCaseExVat,
    pricePerCaseIncVat,
    suggestedUnitPrice,
    finalUnitPrice,
    totalAmount,
    totalAmountExVat,
    totalProfitAmount,
  };
}
