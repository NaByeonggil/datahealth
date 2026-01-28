import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.material.update({
    where: { id },
    data: {
      code: body.code, name: body.name,
      category: body.category || "일반식품", origin: body.origin || null,
      specification: body.specification || null,
      unit: body.unit || "kg", unitPrice: body.unitPrice || 0,
      minOrderQty: body.minOrderQty || null,
      isFunctional: body.isFunctional || false,
      certifications: body.certifications || null,
      note: body.note || null, updatedBy: body.updatedBy || "관리자",
      isActive: body.isActive,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.material.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
