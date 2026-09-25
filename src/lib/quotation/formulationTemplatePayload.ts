import { prisma } from "@/lib/prisma";

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

type LinkableItem = ReturnType<typeof buildTemplateItems>[number];

/**
 * materialId 가 비어 있는 행을 원료명으로 마스터에 이어 붙인다.
 *
 * 견적서를 다시 불러와 템플릿으로 저장하거나 마스터 화면에서 직접 입력한 경우
 * materialId 가 없는데, 연결이 없으면 적용할 때 현재 단가를 읽어올 수 없다.
 * 이름이 정확히 일치하고 후보가 하나뿐일 때만 잇는다(동명이의 원료는 손대지 않는다).
 */
export async function linkMaterialsByName(items: LinkableItem[]): Promise<LinkableItem[]> {
  const names = [...new Set(items.filter((i) => !i.materialId).map((i) => i.materialName))];
  if (names.length === 0) return items;

  const found = await prisma.material.findMany({
    where: { name: { in: names }, isActive: true },
    select: { id: true, name: true },
  });

  const byName = new Map<string, string | null>();
  for (const m of found) {
    // 같은 이름이 둘 이상이면 어느 쪽인지 알 수 없으므로 연결하지 않는다
    byName.set(m.name, byName.has(m.name) ? null : m.id);
  }

  return items.map((i) =>
    i.materialId ? i : { ...i, materialId: byName.get(i.materialName) ?? null }
  );
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
