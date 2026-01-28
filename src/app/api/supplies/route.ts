import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "0");
  const limit = Number(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [{ name: { contains: search } }, { code: { contains: search } }];
  }

  if (!page) {
    const data = await prisma.supply.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json(data);
  }

  const [data, total] = await Promise.all([
    prisma.supply.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.supply.count({ where }),
  ]);
  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await prisma.supply.create({
    data: {
      code: body.code, name: body.name, unit: body.unit || "개",
      unitPrice: body.unitPrice || 0, specification: body.specification || null,
      note: body.note || null, isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
