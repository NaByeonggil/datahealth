import { prisma } from "@/lib/prisma";

export async function searchRawMaterials(args: { keyword: string; category?: string }): Promise<unknown> {
  const where: Record<string, unknown> = { isActive: true };

  if (args.keyword) {
    where.OR = [
      { name: { contains: args.keyword } },
      { code: { contains: args.keyword } },
      { specification: { contains: args.keyword } },
    ];
  }

  if (args.category) {
    where.category = args.category;
  }

  const materials = await prisma.material.findMany({
    where,
    include: { supplier: { select: { name: true } } },
    take: 20,
    orderBy: { name: "asc" },
  });

  return {
    count: materials.length,
    materials: materials.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      category: m.category,
      origin: m.origin,
      specification: m.specification,
      unit: m.unit,
      unitPrice: m.unitPrice,
      isFunctional: m.isFunctional,
      supplierName: m.supplier.name,
    })),
  };
}
