import { prisma } from "@/lib/prisma";
import { rankTollingRates } from "@/lib/quotation/resolveTollingRate";
import { normName, toNumber } from "./args";

const BASIS_LABEL: Record<string, string> = {
  per_case: "케이스당",
  per_bottle: "병당",
  per_tablet: "정(캡슐)당",
};

/** 단어 순서와 괄호를 무시한 비교용 키 — "바이알(20ml)" 과 "20ml 바이알" 을 같게 본다 */
const tokenKey = (v: string) =>
  v.toLowerCase().split(/[\s()（）,/]+/).filter(Boolean).sort().join("|");

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

  // 마스터에 같은 제형이 단어 순서만 달리 등록돼 있으면 그 이름으로 조회한다.
  // 순위 규칙은 글자 순서까지 같아야 완전 일치로 쳐서, 표현에 따라 단가가 달라지기 때문이다.
  const forms = [...new Set(rates.map((r) => r.formName))];
  const lookupName =
    forms.find((f) => normName(f) === normName(formName)) ??
    forms.find((f) => tokenKey(f) === tokenKey(formName)) ??
    formName;

  const ranked = formName
    ? rankTollingRates(
        rates.map((r) => ({ ...r, effectiveDate: r.effectiveDate.toISOString() })),
        { formName: lookupName, quantity: productionQty }
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

    const isExact = normName(best.rate.formName) === normName(lookupName);

    return {
      found: true,
      source: "임가공비 단가",
      requestedForm: formName,
      matchedForm: best.rate.formName,
      matchType: isExact ? "exact" : "partial",
      // 요청한 제형과 이름이 딱 맞지 않으면 사람이 확인할 수 있게 알린다
      matchNote: isExact
        ? undefined
        : `요청한 '${formName}'과 정확히 일치하는 제형이 없어 가장 가까운 '${best.rate.formName}' 단가를 썼습니다. 맞는지 사용자에게 확인하세요.`,
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
