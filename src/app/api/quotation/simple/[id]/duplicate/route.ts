import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { nextSimpleQuotationNo } from "@/lib/quotation/quotationNo";
import { simpleQuotationInclude as include } from "@/lib/quotation/simpleQuotationPayload";

/** 복제하면서 바꿔 넣을 수 있는 값 — 보내지 않으면 원본을 그대로 따른다 */
interface OverrideBody {
  productName?: string;
  customerName?: string | null;
  customerContact?: string | null;
  customerPhone?: string | null;
  customerFax?: string | null;
  /** 수신처만 비우고 시작하고 싶을 때 */
  clearCustomer?: boolean;
}

/**
 * 일반견적서 복제.
 *
 * 배합·포장옵션을 단가까지 그대로 옮긴다 — 복제의 목적은 "같은 조건으로 다시 내는 것"이라
 * 여기서 마스터의 최신 단가를 끌어오면 원본과 금액이 달라져 비교가 안 된다.
 * 단가를 새로 반영하려면 복제한 뒤 배합 템플릿을 다시 얹으면 된다.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body: OverrideBody = await request.json().catch(() => ({}));

    const src = await prisma.simpleQuotation.findUnique({ where: { id }, include });
    if (!src) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const pick = <T>(override: T | undefined, original: T): T =>
      override === undefined ? original : override;

    const created = await prisma.simpleQuotation.create({
      data: {
        quotationNo: await nextSimpleQuotationNo(),
        productName: (body.productName || src.productName).trim(),
        customerName: body.clearCustomer ? null : pick(body.customerName, src.customerName),
        customerContact: body.clearCustomer ? null : pick(body.customerContact, src.customerContact),
        customerPhone: body.clearCustomer ? null : pick(body.customerPhone, src.customerPhone),
        customerFax: body.clearCustomer ? null : pick(body.customerFax, src.customerFax),
        validDays: src.validDays,
        deliveryTerms: src.deliveryTerms,
        paymentTerms: src.paymentTerms,
        foodType: src.foodType,
        sumOptions: src.sumOptions,
        totalMaterialCost: src.totalMaterialCost,
        totalAmount: src.totalAmount,
        note: src.note,
        products: {
          create: src.products.map((p) => ({
            sortOrder: p.sortOrder,
            name: p.name,
            productTypeId: p.productTypeId,
            subMaterialCostPerUnit: p.subMaterialCostPerUnit,
            productSpec: p.productSpec,
            dosage: p.dosage,
            items: {
              create: p.items.map((i) => ({
                sortOrder: i.sortOrder,
                category: i.category,
                role: i.role,
                materialName: i.materialName,
                theoryAmount: i.theoryAmount,
                actualAmount: i.actualAmount,
                kgUnitPrice: i.kgUnitPrice,
                materialCost: i.materialCost,
                origin: i.origin,
              })),
            },
            lines: {
              create: p.lines.map((l) => ({
                sortOrder: l.sortOrder,
                label: l.label,
                packageUnit: l.packageUnit,
                bottleBoxCost: l.bottleBoxCost,
                setCount: l.setCount,
                packagingMethod: l.packagingMethod,
                unit: l.unit,
              })),
            },
          })),
        },
      },
      include,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("일반견적서 복제 실패:", error);
    return NextResponse.json({ error: "복제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
