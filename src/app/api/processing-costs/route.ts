import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productTypeId = searchParams.get("productTypeId");
  const where: Record<string, unknown> = {};
  if (productTypeId) where.productTypeId = productTypeId;

  const data = await prisma.processingCost.findMany({
    where,
    include: { productType: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // 기존 current를 false로
  await prisma.processingCost.updateMany({
    where: { productTypeId: body.productTypeId, isCurrent: true },
    data: { isCurrent: false, endDate: new Date() },
  });
  // 새 가공비 등록
  const item = await prisma.processingCost.create({
    data: {
      productTypeId: body.productTypeId,
      cost: body.cost,
      effectiveDate: new Date(body.effectiveDate || Date.now()),
      changeReason: body.changeReason || null,
      changedBy: body.changedBy || null,
      isCurrent: true,
    },
  });
  // ProductType의 processingCost도 업데이트
  await prisma.productType.update({
    where: { id: body.productTypeId },
    data: { processingCost: body.cost },
  });
  return NextResponse.json(item, { status: 201 });
}
