import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 원료 단가 이력 — 최신순. endDate 가 비어 있는 행이 현재 단가다. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const material = await prisma.material.findUnique({
    where: { id },
    select: { id: true, name: true, code: true, unitPrice: true, unit: true },
  });
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const history = await prisma.materialPrice.findMany({
    where: { materialId: id },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ material, history });
}
