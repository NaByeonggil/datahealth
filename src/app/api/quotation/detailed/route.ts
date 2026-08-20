import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  detailedQuotationSchema,
  prepareDetailedQuotation,
  formatZodError,
} from "@/lib/quotation/detailedSchema";
import { nextDetailedQuotationNo } from "@/lib/quotation/quotationNo";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { productName: { contains: search } },
      { customerName: { contains: search } },
      { quotationNo: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.detailedQuotation.findMany({
      where,
      include: { materials: true, supplies: true, processes: true, overheads: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.detailedQuotation.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = detailedQuotationSchema.parse(body);
    const { header, materials, supplies, processes, overheads } =
      prepareDetailedQuotation(parsed);

    const quotationNo = parsed.quotationNo || (await nextDetailedQuotationNo());

    const quotation = await prisma.detailedQuotation.create({
      data: {
        ...header,
        quotationNo,
        materials: { create: materials },
        supplies: { create: supplies },
        processes: { create: processes },
        overheads: { create: overheads },
      },
      include: { materials: true, supplies: true, processes: true, overheads: true },
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
    }
    console.error("상세견적서 저장 실패:", error);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
