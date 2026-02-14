import { prisma } from "@/lib/prisma";

export async function calculateProcessingCost(args: { productTypeName: string; productionQty: number }): Promise<unknown> {
  const productType = await prisma.productType.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { contains: args.productTypeName } },
        { code: { contains: args.productTypeName } },
      ],
    },
    include: {
      processingCosts: {
        where: { isCurrent: true },
        take: 1,
      },
    },
  });

  if (!productType) {
    // 사용 가능한 제품유형 목록 반환
    const available = await prisma.productType.findMany({
      where: { isActive: true },
      select: { name: true, processingCost: true },
      orderBy: { sortOrder: "asc" },
    });
    return {
      found: false,
      message: `'${args.productTypeName}' 제품유형을 찾을 수 없습니다.`,
      availableTypes: available,
    };
  }

  // 현재 가공비 (이력이 있으면 이력 사용, 없으면 기본값)
  const currentCost = productType.processingCosts[0]?.cost ?? productType.processingCost;
  const totalProcessingCost = currentCost * args.productionQty;

  return {
    found: true,
    productType: {
      id: productType.id,
      code: productType.code,
      name: productType.name,
    },
    calculation: {
      costPerUnit: currentCost,
      productionQty: args.productionQty,
      totalProcessingCost,
    },
  };
}
