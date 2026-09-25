import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { nextDetailedQuotationNo } from "@/lib/quotation/quotationNo";

const include = { materials: true, supplies: true, processes: true, overheads: true };

interface OverrideBody {
  productName?: string;
  customerName?: string | null;
  customerId?: string | null;
  clearCustomer?: boolean;
}

/**
 * 상세견적서 복제.
 *
 * 원료·자재·공정·간접비와 계산 스냅샷을 그대로 옮긴다(금액이 원본과 같아야 비교가 된다).
 * 상태는 항상 작성중으로 되돌린다 — 복제본은 아직 확정된 견적이 아니다.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body: OverrideBody = await request.json().catch(() => ({}));

    const src = await prisma.detailedQuotation.findUnique({ where: { id }, include });
    if (!src) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const pick = <T>(override: T | undefined, original: T): T =>
      override === undefined ? original : override;

    const created = await prisma.detailedQuotation.create({
      data: {
        quotationNo: await nextDetailedQuotationNo(),
        productName: (body.productName || src.productName).trim(),
        customerName: body.clearCustomer ? null : pick(body.customerName, src.customerName),
        customerId: body.clearCustomer ? null : pick(body.customerId, src.customerId),

        productType: src.productType,
        formType: src.formType,
        contentAmount: src.contentAmount,
        packageUnit: src.packageUnit,
        intakeGuide: src.intakeGuide,

        productionQty: src.productionQty,
        unitWeight: src.unitWeight,
        totalWeight: src.totalWeight,
        lossRate: src.lossRate,
        yieldRate: src.yieldRate,
        theoreticalQty: src.theoreticalQty,
        caseQty: src.caseQty,
        packagingMethod: src.packagingMethod,

        profitRate: src.profitRate,
        vatRate: src.vatRate,
        finalUnitPrice: src.finalUnitPrice,

        materialCost: src.materialCost,
        supplyCost: src.supplyCost,
        processCost: src.processCost,
        overheadCost: src.overheadCost,
        costSubtotal: src.costSubtotal,
        profitAmount: src.profitAmount,
        unitPriceExVat: src.unitPriceExVat,
        totalAmount: src.totalAmount,

        // 복제본은 새로 쓰는 견적이다 — 확정 상태와 유효기간은 따라가지 않는다
        status: "draft",
        validUntil: null,
        note: src.note,

        materials: {
          create: src.materials.map((m) => ({
            sortOrder: m.sortOrder,
            materialId: m.materialId,
            materialName: m.materialName,
            specification: m.specification,
            mixRatio: m.mixRatio,
            contentMg: m.contentMg,
            inputKg: m.inputKg,
            unitPrice: m.unitPrice,
            totalPrice: m.totalPrice,
            functionalContent: m.functionalContent,
            note: m.note,
          })),
        },
        supplies: {
          create: src.supplies.map((s) => ({
            sortOrder: s.sortOrder,
            supplyId: s.supplyId,
            supplyName: s.supplyName,
            specification: s.specification,
            quantity: s.quantity,
            inputQty: s.inputQty,
            unitPrice: s.unitPrice,
            totalPrice: s.totalPrice,
            note: s.note,
          })),
        },
        processes: {
          create: src.processes.map((p) => ({
            sortOrder: p.sortOrder,
            processId: p.processId,
            processName: p.processName,
            quantity: p.quantity,
            unitCost: p.unitCost,
            totalCost: p.totalCost,
            note: p.note,
          })),
        },
        overheads: {
          create: src.overheads.map((o) => ({
            sortOrder: o.sortOrder,
            name: o.name,
            amount: o.amount,
            note: o.note,
          })),
        },
      },
      include,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("상세견적서 복제 실패:", error);
    return NextResponse.json({ error: "복제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
