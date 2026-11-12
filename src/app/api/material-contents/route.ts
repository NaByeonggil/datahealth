import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { manualFields } from "./fields";

const include = {
  material: { select: { code: true, isActive: true, supplier: { select: { name: true } } } },
  catalog: { select: { supplier: { select: { name: true } } } },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const sourceType = searchParams.get("sourceType");
  const status = searchParams.get("status");
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (sourceType) where.sourceType = sourceType;
  if (status === "직접입력") where.isManual = true;
  else if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { component: { contains: search } },
      { specification: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.materialContent.findMany({
      where,
      include,
      orderBy: [{ sourceType: "desc" }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.materialContent.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

/** 함유량 행이 없는 원료·취급품목에 직접 입력한 함량을 붙인다 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const sourceType = body.sourceType === "catalog" ? "catalog" : "material";
  const sourceId = String(body.sourceId || "");
  if (!sourceId) return NextResponse.json({ error: "원료를 선택해주세요." }, { status: 400 });

  const source = sourceType === "material"
    ? await prisma.material.findUnique({ where: { id: sourceId }, select: { name: true, specification: true } })
    : await prisma.materialCatalog.findUnique({ where: { id: sourceId }, select: { name: true, specification: true } });
  if (!source) return NextResponse.json({ error: "원료를 찾을 수 없습니다." }, { status: 404 });

  try {
    const item = await prisma.materialContent.create({
      data: {
        sourceType,
        materialId: sourceType === "material" ? sourceId : null,
        catalogId: sourceType === "catalog" ? sourceId : null,
        name: source.name,
        specification: source.specification?.trim() || null,
        ...manualFields(body, source.specification),
      },
      include,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "이미 함유량이 등록된 원료입니다. 목록에서 수정해주세요." }, { status: 400 });
    }
    console.error("함유량 등록 실패:", error);
    return NextResponse.json({ error: "등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
