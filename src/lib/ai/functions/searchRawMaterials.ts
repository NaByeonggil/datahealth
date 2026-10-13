import { prisma } from "@/lib/prisma";
import { normName } from "./args";

const MAX_RESULTS = 10;

export async function searchRawMaterials(args: { keyword: string }): Promise<unknown> {
  const keyword = String(args.keyword ?? "").trim();
  if (!keyword) return { count: 0, materials: [], message: "검색 키워드가 필요합니다." };

  const found = await prisma.material.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { specification: { contains: keyword } },
      ],
    },
    include: { supplier: { select: { name: true } } },
    take: 100,
  });

  // 이름이 정확히 같은 것, 키워드로 시작하는 것, 이름이 짧은 것 순
  const key = normName(keyword);
  const rank = (name: string) => {
    const n = normName(name);
    return n === key ? 0 : n.startsWith(key) ? 1 : 2;
  };
  found.sort((a, b) => rank(a.name) - rank(b.name) || a.name.length - b.name.length);

  return {
    count: found.length,
    shown: Math.min(found.length, MAX_RESULTS),
    materials: found.slice(0, MAX_RESULTS).map((m) => ({
      code: m.code,
      name: m.name,
      unit: m.unit,
      unitPrice: m.unitPrice,
      supplierName: m.supplier.name,
      specification: m.specification,
    })),
  };
}
