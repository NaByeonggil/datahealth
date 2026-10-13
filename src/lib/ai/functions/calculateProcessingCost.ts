import { prisma } from "@/lib/prisma";
import { rankTollingRates } from "@/lib/quotation/resolveTollingRate";
import { toNumber } from "./args";

const BASIS_LABEL: Record<string, string> = {
  per_case: "케이스당",
  per_bottle: "병당",
  per_tablet: "정(캡슐)당",
};

/**
 * 제형별 가공비(임가공비) 조회.
 * 견적 폼의 "가공비 조회"와 같은 임가공비 단가 마스터·같은 순위 규칙을 쓴다.
 */
export async function calculateProcessingCost(args: { productTypeName: string; productionQty: number }): Promise<unknown> {
  const formName = String(args.productTypeName ?? "").trim();
  const productionQty = toNumber(args.productionQty);

  const rates = await prisma.tollingRate.findMany({
    where: { isCurrent: true },
    orderBy: { unitCost: "asc" },
  });

  const ranked = formName
    ? rankTollingRates(
        rates.map((r) => ({ ...r, effectiveDate: r.effectiveDate.toISOString() })),
        { formName, quantity: productionQty }
      )
    : [];

  if (ranked.length > 0) {
    const [best, ...rest] = ranked;
    const describe = (r: (typeof ranked)[number]) => ({
      vendorName: r.rate.vendorName,
      formName: r.rate.formName,
      specLabel: r.rate.specLabel,
      unitCost: r.rate.unitCost,
      costBasis: r.rate.costBasis,
      moq: r.rate.qtyMin,
      belowMoq: r.belowMoq,
      note: r.reasons.join(", ") || undefined,
    });

    return {
      found: true,
      source: "임가공비 단가",
      selected: describe(best),
      calculation: {
        costPerUnit: best.rate.unitCost,
        productionQty,
        totalProcessingCost: Math.round(best.rate.unitCost * productionQty),
      },
      warning: best.belowMoq
        ? `생산수량이 MOQ(${best.rate.qtyMin.toLocaleString()}) 미만입니다. 할증 또는 협의가 필요할 수 있습니다.`
        : undefined,
      // 단가 기준이 완제품 1개가 아니면 수량을 그대로 곱한 합계는 맞지 않을 수 있다
      basisNote:
        best.rate.costBasis !== "per_unit"
          ? `이 단가는 ${BASIS_LABEL[best.rate.costBasis] ?? best.rate.costBasis} 기준입니다. 생산수량이 그 단위가 아니면 환산이 필요합니다.`
          : undefined,
      alternatives: rest.slice(0, 3).map(describe),
    };
  }

  // 임가공비 단가에 없으면 제품유형의 기본 가공비
  const productType = formName
    ? await prisma.productType.findFirst({
        where: { isActive: true, OR: [{ name: { contains: formName } }, { code: { contains: formName } }] },
      })
    : null;

  if (productType) {
    return {
      found: true,
      source: "제품유형 기본 가공비",
      selected: { formName: productType.name, unitCost: productType.processingCost, costBasis: "per_unit" },
      calculation: {
        costPerUnit: productType.processingCost,
        productionQty,
        totalProcessingCost: Math.round(productType.processingCost * productionQty),
      },
    };
  }

  return {
    found: false,
    message: `'${formName}' 제형의 가공비를 찾을 수 없습니다. 아래 제형 중에서 다시 조회하세요.`,
    availableTypes: [...new Set(rates.map((r) => r.formName))].slice(0, 40),
  };
}
