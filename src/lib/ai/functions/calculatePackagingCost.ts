import { prisma } from "@/lib/prisma";
import { normName, toNumber } from "./args";

/**
 * 부자재비 산출 — 부자재 세트 마스터 기준.
 * 세트를 특정하지 못하면 금액을 지어내지 않고 고를 수 있는 세트 목록을 돌려준다.
 */
export async function calculatePackagingCost(args: { productionQty: number; packagingName?: string }): Promise<unknown> {
  const productionQty = toNumber(args.productionQty);
  const keyword = normName(String(args.packagingName ?? ""));

  const sets = await prisma.packagingSet.findMany({
    where: { isCurrent: true },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });

  const matched = keyword
    ? sets.filter((s) => {
        const names = [s.name, s.formName ?? "", s.code].map(normName);
        return names.some((n) => n && (n.includes(keyword) || keyword.includes(n)));
      })
    : [];

  if (matched.length !== 1) {
    const pool = matched.length > 1 ? matched : sets;
    return {
      found: false,
      message:
        matched.length > 1
          ? "해당하는 부자재 세트가 여러 개입니다. 사용자에게 어느 세트인지 확인하세요."
          : "해당하는 부자재 세트가 없습니다. 사용자에게 부자재 구성을 확인하고, 모르면 부자재비를 0원으로 두고 '부자재비 별도'라고 안내하세요.",
      availableSets: pool.map((s) => ({ name: s.name, formName: s.formName, vendorName: s.vendorName })),
    };
  }

  const set = matched[0];
  // 사급(고객 제공) 자재는 원가에서 뺀다
  const items = set.items.map((i) => ({
    name: i.name,
    spec: i.spec,
    unitPrice: i.unitPrice,
    qtyPerUnit: i.qtyPerUnit,
    isFreeIssue: i.isFreeIssue,
    costPerUnit: i.isFreeIssue ? 0 : i.unitPrice * i.qtyPerUnit,
  }));
  const costPerUnit = items.reduce((sum, i) => sum + i.costPerUnit, 0);

  return {
    found: true,
    set: { name: set.name, formName: set.formName, vendorName: set.vendorName, note: set.note },
    items,
    calculation: {
      costPerUnit,
      productionQty,
      totalPackagingCost: Math.round(costPerUnit * productionQty),
    },
  };
}
