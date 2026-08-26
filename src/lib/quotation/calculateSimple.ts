/**
 * 일반견적서 가격 계산 — 단일 진실 공급원(Single Source of Truth)
 *
 * 견적서 하나에 제품이 여러 개 들어갈 수 있다(정제 + 환제).
 * 제품마다 제형·배합·부원료비가 다르고, 제품 아래에 포장 옵션이 여러 줄 붙는다.
 *
 *   견적서
 *     └ 제품 (제형 · 배합 · 부원료비)
 *          └ 포장 옵션 (포장단위 · 병박스 · 세트수)
 *
 * 제품마다
 *   1정당 원료비   = Σ (함량(mg) × kg단가 ÷ 1,000,000)
 *   1정당 부원료비 = 부형제·활택제 등 개별 계상하지 않는 원료 몫
 *   1정당 공임비   = 제형의 가공비(processingCost)
 *   1정당 합계     = 원료비 + 부원료비 + 공임비
 *
 * 옵션마다
 *   제조원가   = 1정당 합계 × 포장단위(정제수)     구성 확인용
 *   1박스원가  = 제조원가 + 병·박스
 *   공급가액   = 1박스원가 × 세트수               ※ 금액은 부가세 별도
 *   세액       = 공급가액 × 10%                  견적서 양식의 세액 칸
 *
 * 견적서 총액 = 모든 제품·옵션의 합
 */

/** 부가세율(%) — 견적서 세액 칸 계산용 고정값 */
export const VAT_RATE = 10;

export interface SimpleQuotationItemLike {
  /** 1정(1개)당 원료비(원) — 함량(mg) × kg단가 ÷ 1,000,000 */
  materialCost: number;
}

/** 포장 옵션 한 줄 */
export interface SimpleQuotationLineInput {
  label?: string | null;
  /** 포장단위 — 1박스(1병)에 들어가는 정/포 수 */
  packageUnit: number;
  /** 병+박스 자재비 (포장 1개당) */
  bottleBoxCost: number;
  /** 세트수(박스 수량) */
  setCount: number;
  packagingMethod?: string | null;
  /** 수량 단위 (박스 / 20일분 …) */
  unit?: string | null;
}

/** 제품 하나 */
export interface SimpleQuotationProductInput {
  name?: string | null;
  /** 1정(1개)당 공임비 — 제형의 가공비 */
  processingCostPerUnit: number;
  /** 1정(1개)당 부원료비 */
  subMaterialCostPerUnit: number;
  items: SimpleQuotationItemLike[];
  lines: SimpleQuotationLineInput[];
}

export interface SimpleQuotationCalcInput {
  products: SimpleQuotationProductInput[];
}

export interface SimpleQuotationLineResult extends SimpleQuotationLineInput {
  /** 표시용 이름 — label 이 없으면 "30정" 처럼 만든다 */
  displayLabel: string;
  /** 품목 표 번호 — 제품이 여러 개면 "1-1", 하나면 "1" */
  no: string;
  /** 어느 제품의 옵션인지 — 품목 표에 찍는다 */
  productName: string;
  /** 박스당 원료비(부원료비 포함) */
  materialCost: number;
  /** 박스당 공임비 */
  processingCost: number;
  /** 제조원가(박스당) = 1정당 합계 × 포장단위 */
  manufacturingCost: number;
  /** 1박스원가 = 제조원가 + 병·박스 */
  subtotal: number;
  /** 총원가 = 1박스원가 × 세트수 */
  totalCost: number;
  /** 1박스당 단가 — 1박스원가와 같다 */
  sellingUnitPrice: number;
  /** 공급가액 (부가세 별도) */
  supplyAmount: number;
  /** 세액 = 공급가액 × 10% */
  vatAmount: number;
}

export interface SimpleQuotationProductResult {
  name: string;
  /** 1정당 원료비 합계 (배합표에서 나온 값) */
  materialCostPerUnit: number;
  subMaterialCostPerUnit: number;
  /** 1정당 원료비 + 부원료비 */
  totalMaterialPerUnit: number;
  processingCostPerUnit: number;
  /** 1정당 원료비 + 부원료비 + 공임비 */
  perUnitCost: number;
  lines: SimpleQuotationLineResult[];
  totalCost: number;
  supplyAmount: number;
  vatAmount: number;
}

export interface SimpleQuotationCalcResult {
  products: SimpleQuotationProductResult[];
  /** 모든 옵션을 한 줄로 편 목록 — 품목 표·PDF 가 쓴다 */
  lines: SimpleQuotationLineResult[];
  totalCost: number;
  supplyAmount: number;
  vatAmount: number;
}

export function calculateSimpleQuotation(
  input: SimpleQuotationCalcInput
): SimpleQuotationCalcResult {
  const products = input.products ?? [];
  const multi = products.length > 1;

  const results: SimpleQuotationProductResult[] = products.map((pr, pi) => {
    const processingCostPerUnit = pr.processingCostPerUnit || 0;
    const subMaterialCostPerUnit = pr.subMaterialCostPerUnit || 0;

    const materialCostPerUnit = (pr.items ?? []).reduce(
      (sum, it) => sum + (it.materialCost || 0),
      0
    );
    const totalMaterialPerUnit = materialCostPerUnit + subMaterialCostPerUnit;
    const perUnitCost = totalMaterialPerUnit + processingCostPerUnit;

    const lines: SimpleQuotationLineResult[] = (pr.lines ?? []).map((ln, li) => {
      const packageUnit = ln.packageUnit || 0;
      const setCount = ln.setCount || 0;
      const bottleBoxCost = ln.bottleBoxCost || 0;

      const materialCost = totalMaterialPerUnit * packageUnit;
      const processingCost = processingCostPerUnit * packageUnit;
      const manufacturingCost = perUnitCost * packageUnit;
      const subtotal = manufacturingCost + bottleBoxCost;
      const totalCost = subtotal * setCount;

      // 단가 = 1박스원가 (마진을 따로 얹지 않는다)
      const sellingUnitPrice = Math.round(subtotal);
      const supplyAmount = sellingUnitPrice * setCount;

      return {
        ...ln,
        displayLabel: ln.label?.trim() || (packageUnit ? `${packageUnit}정` : "-"),
        productName: pr.name?.trim() || `제품 ${pi + 1}`,
        // 제품이 여러 개면 원본 양식처럼 1-1 / 2-1 로 매긴다
        no: multi ? `${pi + 1}-${li + 1}` : String(li + 1),
        materialCost,
        processingCost,
        manufacturingCost,
        subtotal,
        totalCost,
        sellingUnitPrice,
        supplyAmount,
        vatAmount: Math.round((supplyAmount * VAT_RATE) / 100),
      };
    });

    const sum = (pick: (l: SimpleQuotationLineResult) => number) =>
      lines.reduce((s, l) => s + pick(l), 0);

    return {
      name: pr.name?.trim() || `제품 ${pi + 1}`,
      materialCostPerUnit,
      subMaterialCostPerUnit,
      totalMaterialPerUnit,
      processingCostPerUnit,
      perUnitCost,
      lines,
      totalCost: sum((l) => l.totalCost),
      supplyAmount: sum((l) => l.supplyAmount),
      vatAmount: sum((l) => l.vatAmount),
    };
  });

  const sumP = (pick: (p: SimpleQuotationProductResult) => number) =>
    results.reduce((s, p) => s + pick(p), 0);

  return {
    products: results,
    lines: results.flatMap((p) => p.lines),
    totalCost: sumP((p) => p.totalCost),
    supplyAmount: sumP((p) => p.supplyAmount),
    vatAmount: sumP((p) => p.vatAmount),
  };
}
