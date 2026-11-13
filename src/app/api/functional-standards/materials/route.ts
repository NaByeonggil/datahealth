import { NextRequest, NextResponse } from "next/server";
import { loadStandards, matchStandardMaterials } from "@/lib/materials/functionalQuery";
import { normalize } from "@/lib/materials/functionalStandards";

/**
 * 공전 원료에 걸리는 원료·취급품목 목록
 *   standardId  특정 공전 원료만
 *   sourceType  material(단가 확보) / catalog(단가 미확보)
 *   search      원료명·공급사·규격
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const standardId = sp.get("standardId");
  const sourceType = sp.get("sourceType");
  const search = normalize(sp.get("search") || "");
  const page = Math.max(1, Number(sp.get("page") || "1"));
  const limit = Math.max(1, Number(sp.get("limit") || "20"));

  const standards = await loadStandards();
  const order = new Map(standards.map((s, i) => [s.id, i]));
  let rows = await matchStandardMaterials(standards);
  if (standardId) rows = rows.filter((r) => r.standardIds.includes(standardId));
  if (sourceType) rows = rows.filter((r) => r.sourceType === sourceType);
  if (search) rows = rows.filter((r) =>
    normalize(`${r.name} ${r.supplier ?? ""} ${r.specification ?? ""}`).includes(search));

  // 공전 번호 순 → 단가 확보 먼저 → 원료명
  const first = (ids: string[]) => Math.min(...ids.map((id) => order.get(id) ?? 1e9));
  rows.sort((a, b) =>
    first(a.standardIds) - first(b.standardIds) ||
    (a.sourceType === b.sourceType ? 0 : a.sourceType === "material" ? -1 : 1) ||
    a.name.localeCompare(b.name, "ko"));

  return NextResponse.json({ data: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit });
}
