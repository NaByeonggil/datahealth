import { calculateDetailedQuotation } from "@/lib/quotation/calculateDetailed";

/**
 * AI 함수콜용 간이 견적 생성.
 * 원가/이윤/단가 산식은 상세견적서와 동일한 계산 모듈을 사용한다.
 * (여기서는 1 case = 1 개로 보고 productionQty 를 그대로 수량으로 쓴다)
 */
export async function generateQuotation(args: {
  productName: string;
  materialCosts: { name: string; quantityKg: number; unitPrice: number; totalCost: number }[];
  processingCostPerUnit: number;
  productionQty: number;
  packagingCost: number;
  profitRate?: number;
}): Promise<unknown> {
  const profitRate = args.profitRate ?? 5;

  const totals = calculateDetailedQuotation({
    packageUnit: 1,
    productionQty: args.productionQty,
    caseQty: args.productionQty,
    profitRate,
    vatRate: 10,
    materials: args.materialCosts.map((m) => ({
      materialName: m.name,
      inputKg: m.quantityKg,
      unitPrice: m.unitPrice,
      totalPrice: m.totalCost,
    })),
    supplies: [{ supplyName: "포장자재", inputQty: 1, unitPrice: args.packagingCost, totalPrice: args.packagingCost }],
    processes: [
      {
        processName: "가공",
        quantity: args.productionQty,
        unitCost: args.processingCostPerUnit,
        totalCost: args.processingCostPerUnit * args.productionQty,
      },
    ],
    overheads: [],
  });

  return {
    productName: args.productName,
    summary: {
      totalMaterialCost: totals.materialCost,
      totalProcessingCost: totals.processCost,
      packagingCost: totals.supplyCost,
      subtotal: totals.totalCostAmount,
      profitRate,
      profitAmount: totals.totalProfitAmount,
      totalAmount: totals.totalAmountExVat,
      productionQty: args.productionQty,
      unitPrice: Math.round(totals.pricePerCaseExVat),
      unitPriceIncVat: totals.suggestedUnitPrice,
    },
    breakdown: {
      materials: args.materialCosts,
      processing: {
        costPerUnit: args.processingCostPerUnit,
        quantity: args.productionQty,
        total: totals.processCost,
      },
      packaging: args.packagingCost,
    },
  };
}
