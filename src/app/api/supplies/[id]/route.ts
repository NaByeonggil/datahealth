import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.supply.update({
    where: { id },
    data: { code: body.code, name: body.name, unit: body.unit, unitPrice: body.unitPrice, specification: body.specification || null, note: body.note || null, isActive: body.isActive },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.supply.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
