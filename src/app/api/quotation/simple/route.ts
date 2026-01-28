import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function generateQuotationNo() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `SQ${y}${m}${d}-${r}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";

  const where = search
    ? {
        OR: [
          { productName: { contains: search } },
          { customerName: { contains: search } },
          { quotationNo: { contains: search } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.simpleQuotation.findMany({
      where,
      include: { productType: true, items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.simpleQuotation.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const quotationNo = body.quotationNo || generateQuotationNo();

  const quotation = await prisma.simpleQuotation.create({
    data: {
      quotationNo,
      productName: body.productName,
      customerName: body.customerName || null,
      productTypeId: body.productTypeId,
      packageUnit: body.packageUnit || 0,
      bottleBoxCost: body.bottleBoxCost || 0,
      setCount: body.setCount || 1,
      totalMaterialCost: body.totalMaterialCost || 0,
      totalAmount: body.totalAmount || 0,
      note: body.note || null,
      items: {
        create: (body.items || []).map((item: Record<string, unknown>, i: number) => ({
          sortOrder: i + 1,
          category: item.category as string,
          materialName: item.materialName as string,
          theoryAmount: (item.theoryAmount as number) || 0,
          actualAmount: (item.actualAmount as number) || 0,
          kgUnitPrice: (item.kgUnitPrice as number) || 0,
          materialCost: (item.materialCost as number) || 0,
          origin: (item.origin as string) || null,
        })),
      },
    },
    include: { items: true, productType: true },
  });

  return NextResponse.json(quotation, { status: 201 });
}
