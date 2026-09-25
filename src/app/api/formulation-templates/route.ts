import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  buildTemplateHeader,
  buildTemplateItems,
  linkMaterialsByName,
  formulationTemplateInclude as include,
} from "@/lib/quotation/formulationTemplatePayload";

/**
 * 배합 템플릿 목록.
 * search 는 템플릿명뿐 아니라 구성 원료명까지 훑는다 —
 * "밀크씨슬" 로 검색하면 그 원료가 들어간 템플릿이 나와야 하기 때문.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const productTypeId = searchParams.get("productTypeId") || "";
  const activeOnly = searchParams.get("activeOnly") === "1";
  const page = Number(searchParams.get("page") || "0");
  const limit = Number(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;
  if (productTypeId) where.productTypeId = productTypeId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { note: { contains: search } },
      { items: { some: { materialName: { contains: search } } } },
    ];
  }

  // 자주 쓰는 템플릿이 위로 오게 한다
  const orderBy = [
    { usageCount: "desc" as const },
    { updatedAt: "desc" as const },
  ];

  if (!page) {
    return NextResponse.json(
      await prisma.formulationTemplate.findMany({ where, include, orderBy })
    );
  }
  const [data, total] = await Promise.all([
    prisma.formulationTemplate.findMany({
      where, include, orderBy, skip: (page - 1) * limit, take: limit,
    }),
    prisma.formulationTemplate.count({ where }),
  ]);
  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const header = buildTemplateHeader(body);
    if (!header.name) {
      return NextResponse.json({ error: "템플릿 이름을 입력해주세요." }, { status: 400 });
    }
    const items = await linkMaterialsByName(buildTemplateItems(body));
    if (items.length === 0) {
      return NextResponse.json({ error: "원료를 최소 1개 등록해주세요." }, { status: 400 });
    }

    const created = await prisma.formulationTemplate.create({
      data: { ...header, items: { create: items } },
      include,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("배합 템플릿 저장 실패:", error);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
