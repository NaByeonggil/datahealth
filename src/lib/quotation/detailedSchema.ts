import { z } from "zod";
import {
  num,
  round,
  calcUnitWeight,
  calcTotalWeight,
  calcTheoreticalQty,
  calculateDetailedQuotation,
  recalcMaterialRow,
  recalcSupplyRow,
  recalcProcessRow,
  DEFAULT_LOSS_RATE,
  DEFAULT_VAT_RATE,
  DEFAULT_PROFIT_RATE,
} from "./calculateDetailed";

/**
 * 상세견적서 입력 검증 스키마.
 *
 * 폼에서 문자열("12", "12g", "")이 섞여 들어오는 것을 전제로 preprocess 로 정규화한다.
 * 금액/합계 필드는 클라이언트 값을 신뢰하지 않고 서버에서 다시 계산한다.
 */

const isEmpty = (v: unknown) => v === undefined || v === null || v === "";

const numField = (def = 0) =>
  z.preprocess((v) => (isEmpty(v) ? def : num(v)), z.number().finite());

const intField = (def = 0) =>
  z.preprocess((v) => (isEmpty(v) ? def : Math.round(num(v))), z.number().int());

const optionalText = z.preprocess(
  (v) => (isEmpty(v) ? null : String(v)),
  z.string().nullable()
);

const requiredText = (label: string) =>
  z.preprocess(
    (v) => (isEmpty(v) ? "" : String(v).trim()),
    z.string().min(1, `${label}은(는) 필수입니다.`)
  );

export const materialItemSchema = z.object({
  materialId: optionalText,
  materialName: requiredText("원료명"),
  specification: optionalText,
  mixRatio: numField(),
  contentMg: numField(),
  inputKg: numField(),
  unitPrice: numField(),
  functionalContent: optionalText,
  note: optionalText,
});

export const supplyItemSchema = z.object({
  supplyId: optionalText,
  supplyName: requiredText("자재명"),
  specification: optionalText,
  quantity: intField(),
  inputQty: intField(),
  unitPrice: numField(),
  note: optionalText,
});

export const processItemSchema = z.object({
  processId: optionalText,
  processName: requiredText("공정명"),
  quantity: intField(),
  unitCost: numField(),
  note: optionalText,
});

export const overheadItemSchema = z.object({
  name: requiredText("항목명"),
  amount: numField(),
  note: optionalText,
});

/** 이름이 비어 있는 행은 사용자가 지우지 않은 빈 줄로 보고 저장 대상에서 제외한다 */
const dropEmptyRows = (nameKey: string) => (v: unknown) =>
  Array.isArray(v)
    ? v.filter(
        (row) =>
          row &&
          String((row as Record<string, unknown>)[nameKey] ?? "").trim() !== ""
      )
    : v;

export const detailedQuotationSchema = z.object({
  quotationNo: optionalText,
  productName: requiredText("제품명"),
  customerName: optionalText,
  customerId: optionalText,
  productType: requiredText("제품유형"),
  formType: optionalText,

  contentAmount: numField(),
  packageUnit: intField(),
  intakeGuide: optionalText,

  productionQty: intField(),
  lossRate: numField(DEFAULT_LOSS_RATE),
  yieldRate: numField(100),
  caseQty: intField(),
  packagingMethod: optionalText,

  profitRate: numField(DEFAULT_PROFIT_RATE),
  vatRate: numField(DEFAULT_VAT_RATE),
  finalUnitPrice: numField(),

  status: z.preprocess(
    (v) => (isEmpty(v) ? "draft" : String(v)),
    z.enum(["draft", "confirmed", "closed"])
  ),
  validUntil: z.preprocess(
    (v) => (isEmpty(v) ? null : new Date(String(v))),
    z.date().nullable()
  ),
  note: optionalText,

  materials: z
    .preprocess(dropEmptyRows("materialName"), z.array(materialItemSchema))
    .default([]),
  supplies: z
    .preprocess(dropEmptyRows("supplyName"), z.array(supplyItemSchema))
    .default([]),
  processes: z
    .preprocess(dropEmptyRows("processName"), z.array(processItemSchema))
    .default([]),
  overheads: z.preprocess(dropEmptyRows("name"), z.array(overheadItemSchema)).default([]),
});

export type DetailedQuotationInput = z.infer<typeof detailedQuotationSchema>;

/**
 * 검증된 입력을 Prisma 저장용 데이터로 변환한다.
 * 파생값(단위중량/총중량/배합비/투입량/금액/원가/이윤/총액)은 전부 여기서 다시 계산하므로
 * 클라이언트가 보낸 합계는 사용하지 않는다.
 */
export function prepareDetailedQuotation(input: DetailedQuotationInput) {
  const unitWeight = calcUnitWeight(input.contentAmount, input.packageUnit);
  const totalWeight = calcTotalWeight(
    input.contentAmount,
    input.productionQty,
    input.lossRate
  );
  const theoreticalQty = calcTheoreticalQty(input.productionQty, input.packageUnit);
  const caseQty = input.caseQty || theoreticalQty;

  const materials = input.materials.map((m, i) => ({
    ...recalcMaterialRow(m, { contentAmount: input.contentAmount, totalWeight }),
    sortOrder: i + 1,
  }));
  const supplies = input.supplies.map((s, i) => ({
    ...recalcSupplyRow(s),
    sortOrder: i + 1,
  }));
  const processes = input.processes.map((p, i) => ({
    ...recalcProcessRow(p),
    sortOrder: i + 1,
  }));
  const overheads = input.overheads.map((o, i) => ({
    name: o.name,
    amount: round(num(o.amount), 2),
    note: o.note,
    sortOrder: i + 1,
  }));

  const totals = calculateDetailedQuotation({
    ...input,
    caseQty,
    materials,
    supplies,
    processes,
    overheads,
  });

  return {
    header: {
      productName: input.productName,
      customerName: input.customerName,
      customerId: input.customerId,
      productType: input.productType,
      formType: input.formType,
      contentAmount: input.contentAmount,
      packageUnit: input.packageUnit,
      intakeGuide: input.intakeGuide,

      productionQty: input.productionQty,
      unitWeight,
      totalWeight,
      lossRate: input.lossRate,
      yieldRate: input.yieldRate,
      theoreticalQty,
      caseQty,
      packagingMethod: input.packagingMethod,

      profitRate: input.profitRate,
      vatRate: input.vatRate,
      finalUnitPrice: totals.finalUnitPrice,

      materialCost: totals.materialCost,
      supplyCost: totals.supplyCost,
      processCost: totals.processCost,
      overheadCost: totals.overheadCost,
      costSubtotal: totals.costPerCase,
      profitAmount: totals.profitPerCase,
      unitPriceExVat: totals.pricePerCaseExVat,
      totalAmount: totals.totalAmount,

      status: input.status,
      validUntil: input.validUntil,
      note: input.note,
    },
    materials,
    supplies,
    processes,
    overheads,
    totals,
  };
}

const SECTION_LABEL: Record<string, string> = {
  materials: "원료",
  supplies: "자재",
  processes: "공정",
  overheads: "간접제조비",
};

/** zod 에러를 사용자가 읽을 수 있는 한 줄 메시지로 (예: "원료 2행: 원료명은(는) 필수입니다.") */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const [section, index] = issue.path;
      if (typeof section === "string" && SECTION_LABEL[section] && typeof index === "number") {
        return `${SECTION_LABEL[section]} ${index + 1}행: ${issue.message}`;
      }
      return issue.message;
    })
    .join(", ");
}
