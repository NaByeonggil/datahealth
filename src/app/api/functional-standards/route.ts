import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { loadStandards, matchStandardMaterials } from "@/lib/materials/functionalQuery";
import { standardFields, duplicateError } from "./fields";

/** 공전 원료 기준표 — 원료(단가 확보)·취급품목(단가 미확보)별 매칭 건수 포함 */
export async function GET() {
  const standards = await loadStandards();
  const rows = await matchStandardMaterials(standards);
  const count = new Map<string, { material: number; catalog: number }>();
  for (const r of rows) for (const id of r.standardIds) {
    const c = count.get(id) ?? { material: 0, catalog: 0 };
    c[r.sourceType]++;
    count.set(id, c);
  }
  return NextResponse.json({
    data: standards.map((s) => ({ ...s, counts: count.get(s.id) ?? { material: 0, catalog: 0 } })),
  });
}

export async function POST(request: NextRequest) {
  const data = standardFields(await request.json());
  if (!data.name) return NextResponse.json({ error: "공전 원료명을 입력해주세요." }, { status: 400 });
  if (!data.keywords) return NextResponse.json({ error: "매칭 키워드를 하나 이상 입력해주세요." }, { status: 400 });
  const last = await prisma.functionalStandard.aggregate({ _max: { sortOrder: true } });
  try {
    const item = await prisma.functionalStandard.create({
      data: { ...data, sortOrder: (last._max.sortOrder ?? 0) + 10 },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const msg = duplicateError(error);
    if (msg) return NextResponse.json({ error: msg }, { status: 400 });
    console.error("공전 원료 등록 실패:", error);
    return NextResponse.json({ error: "등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
