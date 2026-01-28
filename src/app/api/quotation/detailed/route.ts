import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function generateQuotationNo() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `DQ${y}${m}${d}-${r}`;
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
    prisma.detailedQuotation.findMany({
      where,
      include: { materials: true, supplies: true, processes: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.detailedQuotation.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const quotationNo = body.quotationNo || generateQuotationNo();

  const quotation = await prisma.detailedQuotation.create({
    data: {
      quotationNo,
      productName: body.productName,
      customerName: body.customerName || null,
      productType: body.productType,
      formType: body.formType || null,
      contentAmount: body.contentAmount || null,
      packageUnit: body.packageUnit || 0,
      intakeGuide: body.intakeGuide || null,
      productionQty: body.productionQty || 0,
      unitWeight: body.unitWeight || 0,
      totalWeight: body.totalWeight || 0,
      yieldRate: body.yieldRate || 100,
      actualQty: body.actualQty || 0,
      packagingMethod: body.packagingMethod || null,
      inspectionCost: body.inspectionCost || 0,
      managementCost: body.managementCost || 0,
      deliveryCost: body.deliveryCost || 0,
      designCost: body.designCost || 0,
      onetimeCost: body.onetimeCost || 0,
      profitRate: body.profitRate || 5,
      note: body.note || null,
      materials: {
        create: (body.materials || []).map((m: Record<string, unknown>, i: number) => ({
          sortOrder: i + 1,
          materialName: m.materialName as string,
          specification: (m.specification as string) || null,
          mixRatio: (m.mixRatio as number) || 0,
          contentMg: (m.contentMg as number) || 0,
          inputKg: (m.inputKg as number) || 0,
          unitPrice: (m.unitPrice as number) || 0,
          totalPrice: (m.totalPrice as number) || 0,
          functionalContent: (m.functionalContent as string) || null,
          note: (m.note as string) || null,
        })),
      },
      supplies: {
        create: (body.supplies || []).map((s: Record<string, unknown>, i: number) => ({
          sortOrder: i + 1,
          supplyName: s.supplyName as string,
          specification: (s.specification as string) || null,
          quantity: (s.quantity as number) || 0,
          inputQty: (s.inputQty as number) || 0,
          unitPrice: (s.unitPrice as number) || 0,
          totalPrice: (s.totalPrice as number) || 0,
          note: (s.note as string) || null,
        })),
      },
      processes: {
        create: (body.processes || []).map((p: Record<string, unknown>, i: number) => ({
          sortOrder: i + 1,
          processName: p.processName as string,
          quantity: (p.quantity as number) || 0,
          unitCost: (p.unitCost as number) || 0,
          totalCost: (p.totalCost as number) || 0,
          note: (p.note as string) || null,
        })),
      },
    },
    include: { materials: true, supplies: true, processes: true },
  });

  return NextResponse.json(quotation, { status: 201 });
}
