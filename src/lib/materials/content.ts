/**
 * 원료 규격(자유 텍스트)에서 함유량 읽기 — MaterialContent 의 자동 추출 규칙
 *
 * Material.specification / MaterialCatalog.specification 은 함량·균수 외에도
 * 공급사명·연락처·재고·단가 메모가 섞인 자유 텍스트다. 여기서 함량으로 읽을 수 있는
 * 표현만 뽑는다.
 *
 *   %          "실리마린 50% 이상", "철분7.8~9%", "Fe 5%"
 *   단위/g     "300mg/g", "Angoroside C 5mg/g", "4000만유닛/g"
 *   균수       "2000억", "100억cfg/g", "100B"(=1000억), "2000cfg/g"
 *   Brix       "BRIX 68", "60brix", "20브릭스"
 *
 * 함량이 여럿이면 규격에서 가장 앞에 나온 것을 대표값으로 두고 전부는 matches 에 남긴다.
 * 규격이 비었으면 "규격없음", 규격은 있는데 함량을 못 찾으면 "함량없음".
 */
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const CONTENT_STATUSES = ["추출", "함량없음", "규격없음"] as const;

interface Hit {
  index: number;
  length: number;
  text: string;
  component: string | null;
  amount: number;
  amountMax: number | null;
  unit: string;
  qualifier: string | null;
}

const num = (s: string) => Number(s.replace(/,/g, ""));
// 숫자 앞에 영문·숫자가 붙어 있으면 성분명의 일부("Rb1%", "B12")라 함량으로 보지 않는다
const NUM = String.raw`(?<![A-Za-z\d.,])(\d[\d,]*(?:\.\d+)?)`;
const RANGE = String.raw`(?:\s*[~∼\-]\s*(\d[\d,]*(?:\.\d+)?))?`;

// 단가·오차 메모의 % 는 함량이 아니다 ("+- 20% 감안", "부가세 10%")
const NOT_CONTENT_BEFORE = /(\+-|\+\/-|±|부가세|vat|할인|인상|마진|오차)\s*$/i;
const NOT_CONTENT_AFTER = /^\s*(감안|할인|인상|오차|마진|dc)/i;

/** 함량 앞의 텍스트에서 지표성분명을 고른다 */
function componentBefore(spec: string, index: number): string | null {
  const head = spec.slice(0, index);
  // 공백 두 칸 이상도 메모 사이의 구분으로 본다 ("용안육/베트남   산약70%")
  const seg = head.split(/[,()[\]{}/;:+|*\n·○]|\s{2,}/).pop() ?? "";
  let c = seg
    .replace(/^[\s\-–_.]+/, "")
    .replace(/\s*(함량|함유량|함유|기준|으로서|으로써)\s*$/, "")
    .replace(/\s+약\s*$/, "") // "산약"의 약은 남긴다
    .trim();
  // 앞쪽 메모가 길게 붙어 있으면 뒤에서부터 20자 안쪽의 낱말만 남긴다
  if (c.length > 20) {
    const words = c.split(/\s+/);
    let tail = words.pop() ?? "";
    while (words.length && `${words[words.length - 1]} ${tail}`.length <= 20) tail = `${words.pop()} ${tail}`;
    c = tail;
  }
  if (!c || !/[A-Za-z가-힣]/.test(c)) return null;
  return c;
}

function qualifierAfter(spec: string, end: number): { q: string | null; len: number } {
  const m = spec.slice(end).match(/^\s*(이상|이하|↑|↓)/);
  if (!m) return { q: null, len: 0 };
  const q = m[1] === "↑" ? "이상" : m[1] === "↓" ? "이하" : m[1];
  return { q, len: m[0].length };
}

export function extractContents(spec: string): Hit[] {
  const hits: Hit[] = [];
  const push = (m: RegExpExecArray, h: Omit<Hit, "index" | "length" | "text" | "qualifier">) => {
    const end = m.index + m[0].length;
    const { q, len } = qualifierAfter(spec, end);
    hits.push({ ...h, index: m.index, length: m[0].length + len, text: spec.slice(m.index, end + len).trim(), qualifier: q });
  };
  const each = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
    for (const m of spec.matchAll(re)) fn(m as RegExpExecArray);
  };

  // Brix — "BRIX 68", "Brix:25", "60brix", "20브릭스"
  each(new RegExp(String.raw`(?:brix|브릭스)\s*[:：]?\s*(\d+(?:\.\d+)?)` + RANGE, "gi"), (m) =>
    push(m, { component: null, amount: num(m[1]), amountMax: m[2] ? num(m[2]) : null, unit: "Brix" }));
  each(new RegExp(NUM + String.raw`\s*°?\s*(?:brix|브릭스)`, "gi"), (m) =>
    push(m, { component: null, amount: num(m[1]), amountMax: null, unit: "Brix" }));

  // 균수 — "2000억", "100억cfg/g", "1,000억 CFU/g" (억 CFU/g 로 통일)
  each(new RegExp(NUM + String.raw`\s*(억|조)(?!\s*원)(?:\s*\/?\s*(?:cfu|cfg)(?:\s*[\/.]\s*g)?)?(?:\s*\/\s*g)?`, "gi"), (m) =>
    push(m, { component: null, amount: num(m[1]) * (m[2] === "조" ? 10000 : 1), amountMax: null, unit: "억CFU/g" }));
  // "100B", "500B" — billion = 10억
  each(new RegExp(NUM + String.raw`\s*B(?![A-Za-z\d])`, "g"), (m) =>
    push(m, { component: null, amount: num(m[1]) * 10, amountMax: null, unit: "억CFU/g" }));
  // 억 표기 없이 "2000cfg/g" — 원문 숫자를 그대로 둔다
  each(new RegExp(NUM + String.raw`\s*(?:cfu|cfg)(?:\s*\/\s*g)?`, "gi"), (m) =>
    push(m, { component: null, amount: num(m[1]), amountMax: null, unit: "CFU/g" }));

  // 단위/g — "300mg/g", "4000만유닛/g", "187.5mg/g 이상"
  each(new RegExp(NUM + RANGE + String.raw`\s*(만\s*)?(mg|㎎|μg|ug|mcg|IU|U|유닛|unit|units)\s*\/\s*g(?![A-Za-z])`, "gi"), (m) => {
    const u = m[4].toLowerCase() === "㎎" ? "mg" : m[4];
    push(m, {
      component: componentBefore(spec, m.index),
      amount: num(m[1]),
      amountMax: m[2] ? num(m[2]) : null,
      unit: `${m[3] ? "만" : ""}${u}/g`,
    });
  });

  // % — "실리마린 50% 이상", "철분7.8~9%"
  each(new RegExp(NUM + RANGE + String.raw`\s*%`, "g"), (m) => {
    const before = spec.slice(Math.max(0, m.index - 8), m.index);
    const after = spec.slice(m.index + m[0].length, m.index + m[0].length + 6);
    if (NOT_CONTENT_BEFORE.test(before) || NOT_CONTENT_AFTER.test(after)) return;
    const amount = num(m[1]);
    if (amount <= 0 || amount > 100) return;
    push(m, {
      component: componentBefore(spec, m.index),
      amount,
      amountMax: m[2] ? num(m[2]) : null,
      unit: "%",
    });
  });

  // 겹치는 매치는 먼저 등록된(더 구체적인) 쪽을 남긴다
  const kept: Hit[] = [];
  for (const h of hits) {
    const overlaps = kept.some((k) => h.index < k.index + k.length && k.index < h.index + h.length);
    if (!overlaps) kept.push(h);
  }
  return kept.sort((a, b) => a.index - b.index);
}

export interface ContentFields {
  specification: string | null;
  status: string;
  component: string | null;
  amount: number | null;
  amountMax: number | null;
  unit: string | null;
  qualifier: string | null;
  matches: string | null;
}

/** 규격 한 건 → 함유량 칸들 */
export function readContent(specification: string | null | undefined): ContentFields {
  const spec = specification?.trim() || null;
  const empty = { component: null, amount: null, amountMax: null, unit: null, qualifier: null, matches: null };
  if (!spec) return { specification: spec, ...empty, status: "규격없음" };
  const hits = extractContents(spec);
  if (!hits.length) return { specification: spec, ...empty, status: "함량없음" };
  const [h] = hits;
  return {
    specification: spec,
    status: "추출",
    component: h.component,
    amount: h.amount,
    amountMax: h.amountMax,
    unit: h.unit,
    qualifier: h.qualifier,
    matches: hits.map((x) => x.text).join(" | "),
  };
}

/**
 * 원료를 저장할 때 함유량 행도 규격에 맞춰 다시 읽는다.
 * 사람이 손본 행(isManual)은 원료명·규격 사본만 맞추고 함량은 그대로 둔다.
 */
export async function syncMaterialContent(
  tx: Tx,
  material: { id: string; name: string; specification: string | null },
) {
  const existing = await tx.materialContent.findUnique({ where: { materialId: material.id } });
  if (existing?.isManual) {
    await tx.materialContent.update({
      where: { id: existing.id },
      data: { name: material.name, specification: material.specification?.trim() || null },
    });
    return;
  }
  const fields = readContent(material.specification);
  await tx.materialContent.upsert({
    where: { materialId: material.id },
    create: { sourceType: "material", materialId: material.id, name: material.name, ...fields },
    update: { name: material.name, ...fields },
  });
}
