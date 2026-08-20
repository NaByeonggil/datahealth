import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "0");
  const limit = Number(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { vendorName: { contains: search } },
      { formName: { contains: search } },
      { condition: { contains: search } },
    ];
  }

  const orderBy = [{ name: "asc" as const }];
  if (!page) {
    return NextResponse.json(await prisma.tollingExtra.findMany({ where, orderBy }));
  }
  const [data, total] = await Promise.all([
    prisma.tollingExtra.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.tollingExtra.count({ where }),
  ]);
  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await prisma.tollingExtra.create({
    data: {
      code: body.code || null,
      name: body.name,
      vendorName: body.vendorName || null,
      formName: body.formName || null,
      calcType: body.calcType || "per_unit",
      amount: Number(body.amount) || 0,
      percentBase: body.percentBase || null,
      isOptional: body.isOptional ?? true,
      condition: body.condition || null,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
      isCurrent: body.isCurrent ?? true,
      sourceFile: body.sourceFile || "수기입력",
      note: body.note || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
