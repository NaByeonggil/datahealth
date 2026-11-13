import { prisma } from "@/lib/prisma";
import { loadStandards } from "@/lib/materials/functionalQuery";
import { makeMatcher, normalize } from "@/lib/materials/functionalStandards";
import { calcDose, formatDaily, type DoseResult } from "@/lib/materials/functionalDaily";
import { toNumber } from "./args";

const MAX_CANDIDATES = 8;

type Std = Awaited<ReturnType<typeof loadStandards>>[number];

const contentSelect = { select: { status: true, component: true, amount: true, unit: true, qualifier: true } };

function standardInfo(s: Std) {
  return {
    code: s.code,
    name: s.name,
    component: s.component,
    dailyIntake: formatDaily(s) ?? "미등록",
    quoteBasis: s.quoteMin != null ? `${s.quoteMin} ${s.dailyUnit} (회사 견적 기준)` : undefined,
    verified: s.dailyVerified,
    note: s.dailyNote ?? undefined,
  };
}

function judge(dose: DoseResult, plannedKg: number) {
  if (!dose.ok || dose.requiredKg == null || plannedKg <= 0) return undefined;
  if (plannedKg + 1e-9 < dose.requiredKg) {
    return { status: "미달", plannedKg, requiredKg: dose.requiredKg,
      message: `요청 투입량 ${plannedKg}kg 은 공전 기준에 미달합니다. 최소 ${dose.requiredKg}kg 이 필요합니다.` };
  }
  if (dose.maxKg != null && plannedKg > dose.maxKg + 1e-9) {
    return { status: "상한 초과", plannedKg, maxKg: dose.maxKg,
      message: `요청 투입량 ${plannedKg}kg 은 1일 섭취량 상한을 넘습니다 (최대 ${dose.maxKg}kg).` };
  }
  return { status: "충족", plannedKg, requiredKg: dose.requiredKg, message: "공전 기준을 충족합니다." };
}

/** 공전 원료를 이름(또는 매칭 키워드)으로 찾는다 */
function findStandards(standards: Std[], keyword: string): Std[] {
  const k = normalize(keyword);
  const exact = standards.filter((s) => normalize(s.name) === k || (s.code && s.code === keyword.trim()));
  if (exact.length) return exact;
  const byName = standards.filter((s) => normalize(s.name).includes(k) || k.includes(normalize(s.name)));
  if (byName.length) return byName;
  const ids = makeMatcher(standards)(keyword);
  return standards.filter((s) => ids.includes(s.id));
}

/**
 * 건기식 공전 기준 확인 — 1일 섭취량 기준으로 원료 최소 투입량을 계산한다.
 * 계산은 여기서만 한다 (모델이 직접 나누고 곱하지 않게).
 */
export async function checkFunctionalStandard(raw: {
  keyword?: string; materialCode?: string; daysPerUnit?: number; productionQty?: number; plannedKg?: number;
}): Promise<unknown> {
  const keyword = String(raw.keyword ?? "").trim();
  const materialCode = String(raw.materialCode ?? "").trim();
  const opts = { daysPerUnit: toNumber(raw.daysPerUnit), productionQty: toNumber(raw.productionQty) };
  const plannedKg = toNumber(raw.plannedKg);
  if (!keyword && !materialCode) return { found: false, message: "공전 원료명·원료명 또는 원료 코드가 필요합니다." };

  const standards = await loadStandards();
  const needQty = !(opts.daysPerUnit > 0 && opts.productionQty > 0)
    ? "1개 제품당 섭취일수(daysPerUnit)와 생산수량(productionQty)을 주면 총 필요 투입량(kg)을 계산합니다. 모르면 사용자에게 물어보세요."
    : undefined;

  // 1) 원료 코드가 있으면 그 원료 기준으로 계산
  if (materialCode) {
    const m = await prisma.material.findFirst({
      where: { code: materialCode, isActive: true },
      include: { supplier: { select: { name: true } }, content: contentSelect },
    });
    if (!m) return { found: false, message: `원료 코드 '${materialCode}'를 찾을 수 없습니다.` };
    const ids = makeMatcher(standards)(m.name);
    let matched = standards.filter((s) => ids.includes(s.id));
    if (keyword) {
      const want = findStandards(standards, keyword).map((s) => s.id);
      const narrowed = matched.filter((s) => want.includes(s.id));
      if (narrowed.length) matched = narrowed;
    }
    if (!matched.length) {
      return { found: false, message: `'${m.name}'은(는) 건기식 공전 원료 기준표에 해당하지 않습니다. 공전 기준 확인 없이 진행하세요.` };
    }
    return {
      found: true,
      material: {
        code: m.code, name: m.name, supplierName: m.supplier.name, unitPrice: m.unitPrice,
        specification: m.specification,
        content: m.content?.amount != null ? `${m.content.component ? m.content.component + " " : ""}${m.content.amount}${m.content.unit ?? ""}` : "미등록",
      },
      checks: matched.map((s) => {
        const dose = calcDose(s, m.content, opts);
        return { standard: standardInfo(s), dose, judgement: judge(dose, plannedKg) };
      }),
      note: needQty,
    };
  }

  // 2) 공전 원료로 찾고, 해당 원료 후보별 필요량을 계산
  const found = findStandards(standards, keyword);
  if (!found.length) {
    return { found: false, message: `'${keyword}'에 해당하는 건기식 공전 원료가 없습니다. 공전 기준 확인 없이 진행하세요.` };
  }
  if (found.length > 1) {
    return {
      found: false, ambiguous: true,
      message: `'${keyword}'에 해당하는 공전 원료가 ${found.length}건입니다. 사용자에게 어느 것인지 확인하세요.`,
      candidates: found.slice(0, MAX_CANDIDATES).map(standardInfo),
    };
  }
  const std = found[0];
  const match = makeMatcher([std]);
  const materials = await prisma.material.findMany({
    where: { isActive: true },
    select: { code: true, name: true, unitPrice: true, specification: true, supplier: { select: { name: true } }, content: contentSelect },
  });
  const rows = materials.filter((m) => match(m.name).length).map((m) => {
    const dose = calcDose(std, m.content, opts);
    // 1일분 원료비 — 후보끼리 비교용
    const dailyCost = dose.ok && dose.dailyMaterialG != null ? Math.round((dose.dailyMaterialG / 1000) * m.unitPrice * 100) / 100 : null;
    return {
      code: m.code, name: m.name, supplierName: m.supplier.name, unitPrice: m.unitPrice,
      content: m.content?.amount != null ? `${m.content.component ? m.content.component + " " : ""}${m.content.amount}${m.content.unit ?? ""}` : "미등록",
      dailyMaterialG: dose.dailyMaterialG, requiredKg: dose.requiredKg, maxKg: dose.maxKg,
      dailyCost, reason: dose.reason,
    };
  });
  // 계산되는 원료를 먼저, 그중 1일분 원료비가 싼 순
  rows.sort((a, b) => (a.dailyCost == null ? 1 : 0) - (b.dailyCost == null ? 1 : 0) || (a.dailyCost ?? 0) - (b.dailyCost ?? 0));

  const base = calcDose(std, null, opts);
  return {
    found: true,
    standard: standardInfo(std),
    warnings: base.warnings.length ? base.warnings : undefined,
    materialCount: rows.length,
    candidates: rows.slice(0, MAX_CANDIDATES),
    message: rows.length
      ? "후보 원료와 공전 기준 필요량입니다. 사용자가 원료를 고르면 materialCode 로 다시 호출해 확인하세요."
      : "이 공전 원료에 해당하는 단가 보유 원료가 없습니다.",
    note: needQty,
  };
}
