import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { recordPriceChange } from "@/lib/materials/priceHistory";

/**
 * 원료 수정.
 * 단가가 바뀌면 MaterialPrice 이력을 함께 남긴다 — 이력이 없으면 발행된 견적서와
 * 현재 단가를 대조할 때 "언제 얼마에서 바뀌었는지"를 말할 수 없다.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const newPrice = Number(body.unitPrice) || 0;

  try {
    const item = await prisma.$transaction(async (tx) => {
      const prev = await tx.material.findUnique({ where: { id }, select: { unitPrice: true } });
      if (!prev) return null;

      const updated = await tx.material.update({
        where: { id },
        data: {
          code: body.code, name: body.name,
          category: body.category || "일반식품", origin: body.origin || null,
          specification: body.specification || null,
          unit: body.unit || "kg", unitPrice: newPrice,
          minOrderQty: body.minOrderQty || null,
          packingUnit: body.packingUnit ?? null,
          isFunctional: body.isFunctional || false,
          certifications: body.certifications || null,
          note: body.note || null, updatedBy: body.updatedBy || "관리자",
          isActive: body.isActive,
        },
      });

      await recordPriceChange(tx, {
        materialId: id,
        newPrice,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
        changedBy: body.updatedBy || "관리자",
        changeReason: body.changeReason || null,
      });

      return updated;
    });

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "이미 쓰고 있는 원료코드입니다." }, { status: 400 });
    }
    console.error("원료 수정 실패:", error);
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.material.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
