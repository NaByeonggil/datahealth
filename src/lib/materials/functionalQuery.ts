/**
 * 건기식 공전 탭 — 기준표에 걸리는 원료·취급품목을 모은다 (서버 전용)
 *
 * 원료(단가 확보)와 취급품목(단가 미확보)을 모두 읽어 원료명으로 매칭한다.
 * 이미 원료로 승격된 취급품목은 원료 쪽과 겹치므로 뺀다.
 */
import { prisma } from "@/lib/prisma";
import { makeMatcher } from "./functionalStandards";

export interface StandardMaterialRow {
  key: string;
  sourceType: "material" | "catalog";
  name: string;
  materialCode: string | null;
  supplier: string | null;
  category: string | null;
  unitPrice: number | null;
  unit: string | null;
  specification: string | null;
  refCode: string | null;
  content: {
    status: string; component: string | null; amount: number | null; amountMax: number | null;
    unit: string | null; qualifier: string | null; isManual: boolean;
  } | null;
  standardIds: string[];
}

const contentSelect = {
  select: { status: true, component: true, amount: true, amountMax: true, unit: true, qualifier: true, isManual: true },
};

export async function loadStandards() {
  return prisma.functionalStandard.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function matchStandardMaterials(standards: Awaited<ReturnType<typeof loadStandards>>) {
  const match = makeMatcher(standards);
  const [materials, catalogs] = await Promise.all([
    prisma.material.findMany({
      where: { isActive: true },
      select: {
        id: true, code: true, name: true, category: true, unitPrice: true, unit: true, specification: true,
        supplier: { select: { name: true } }, content: contentSelect,
      },
      orderBy: { name: "asc" },
    }),
    prisma.materialCatalog.findMany({
      where: { isActive: true, materialId: null },
      select: {
        id: true, name: true, category: true, specification: true, refCode: true,
        supplier: { select: { name: true } }, content: contentSelect,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: StandardMaterialRow[] = [];
  for (const m of materials) {
    const standardIds = match(m.name);
    if (standardIds.length) rows.push({
      key: `m:${m.id}`, sourceType: "material", name: m.name, materialCode: m.code,
      supplier: m.supplier?.name ?? null, category: m.category, unitPrice: m.unitPrice, unit: m.unit,
      specification: m.specification, refCode: null, content: m.content, standardIds,
    });
  }
  for (const c of catalogs) {
    const standardIds = match(c.name, c.refCode);
    if (standardIds.length) rows.push({
      key: `c:${c.id}`, sourceType: "catalog", name: c.name, materialCode: null,
      supplier: c.supplier?.name ?? null, category: c.category, unitPrice: null, unit: null,
      specification: c.specification, refCode: c.refCode, content: c.content, standardIds,
    });
  }
  return rows;
}
