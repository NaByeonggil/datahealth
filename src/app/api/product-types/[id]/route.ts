import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.productType.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.productType.update({
    where: { id },
    data: {
      code: body.code,
      name: body.name,
      processingCost: body.processingCost,
      description: body.description || null,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 사용 중인 견적서 확인
  const used = await prisma.simpleQuotation.count({ where: { productTypeId: id } });
  if (used > 0) {
    return NextResponse.json({ error: "사용 중인 유형은 삭제할 수 없습니다." }, { status: 400 });
  }
  await prisma.productType.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
