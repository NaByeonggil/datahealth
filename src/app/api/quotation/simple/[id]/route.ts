import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quotation = await prisma.simpleQuotation.findUnique({
    where: { id },
    include: { productType: true, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quotation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(quotation);
}
