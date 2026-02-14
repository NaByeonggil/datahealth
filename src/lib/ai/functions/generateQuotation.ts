export async function generateQuotation(args: {
  productName: string;
  materialCosts: { name: string; quantityKg: number; unitPrice: number; totalCost: number }[];
  processingCostPerUnit: number;
  productionQty: number;
  packagingCost: number;
  profitRate?: number;
}): Promise<unknown> {
  const profitRate = args.profitRate ?? 5;

  const totalMaterialCost = args.materialCosts.reduce((sum, m) => sum + m.totalCost, 0);
  const totalProcessingCost = args.processingCostPerUnit * args.productionQty;
  const subtotal = totalMaterialCost + totalProcessingCost + args.packagingCost;
  const profitAmount = subtotal * (profitRate / 100);
  const totalAmount = subtotal + profitAmount;
  const unitPrice = args.productionQty > 0 ? totalAmount / args.productionQty : 0;

  return {
    productName: args.productName,
    summary: {
      totalMaterialCost,
      totalProcessingCost,
      packagingCost: args.packagingCost,
      subtotal,
      profitRate,
      profitAmount,
      totalAmount,
      productionQty: args.productionQty,
      unitPrice: Math.round(unitPrice),
    },
    breakdown: {
      materials: args.materialCosts,
      processing: {
        costPerUnit: args.processingCostPerUnit,
        quantity: args.productionQty,
        total: totalProcessingCost,
      },
      packaging: args.packagingCost,
    },
  };
}
