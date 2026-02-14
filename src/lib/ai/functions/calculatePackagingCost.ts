import { prisma } from "@/lib/prisma";

export async function calculatePackagingCost(args: { productionQty: number; packageUnit?: number }): Promise<unknown> {
  // 모든 활성 자재 조회
  const supplies = await prisma.supply.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const packageUnit = args.packageUnit ?? 1;
  const totalPackages = Math.ceil(args.productionQty / packageUnit);

  const supplyItems = supplies.map((s) => {
    // 기본 수량은 totalPackages 기준으로 계산
    const estimatedQty = totalPackages;
    const totalCost = s.unitPrice * estimatedQty;
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      unit: s.unit,
      unitPrice: s.unitPrice,
      specification: s.specification,
      estimatedQty,
      totalCost,
    };
  });

  const totalPackagingCost = supplyItems.reduce((sum, item) => sum + item.totalCost, 0);

  return {
    productionQty: args.productionQty,
    packageUnit,
    totalPackages,
    supplies: supplyItems,
    totalPackagingCost,
  };
}
