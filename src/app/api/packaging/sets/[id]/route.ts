import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type ItemInput = {
  supplyId?: string | null;
  name: string;
  spec?: string | null;
  unitPrice?: number | string;
  qtyPerUnit?: number | string;
  isFreeIssue?: boolean;
  note?: string | null;
};

const mapItems = (items: ItemInput[] = []) =>
  items
    .filter((i) => String(i.name || "").trim())
    .map((i, idx) => ({
      sortOrder: idx + 1,
      supplyId: i.supplyId || null,
      name: String(i.name).trim(),
      spec: i.spec || null,
      unitPrice: Number(i.unitPrice) || 0,
      qtyPerUnit: Number(i.qtyPerUnit) || 1,
      isFreeIssue: !!i.isFreeIssue,
      note: i.note || null,
    }));

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.packagingSet.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const item = await prisma.$transaction(async (tx) => {
    await tx.packagingSetItem.deleteMany({ where: { setId: id } });
    return tx.packagingSet.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        formName: body.formName || null,
        capacity: body.capacity ? Number(body.capacity) : null,
        capacityUnit: body.capacityUnit || null,
        vendorName: body.vendorName || null,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
        isCurrent: body.isCurrent,
        note: body.note || null,
        items: { create: mapItems(body.items) },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.packagingSet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
