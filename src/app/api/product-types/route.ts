import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "0");
  const limit = Number(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = all ? {} : { isActive: true };
  if (search) {
    where.OR = [{ name: { contains: search } }, { code: { contains: search } }];
  }

  if (!page) {
    const data = await prisma.productType.findMany({ where, orderBy: { sortOrder: "asc" } });
    return NextResponse.json(data);
  }

  const [data, total] = await Promise.all([
    prisma.productType.findMany({ where, orderBy: { sortOrder: "asc" }, skip: (page - 1) * limit, take: limit }),
    prisma.productType.count({ where }),
  ]);
  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await prisma.productType.create({
    data: {
      code: body.code, name: body.name,
      processingCost: body.processingCost || 0,
      description: body.description || null,
      sortOrder: body.sortOrder || 0,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
