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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "0");
  const limit = Number(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { formName: { contains: search } },
      { vendorName: { contains: search } },
    ];
  }

  const include = { items: { orderBy: { sortOrder: "asc" as const } } };
  const orderBy = [{ name: "asc" as const }];

  if (!page) {
    return NextResponse.json(await prisma.packagingSet.findMany({ where, include, orderBy }));
  }
  const [data, total] = await Promise.all([
    prisma.packagingSet.findMany({ where, include, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.packagingSet.count({ where }),
  ]);
  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await prisma.packagingSet.create({
    data: {
      code: body.code,
      name: body.name,
      formName: body.formName || null,
      capacity: body.capacity ? Number(body.capacity) : null,
      capacityUnit: body.capacityUnit || null,
      vendorName: body.vendorName || null,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
      isCurrent: body.isCurrent ?? true,
      sourceFile: body.sourceFile || "수기입력",
      note: body.note || null,
      items: { create: mapItems(body.items) },
    },
    include: { items: true },
  });
  return NextResponse.json(item, { status: 201 });
}
