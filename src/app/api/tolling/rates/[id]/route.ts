import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const numOrNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.tollingRate.update({
    where: { id },
    data: {
      vendorName: body.vendorName,
      formName: body.formName,
      formCode: body.formCode || null,
      specLabel: body.specLabel || null,
      specMin: numOrNull(body.specMin),
      specMax: numOrNull(body.specMax),
      specUnit: body.specUnit || null,
      qtyMin: Number(body.qtyMin) || 0,
      qtyMax: numOrNull(body.qtyMax),
      unitCost: Number(body.unitCost) || 0,
      costBasis: body.costBasis || "per_unit",
      supplyMode: body.supplyMode || "bulk",
      vendorPrice: numOrNull(body.vendorPrice),
      ownMargin: numOrNull(body.ownMargin),
      includesProfit: !!body.includesProfit,
      includesVat: !!body.includesVat,
      isNegotiable: !!body.isNegotiable,
      isConfidential: !!body.isConfidential,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      isCurrent: body.isCurrent,
      note: body.note || null,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.tollingRate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
