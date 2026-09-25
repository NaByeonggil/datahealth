/**
 * 배합 템플릿 저장 payload 조립 — 생성(POST)과 수정(PUT)이 같은 규칙을 쓰도록 모아둔다.
 */

export interface TemplateItemBody {
  category?: string;
  role?: string;
  materialId?: string | null;
  materialName?: string;
  theoryAmount?: number | string;
  origin?: string | null;
  refUnitPrice?: number | string;
  note?: string | null;
}

export interface FormulationTemplateBody {
  name?: string;
  productTypeId?: string | null;
  productSpec?: string | null;
  dosage?: string | null;
  subMaterialCostPerUnit?: number | string | null;
  note?: string | null;
  isActive?: boolean;
  items?: TemplateItemBody[];
}

const numOrNull = (v: unknown) =>
  v === undefined || v === null || v === "" ? null : Number(v) || 0;

export function buildTemplateHeader(body: FormulationTemplateBody) {
  return {
    name: (body.name || "").trim(),
    productTypeId: body.productTypeId || null,
    productSpec: body.productSpec || null,
    dosage: body.dosage || null,
    subMaterialCostPerUnit: numOrNull(body.subMaterialCostPerUnit),
    note: body.note || null,
    isActive: body.isActive ?? true,
  };
}

/** 원료명이 빈 행은 사용자가 지우지 않은 빈 줄로 보고 제외한다 */
export function buildTemplateItems(body: FormulationTemplateBody) {
  const items = Array.isArray(body.items) ? body.items : [];
  return items
    .filter((i) => String(i.materialName || "").trim())
    .map((i, idx) => ({
      sortOrder: idx + 1,
      category: i.category || "일반식품",
      role: i.role || "주원료",
      materialId: i.materialId || null,
      materialName: String(i.materialName).trim(),
      theoryAmount: Number(i.theoryAmount) || 0,
      origin: i.origin || null,
      refUnitPrice: Number(i.refUnitPrice) || 0,
      note: i.note || null,
    }));
}

/** 조회 공통 include — 적용 시 현재 단가를 읽을 수 있게 원료 마스터를 함께 가져온다 */
export const formulationTemplateInclude = {
  productType: { select: { id: true, name: true, formCode: true } },
  items: {
    orderBy: { sortOrder: "asc" },
    include: {
      material: {
        select: { id: true, name: true, unitPrice: true, origin: true, isActive: true },
      },
    },
  },
} as const;
