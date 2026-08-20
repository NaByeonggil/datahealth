import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  detailedQuotationSchema,
  prepareDetailedQuotation,
  formatZodError,
} from "@/lib/quotation/detailedSchema";
import { z } from "zod";

const include = {
  materials: { orderBy: { sortOrder: "asc" } },
  supplies: { orderBy: { sortOrder: "asc" } },
  processes: { orderBy: { sortOrder: "asc" } },
  overheads: { orderBy: { sortOrder: "asc" } },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quotation = await prisma.detailedQuotation.findUnique({ where: { id }, include });
  if (!quotation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(quotation);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = detailedQuotationSchema.parse(body);
    const { header, materials, supplies, processes, overheads } =
      prepareDetailedQuotation(parsed);

    const existing = await prisma.detailedQuotation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 자식 행은 통째로 교체한다 (행 추가/삭제/순서변경을 그대로 반영)
    const quotation = await prisma.$transaction(async (tx) => {
      await tx.detailedMaterialItem.deleteMany({ where: { quotationId: id } });
      await tx.detailedSupplyItem.deleteMany({ where: { quotationId: id } });
      await tx.detailedProcessItem.deleteMany({ where: { quotationId: id } });
      await tx.detailedOverheadItem.deleteMany({ where: { quotationId: id } });

      return tx.detailedQuotation.update({
        where: { id },
        data: {
          ...header,
          ...(parsed.quotationNo ? { quotationNo: parsed.quotationNo } : {}),
          materials: { create: materials },
          supplies: { create: supplies },
          processes: { create: processes },
          overheads: { create: overheads },
        },
        include,
      });
    });

    return NextResponse.json(quotation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
    }
    console.error("상세견적서 수정 실패:", error);
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.detailedQuotation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("상세견적서 삭제 실패:", error);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
