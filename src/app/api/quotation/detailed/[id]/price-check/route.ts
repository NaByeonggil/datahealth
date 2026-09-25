import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { buildDriftReport } from "@/lib/quotation/priceDrift";
import { detailedDriftSources } from "@/lib/quotation/driftSources";

/** 이 견적 이후 원료 단가가 움직였는지 대조한다 (견적서 금액은 건드리지 않는다) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const quotation = await prisma.detailedQuotation.findUnique({
    where: { id },
    select: {
      id: true,
      quotationNo: true,
      createdAt: true,
      materials: {
        orderBy: { sortOrder: "asc" },
        select: {
          sortOrder: true,
          materialId: true,
          materialName: true,
          inputKg: true,
          unitPrice: true,
        },
      },
    },
  });
  if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const report = await buildDriftReport(detailedDriftSources(quotation));
  return NextResponse.json({
    quotationNo: quotation.quotationNo,
    issuedAt: quotation.createdAt,
    ...report,
  });
}
