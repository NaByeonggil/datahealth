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
      { category: { contains: search } },
      { specification: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.materialCatalog.findMany({
      where,
      include: { supplier: { select: { name: true } }, material: { select: { id: true, code: true, unitPrice: true } } },
      orderBy: [{ supplierId: "asc" }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.materialCatalog.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}
