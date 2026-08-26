/**
 * 저장된 일반견적서(API 응답) → PDF·Excel 내보내기용 데이터
 *
 * 목록·상세·작성 화면이 같은 결과를 내도록 조립을 한곳에 모았다.
 * 금액은 calculateSimpleQuotation 이 다시 계산한다(저장된 totalAmount 를 믿지 않는다).
 */
import { calculateSimpleQuotation } from "@/lib/quotation/calculateSimple";
import { CompanyInfoType } from "@/lib/company/supplier";

export interface SavedQuotationItem {
  category: string;
  role?: string | null;
  materialName: string;
  theoryAmount: number;
  actualAmount: number;
  kgUnitPrice: number;
  materialCost: number;
  origin?: string | null;
}

/** 포장 옵션 한 줄 */
export interface SavedQuotationLine {
  label?: string | null;
  packageUnit: number;
  bottleBoxCost: number;
  setCount: number;
  packagingMethod?: string | null;
  unit?: string | null;
  sortOrder?: number;
}

/** 견적서에 담긴 제품 하나 */
export interface SavedQuotationProduct {
  name: string;
  productType?: { name: string; processingCost: number; formCode?: string | null } | null;
  subMaterialCostPerUnit?: number | null;
  productSpec?: string | null;
  dosage?: string | null;
  items?: SavedQuotationItem[];
  lines?: SavedQuotationLine[];
  sortOrder?: number;
}

/** /api/quotation/simple/[id] 응답 형태 */
export interface SavedQuotation {
  quotationNo: string;
  productName: string;
  customerName?: string | null;
  customerContact?: string | null;
  customerPhone?: string | null;
  customerFax?: string | null;
  validDays?: number | null;
  deliveryTerms?: string | null;
  paymentTerms?: string | null;
  foodType?: string | null;
  sumOptions?: boolean | null;
  note?: string | null;
  products?: SavedQuotationProduct[];
  createdAt?: string | Date;
}

/** createdAt 이 문자열이든 Date 든 YYYY-MM-DD 로 만든다 */
function toDateString(v?: string | Date): string | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** 여러 제품의 값을 " / " 로 이어 제품사양 한 줄로 만든다 */
const joinSpec = (products: SavedQuotationProduct[], pick: (p: SavedQuotationProduct) => string | null | undefined) =>
  products.map(pick).map((v) => (v ?? "").trim()).filter(Boolean).join(" / ");

export function buildSimpleQuotationExport(
  data: SavedQuotation,
  /** 설정 > 회사 값. 없으면 출력 쪽 기본값이 쓰인다 */
  company?: CompanyInfoType
) {
  const products = (data.products ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const calc = calculateSimpleQuotation({
    products: products.map((p) => ({
      name: p.name,
      processingCostPerUnit: p.productType?.processingCost || 0,
      subMaterialCostPerUnit: p.subMaterialCostPerUnit ?? 20,
      items: p.items ?? [],
      lines: (p.lines ?? [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    })),
  });

  return {
    data: {
      quotationNo: data.quotationNo,
      productName: data.productName,
      customerName: data.customerName || "",
      customerContact: data.customerContact || "",
      customerPhone: data.customerPhone || "",
      customerFax: data.customerFax || "",
      validDays: data.validDays ?? 30,
      deliveryTerms: data.deliveryTerms || "",
      paymentTerms: data.paymentTerms || "",
      foodType: data.foodType || "건강기능식품",
      // 제품이 여러 개면 " / " 로 나열한다 (원본 양식과 동일)
      productNames: joinSpec(products, (p) => p.name) || data.productName,
      productTypeNames: joinSpec(products, (p) => p.productType?.name),
      productSpecs: joinSpec(products, (p) => p.productSpec),
      dosages: joinSpec(products, (p) => p.dosage),
      packagingMethods: calc.lines
        .map((l) => l.packagingMethod || l.displayLabel)
        .filter((v, i, arr) => v && arr.indexOf(v) === i)
        .join(" / "),
      sumOptions: data.sumOptions === true,
      note: data.note || "",
      quotationDate: toDateString(data.createdAt),
      products: calc.products,
      lines: calc.lines,
      totalCost: calc.totalCost,
      supplyAmount: calc.supplyAmount,
      vatAmount: calc.vatAmount,
      company,
    },
    calc,
  };
}
