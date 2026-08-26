/**
 * 일반견적서 저장 payload 조립 — 생성(POST)과 수정(PUT)이 같은 규칙을 쓰도록 모아둔다.
 */

export interface SimpleQuotationBody {
  productName?: string;
  customerName?: string | null;
  customerContact?: string | null;
  customerPhone?: string | null;
  customerFax?: string | null;
  validDays?: number;
  deliveryTerms?: string | null;
  paymentTerms?: string | null;
  foodType?: string;
  sumOptions?: boolean;
  totalMaterialCost?: number;
  totalAmount?: number;
  note?: string | null;
  products?: ProductBody[];
}

export interface ProductBody {
  name?: string;
  productTypeId: string;
  subMaterialCostPerUnit?: number;
  productSpec?: string | null;
  dosage?: string | null;
  items?: Record<string, unknown>[];
  lines?: Record<string, unknown>[];
}

/** 견적서 본체 컬럼 */
export function buildHeaderData(body: SimpleQuotationBody) {
  return {
    productName: (body.productName || "").trim(),
    customerName: body.customerName || null,
    customerContact: body.customerContact || null,
    customerPhone: body.customerPhone || null,
    customerFax: body.customerFax || null,
    validDays: body.validDays ?? 30,
    deliveryTerms: body.deliveryTerms || null,
    paymentTerms: body.paymentTerms || null,
    foodType: body.foodType || "건강기능식품",
    sumOptions: body.sumOptions === true,
    totalMaterialCost: body.totalMaterialCost || 0,
    totalAmount: body.totalAmount || 0,
    note: body.note || null,
  };
}

/** products.create 에 그대로 넣는 중첩 생성 데이터 */
export function buildProductsCreate(body: SimpleQuotationBody) {
  const products: ProductBody[] = Array.isArray(body.products) ? body.products : [];
  return products
    .filter((p) => p.productTypeId)
    .map((p, pi) => ({
      sortOrder: pi + 1,
      name: (p.name || body.productName || "").trim() || `제품 ${pi + 1}`,
      productTypeId: p.productTypeId,
      subMaterialCostPerUnit: p.subMaterialCostPerUnit ?? 20,
      productSpec: p.productSpec || null,
      dosage: p.dosage || null,
      items: {
        create: (p.items || []).map((item, i) => ({
          sortOrder: i + 1,
          category: (item.category as string) || "일반식품",
          role: (item.role as string) || "주원료",
          materialName: (item.materialName as string) || "",
          theoryAmount: (item.theoryAmount as number) || 0,
          actualAmount: (item.actualAmount as number) || 0,
          kgUnitPrice: (item.kgUnitPrice as number) || 0,
          materialCost: (item.materialCost as number) || 0,
          origin: (item.origin as string) || null,
        })),
      },
      lines: {
        create: (p.lines || [])
          .filter((l) => Number(l.packageUnit) > 0)
          .map((l, i) => ({
            sortOrder: i + 1,
            label: (l.label as string) || null,
            packageUnit: Number(l.packageUnit) || 0,
            bottleBoxCost: Number(l.bottleBoxCost) || 0,
            setCount: Number(l.setCount) || 1,
            packagingMethod: (l.packagingMethod as string) || null,
            unit: (l.unit as string) || "박스",
          })),
      },
    }));
}

/** 견적서 조회에 쓰는 공통 include */
export const simpleQuotationInclude = {
  products: {
    orderBy: { sortOrder: "asc" },
    include: {
      productType: true,
      items: { orderBy: { sortOrder: "asc" } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  },
} as const;
