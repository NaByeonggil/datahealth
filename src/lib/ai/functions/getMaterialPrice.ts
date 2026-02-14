import { prisma } from "@/lib/prisma";

export async function getMaterialPrice(args: { materialName: string; quantityKg?: number }): Promise<unknown> {
  const material = await prisma.material.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { contains: args.materialName } },
        { code: { contains: args.materialName } },
      ],
    },
    include: {
      supplier: { select: { name: true } },
      priceHistory: { orderBy: { effectiveDate: "desc" }, take: 3 },
    },
  });

  if (!material) {
    return { found: false, message: `'${args.materialName}' 원료를 찾을 수 없습니다.` };
  }

  const quantity = args.quantityKg ?? 1;
  const totalCost = material.unitPrice * quantity;

  return {
    found: true,
    material: {
      id: material.id,
      code: material.code,
      name: material.name,
      unit: material.unit,
      unitPrice: material.unitPrice,
      supplierName: material.supplier.name,
      origin: material.origin,
      specification: material.specification,
    },
    calculation: {
      quantityKg: quantity,
      unitPrice: material.unitPrice,
      totalCost,
    },
    priceHistory: material.priceHistory.map((p) => ({
      price: p.price,
      effectiveDate: p.effectiveDate,
    })),
  };
}
