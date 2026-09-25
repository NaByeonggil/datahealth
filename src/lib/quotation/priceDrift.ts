/**
 * 발행된 견적서 ↔ 현재 원료 단가 대조.
 *
 * 견적서에 박힌 단가는 발행 시점 스냅샷이라 절대 손대지 않는다. 대신 마스터의
 * 지금 단가와 견줘 "이 견적 이후 원료 단가가 변동됨"을 알려준다 — 재견적할 때
 * 어디를 다시 봐야 하는지 짚어주는 용도다.
 *
 * 연결은 materialId 가 있으면 그것으로, 없으면 원료명이 정확히 일치하고 후보가
 * 하나뿐일 때만 잇는다. 예전에 저장된 견적서에는 materialId 가 없어 이름 대조가
 * 유일한 길이고, 동명이의 원료를 잘못 짚느니 "확인 불가"로 남기는 편이 낫다.
 */
import { prisma } from "@/lib/prisma";

/** 대조할 견적서 한 줄 */
export interface DriftSource {
  /** 화면에 되짚어 줄 위치 — "제품 1 · 2행" 같은 것 */
  location: string;
  materialId?: string | null;
  materialName: string;
  /** 견적서에 박힌 단가(원/kg) */
  quotedPrice: number;
  /** 단가 × 이 값 = 이 줄의 금액. 영향액을 내는 데 쓴다 */
  costFactor: number;
}

export interface DriftRow {
  location: string;
  materialName: string;
  quotedPrice: number;
  currentPrice: number;
  diff: number;
  /** 변동률(%) — 견적 단가가 0이면 null */
  diffRate: number | null;
  /** 현재 단가가 적용되기 시작한 날 */
  changedAt: string | null;
  changedBy: string | null;
  changeReason: string | null;
  matchedBy: "id" | "name";
  /** 이 줄의 금액이 얼마나 달라지는가 */
  quotedCost: number;
  currentCost: number;
}

export interface DriftReport {
  checkedAt: string;
  totalItems: number;
  /** 마스터에 이어 붙은 줄 수 */
  matchedItems: number;
  /** 원료명이 마스터에 없거나 동명이의라 대조하지 못한 원료명 */
  unmatchedNames: string[];
  changed: DriftRow[];
  /** 변동분을 반영하면 원료비가 얼마가 되는가 (대조된 줄만 합산) */
  quotedCost: number;
  currentCost: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 견적서 줄들을 현재 마스터 단가와 대조한다.
 * 조회는 id 묶음 1회 + 이름 묶음 1회로 끝낸다(줄마다 질의하지 않는다).
 */
export async function buildDriftReport(sources: DriftSource[]): Promise<DriftReport> {
  const ids = [...new Set(sources.map((s) => s.materialId).filter((v): v is string => !!v))];
  const names = [...new Set(sources.filter((s) => !s.materialId).map((s) => s.materialName))];

  const [byIdRows, byNameRows] = await Promise.all([
    ids.length
      ? prisma.material.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, unitPrice: true },
        })
      : Promise.resolve([]),
    names.length
      ? prisma.material.findMany({
          where: { name: { in: names }, isActive: true },
          select: { id: true, name: true, unitPrice: true },
        })
      : Promise.resolve([]),
  ]);

  const byId = new Map(byIdRows.map((m) => [m.id, m]));

  // 같은 이름이 둘 이상이면 어느 쪽인지 알 수 없다 — 잇지 않고 확인 불가로 남긴다
  const byName = new Map<string, { id: string; name: string; unitPrice: number } | null>();
  for (const m of byNameRows) {
    byName.set(m.name, byName.has(m.name) ? null : m);
  }

  // 변동이 잡힌 원료만 이력을 한 번 더 읽어 "언제·누가·왜" 를 붙인다
  const matched = sources
    .map((s) => ({ src: s, master: s.materialId ? byId.get(s.materialId) ?? null : byName.get(s.materialName) ?? null }))
    .filter((r) => r.master !== null) as { src: DriftSource; master: { id: string; unitPrice: number } }[];

  const changedIds = [
    ...new Set(
      matched.filter((r) => round2(r.master.unitPrice) !== round2(r.src.quotedPrice)).map((r) => r.master.id)
    ),
  ];

  const histories = changedIds.length
    ? await prisma.materialPrice.findMany({
        where: { materialId: { in: changedIds }, endDate: null },
        orderBy: { effectiveDate: "desc" },
        select: { materialId: true, effectiveDate: true, changedBy: true, changeReason: true },
      })
    : [];
  const currentRow = new Map(histories.map((h) => [h.materialId, h]));

  const changed: DriftRow[] = [];
  let quotedCost = 0;
  let currentCost = 0;
  const unmatchedNames = new Set<string>();
  let matchedItems = 0;

  for (const s of sources) {
    const master = s.materialId ? byId.get(s.materialId) ?? null : byName.get(s.materialName) ?? null;
    if (!master) {
      if (s.materialName.trim()) unmatchedNames.add(s.materialName);
      continue;
    }

    matchedItems++;
    const quoted = round2(s.quotedPrice);
    const current = round2(master.unitPrice);
    quotedCost += s.quotedPrice * s.costFactor;
    currentCost += master.unitPrice * s.costFactor;

    if (quoted === current) continue;

    const row = currentRow.get(master.id);
    changed.push({
      location: s.location,
      materialName: s.materialName,
      quotedPrice: quoted,
      currentPrice: current,
      diff: round2(current - quoted),
      diffRate: quoted > 0 ? round2(((current - quoted) / quoted) * 100) : null,
      changedAt: row?.effectiveDate ? row.effectiveDate.toISOString() : null,
      changedBy: row?.changedBy ?? null,
      changeReason: row?.changeReason ?? null,
      matchedBy: s.materialId ? "id" : "name",
      quotedCost: round2(s.quotedPrice * s.costFactor),
      currentCost: round2(master.unitPrice * s.costFactor),
    });
  }

  // 원가에 크게 미치는 것부터 — 재견적에서 먼저 봐야 할 순서다
  changed.sort(
    (a, b) =>
      Math.abs(b.currentCost - b.quotedCost) - Math.abs(a.currentCost - a.quotedCost) ||
      Math.abs(b.diff) - Math.abs(a.diff)
  );

  return {
    checkedAt: new Date().toISOString(),
    totalItems: sources.length,
    matchedItems,
    unmatchedNames: [...unmatchedNames],
    changed,
    quotedCost: round2(quotedCost),
    currentCost: round2(currentCost),
  };
}
