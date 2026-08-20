import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.tollingExtra.update({
    where: { id },
    data: {
      code: body.code || null,
      name: body.name,
      vendorName: body.vendorName || null,
      formName: body.formName || null,
      calcType: body.calcType || "per_unit",
      amount: Number(body.amount) || 0,
      percentBase: body.percentBase || null,
      isOptional: body.isOptional,
      condition: body.condition || null,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      isCurrent: body.isCurrent,
      note: body.note || null,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.tollingExtra.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
