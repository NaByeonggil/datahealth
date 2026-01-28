import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId");
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = { isActive: true };
  if (supplierId) where.supplierId = supplierId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.material.findMany({
      where,
      include: { supplier: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.material.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await prisma.material.create({
    data: {
      supplierId: body.supplierId,
      code: body.code, name: body.name,
      category: body.category || "일반식품", origin: body.origin || null,
      specification: body.specification || null,
      unit: body.unit || "kg", unitPrice: body.unitPrice || 0,
      minOrderQty: body.minOrderQty || null,
      isFunctional: body.isFunctional || false,
      certifications: body.certifications || null,
      note: body.note || null, updatedBy: body.updatedBy || "관리자",
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
