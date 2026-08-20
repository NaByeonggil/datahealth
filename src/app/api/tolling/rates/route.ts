import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const numOrNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "0");
  const limit = Number(searchParams.get("limit") || "20");
  const formName = searchParams.get("formName") || "";
  const onlyCurrent = searchParams.get("current") === "true";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { formName: { contains: search } },
      { vendorName: { contains: search } },
      { specLabel: { contains: search } },
      { note: { contains: search } },
    ];
  }
  if (formName) where.formName = formName;
  if (onlyCurrent) where.isCurrent = true;

  const orderBy = [
    { formName: "asc" as const },
    { qtyMin: "asc" as const },
    { unitCost: "asc" as const },
  ];

  if (!page) {
    const data = await prisma.tollingRate.findMany({ where, orderBy });
    return NextResponse.json(data);
  }

  const [data, total] = await Promise.all([
    prisma.tollingRate.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.tollingRate.count({ where }),
  ]);
  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await prisma.tollingRate.create({
    data: {
      vendorName: body.vendorName,
      vendorId: body.vendorId || null,
      formName: body.formName,
      formCode: body.formCode || null,
      productTypeId: body.productTypeId || null,
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
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
      isCurrent: body.isCurrent ?? true,
      sourceFile: body.sourceFile || "수기입력",
      note: body.note || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
