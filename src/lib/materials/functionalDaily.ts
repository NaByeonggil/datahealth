/**
 * 건기식 공전 원료 1일 섭취량 기준 — 초안 값과 원료 투입량 계산
 *
 * DRAFT_DAILY 는 공전·영양성분 기준치를 바탕으로 적은 "초안"이다. 담당자가 공전 원문과
 * 대조해 확인(dailyVerified)하기 전까지 AI 견적은 "초안 기준"이라고 함께 적는다.
 * 영양성분 하한은 영양성분 기준치의 30%, 상한은 공전의 최대 섭취량이다.
 *
 * 계산 (dailyBasis = 성분, 기본):
 *   1일 원료량(g) = 기준량 ÷ 원료 1g 당 지표성분량
 *   총 투입량(kg) = 1일 원료량(g) × 1개 제품당 섭취일수 × 생산수량 ÷ 1000
 * dailyBasis = 원료 이면 기준량이 곧 원료 자체 중량이다 (함유량을 보지 않는다).
 */

export interface DailyDraft {
  min: number | null;
  max?: number | null;
  unit: string;
  basis?: "성분" | "원료";
  note?: string;
}

/** 공전 번호(없으면 원료명) → 초안 */
export const DRAFT_DAILY: Record<string, DailyDraft> = {
  // 영양성분 — 하한 = 영양성분 기준치 30%
  "1-1": { min: 210, max: 1000, unit: "μg RAE" },
  "1-2": { min: 0.42, max: 7, unit: "mg" },
  "1-3": { min: 3, max: 25, unit: "μg" },
  "1-4": { min: 3.3, max: 400, unit: "mg α-TE" },
  "1-5": { min: 21, max: 1000, unit: "μg" },
  "1-6": { min: 0.36, max: 100, unit: "mg" },
  "1-7": { min: 0.42, max: 40, unit: "mg" },
  "1-8": { min: 4.5, max: 23, unit: "mg NE", note: "상한은 니코틴산 기준 (니코틴산아미드는 상한이 다름)" },
  "1-9": { min: 1.5, max: 200, unit: "mg" },
  "1-10": { min: 0.45, max: 67, unit: "mg" },
  "1-11": { min: 120, max: 400, unit: "μg DFE" },
  "1-12": { min: 0.72, max: 2000, unit: "μg" },
  "1-13": { min: 9, max: 900, unit: "μg" },
  "1-14": { min: 30, max: 1000, unit: "mg" },
  "1-15": { min: 210, max: 800, unit: "mg" },
  "1-16": { min: 94.5, max: 250, unit: "mg" },
  "1-17": { min: 3.6, max: 15, unit: "mg" },
  "1-18": { min: 2.55, max: 12, unit: "mg" },
  "1-19": { min: 0.24, max: 7, unit: "mg" },
  "1-20": { min: 16.5, max: 135, unit: "μg" },
  "1-21": { min: 45, max: 150, unit: "μg" },
  "1-22": { min: 0.9, max: 3.5, unit: "mg" },
  "1-23": { min: 7.5, max: 230, unit: "μg" },
  "1-24": { min: 1050, max: null, unit: "mg", note: "상한 확인 필요" },
  "1-25": { min: 9, max: 90, unit: "μg" },
  "1-26": { min: 7.5, max: null, unit: "g" },
  "1-27": { min: 12, max: null, unit: "g", note: "하한 확인 필요" },
  // 기능성원료
  "2-1": { min: 3, max: 80, unit: "mg", note: "인삼은 Rg1+Rb1 합 기준일 수 있음 — 공전 확인" },
  "2-2": { min: 3, max: 80, unit: "mg" },
  "2-3": { min: 8, max: 150, unit: "mg" },
  "2-4": { min: 8, max: 150, unit: "mg" },
  "2-5": { min: 8, max: 150, unit: "mg" },
  "2-6": { min: 300, max: 1000, unit: "mg" },
  "2-7": { min: 20, max: 30, unit: "mg", note: "지표성분 무수바바로인" },
  "2-8": { min: 16, max: 17, unit: "mg" },
  "2-9": { min: 90, max: 100, unit: "mg" },
  "2-10": { min: 24, max: 27, unit: "mg" },
  "2-12": { min: 0.45, max: 1.3, unit: "mg" },
  "2-13": { min: 28, max: 36, unit: "mg" },
  "2-14": { min: 130, max: null, unit: "mg" },
  "2-16": { min: 500, max: 2000, unit: "mg" },
  "2-17": { min: 240, max: 300, unit: "mg", note: "기능성별 기준 확인 필요" },
  "2-20": { min: 800, max: 3000, unit: "mg" },
  "2-24": { min: 1.4, max: 4.2, unit: "g" },
  "2-25": { min: 750, max: 2800, unit: "mg" },
  "2-26": { min: 10, max: 20, unit: "mg" },
  "2-27": { min: 4, max: 12, unit: "mg", note: "눈 피로 4~12mg, 피부 6~12mg" },
  "2-28": { min: 320, max: null, unit: "mg", basis: "원료", note: "쏘팔메토 열매 추출물 중량 기준" },
  "2-29": { min: 300, max: null, unit: "mg" },
  "2-30": { min: 1.5, max: 2, unit: "g" },
  "2-31": { min: 0.5, max: 1, unit: "g" },
  "2-32": { min: 1.2, max: 1.5, unit: "g", basis: "원료", note: "뮤코다당·단백 중량 기준" },
  "2-44": { min: 5.5, max: null, unit: "g" },
  "2-47": { min: 100, max: 420, unit: "mg" },
  "2-49": { min: 1.2, max: 4.5, unit: "g" },
  "2-50": { min: 3, max: 8, unit: "g" },
  "2-51": { min: 1, max: 100, unit: "억CFU" },
  "2-52": { min: 4, max: 8, unit: "mg" },
  "2-53": { min: 15, max: null, unit: "g" },
  "2-54": { min: 200, max: 250, unit: "mg" },
  "2-55": { min: 1.5, max: 2, unit: "g" },
  "히알루론산": { min: 120, max: 240, unit: "mg" },
  "루테인지아잔틴복합추출물": { min: 10, max: 20, unit: "mg" },
};

// ── 단위 환산 ────────────────────────────────────────────────

/** 기준 단위 → [차원, 기본단위 배수]. 질량은 mg, 균수는 억CFU 로 맞춘다 */
function targetBase(unit: string): { dim: "mass" | "cfu"; factor: number } | null {
  const u = unit.replace(/\s+/g, "").toLowerCase();
  if (u.startsWith("억cfu")) return { dim: "cfu", factor: 1 };
  if (u.startsWith("cfu")) return { dim: "cfu", factor: 1e-8 };
  if (u.startsWith("μg") || u.startsWith("ug") || u.startsWith("mcg")) return { dim: "mass", factor: 0.001 };
  if (u.startsWith("mg")) return { dim: "mass", factor: 1 };
  if (u.startsWith("g")) return { dim: "mass", factor: 1000 };
  return null;
}

/** 함유량 단위 → 원료 1g 당 [차원, 기본단위 양] */
function contentPerGram(amount: number, unit: string): { dim: "mass" | "cfu"; perG: number } | null {
  const u = unit.replace(/\s+/g, "").toLowerCase();
  if (u === "%") return { dim: "mass", perG: amount * 10 };            // 1% = 10mg/g
  if (u === "mg/g") return { dim: "mass", perG: amount };
  if (u === "ug/g" || u === "μg/g") return { dim: "mass", perG: amount / 1000 };
  if (u === "억cfu/g") return { dim: "cfu", perG: amount };
  if (u === "cfu/g") return { dim: "cfu", perG: amount / 1e8 };
  return null; // Brix, IU/g, 유닛/g … 환산 불가
}

export interface StandardDaily {
  name: string; component: string | null; keywords: string;
  dailyMin: number | null; dailyMax: number | null; dailyUnit: string | null;
  dailyBasis: string | null; quoteMin: number | null; dailyVerified: boolean;
}
export interface ContentInfo {
  status: string; component: string | null; amount: number | null; unit: string | null; qualifier: string | null;
}

export interface DoseResult {
  ok: boolean;
  /** 1일 원료 필요량(g) */
  dailyMaterialG?: number;
  /** 총 필요 투입량(kg) — 섭취일수·생산수량이 있을 때 */
  requiredKg?: number;
  /** 상한을 넘지 않는 최대 투입량(kg) */
  maxKg?: number;
  warnings: string[];
  reason?: string;
}

// 공백·기호를 먼저 지우고 vitamin / vit(c, b12, d3 …) 를 "비타민"으로 맞춘다
const norm = (s: string) =>
  s.toLowerCase().replace(/[\s·・()[\]\-_,./+=&:]/g, "")
    .replace(/vitamin/g, "비타민").replace(/^vit(?=[a-z]\d{0,2}$)/, "비타민");
// 영문과 한글이 붙어 있으면("EPA와") 나눠서 단어로 본다
const tokens = (s: string) =>
  s.toLowerCase()
    .replace(/([a-z0-9])([가-힣])/g, "$1 $2").replace(/([가-힣])([a-z0-9])/g, "$1 $2")
    .split(/[\s·・()[\]\-_,./+=&:]+/).filter(Boolean);

/**
 * 지표성분 동의어 — 한 줄이 같은 성분. 규격의 영문·약어·다른 표기를 공전 성분명과 같게 본다.
 * 3글자 이하 영문(Fe, Zn, EPA …)은 다른 말 속에 섞여 잘못 걸리지 않도록 단어가 정확히 같을 때만 인정한다.
 */
export const COMPONENT_ALIASES: string[][] = [
  ["비타민c", "아스코브산", "ascorbicacid", "ascorbate"],
  ["칼슘", "ca", "calcium"],
  ["마그네슘", "mg", "magnesium"],
  ["철", "fe", "iron"],
  ["아연", "zn", "zinc"],
  ["구리", "cu", "copper"],
  ["셀레늄", "셀렌", "se", "selenium"],
  ["요오드", "iodine"],
  ["망간", "mn", "manganese"],
  ["크롬", "cr", "chromium"],
  ["몰리브덴", "mo", "molybdenum"],
  ["베타카로틴", "betacarotene", "β카로틴"],
  ["엽산", "folicacid", "folate"],
  ["비오틴", "biotin"],
  ["판토텐산", "pantothenicacid"],
  ["나이아신", "니아신", "niacin"],
  ["식이섬유", "dietaryfiber", "dietaryfibre", "fiber", "fibre"],
  ["단백질", "protein"],
  ["진세노사이드", "ginsenoside", "ginsenosides"],
  ["엽록소", "클로로필", "chlorophyll"],
  ["카테킨", "catechin", "catechins", "egcg"],
  ["무수바바로인", "바바로인", "알로인", "aloin", "barbaloin"],
  ["플라보노이드", "flavonoid", "flavonoids"],
  ["코엔자임q10", "coenzymeq10", "coq10", "유비퀴논", "ubiquinone", "ubidecarenone"],
  ["이소플라본", "isoflavone", "isoflavones"],
  ["폴리페놀", "polyphenol", "polyphenols"],
  ["코로솔산", "corosolicacid"],
  ["플라보놀배당체", "flavonolglycoside", "flavonolglycosides", "flavoneglycoside", "flavoneglycosides"],
  ["실리마린", "silymarin"],
  ["epa", "dha", "epadha", "omega3", "오메가3"],
  ["감마리놀렌산", "gla", "gammalinolenicacid", "γ리놀렌산"],
  ["스쿠알렌", "squalene"],
  ["식물스테롤", "phytosterol", "phytosterols", "plantsterol"],
  ["알콕시글리세롤", "alkoxyglycerol"],
  ["옥타코사놀", "octacosanol"],
  ["공액리놀레산", "cla", "conjugatedlinoleicacid"],
  ["hca", "hydroxycitricacid", "하이드록시시트르산", "수산화구연산"],
  ["루테인", "lutein"],
  ["지아잔틴", "제아잔틴", "zeaxanthin"],
  ["아스타잔틴", "아스타크산틴", "astaxanthin"],
  ["로르산", "lauricacid", "라우르산"],
  ["포스파티딜세린", "phosphatidylserine", "ps"],
  ["글루코사민", "glucosamine"],
  ["n아세틸글루코사민", "nacetylglucosamine", "nag"],
  ["뮤코다당", "mucopolysaccharide", "콘드로이친", "chondroitin"],
  ["다당체", "다당채", "polysaccharide", "polysaccharides"],
  ["베타글루칸", "betaglucan", "β글루칸"],
  ["키토산", "chitosan"],
  ["프락토올리고당", "fos", "fructooligosaccharide"],
  ["생균수", "cfu", "생균", "probiotics"],
  ["모나콜린k", "모나콜린", "monacolink", "monacolin"],
  ["테아닌", "theanine", "ltheanine"],
  ["msm", "엠에스엠", "methylsulfonylmethane", "식이유황"],
  ["히알루론산", "hyaluronicacid", "ha", "히알루론산나트륨", "sodiumhyaluronate"],
  ["안토시아노사이드", "anthocyanoside", "anthocyanosides", "안토시아닌", "anthocyanin"],
  ["포스콜린", "forskolin"],
  ["라피노스", "raffinose"],
];

/** 이 이름(정규화·단어)이 동의어 줄의 어느 말과 맞는가 */
function aliasHit(alias: string, normed: string, words: string[]): boolean {
  return alias.length <= 3 && /^[a-z0-9]+$/.test(alias) ? words.includes(alias) : normed.includes(alias);
}

/** 이름에 해당하는 동의어 줄들 */
function aliasGroups(name: string): string[][] {
  const n = norm(name);
  const w = tokens(name);
  return COMPONENT_ALIASES.filter((g) => g.some((a) => aliasHit(a, n, w)));
}

/** 함유량의 지표성분이 공전 성분과 같은 것인가. 모르면 null */
function sameComponent(std: StandardDaily, contentComponent: string | null): boolean | null {
  if (!contentComponent) return null;
  const c = norm(contentComponent);
  const cw = tokens(contentComponent);
  // 원료명(예: "홍삼 100%")은 배합 비율이지 지표성분 함량이 아니므로 기능(지표)성분명으로만 비교한다.
  // 영양성분처럼 성분명이 곧 원료명인 경우에만 매칭 키워드도 본다.
  const names = [std.component ?? std.name];
  if (!std.component || norm(std.component) === norm(std.name)) names.push(...std.keywords.split(","));
  // 성분명 일부만 적힌 경우(n.includes(c))는 짧은 영문을 빼고 인정한다 — "Rg3" 는 "Rg1·Rb1·Rg3 합"이 아니다
  const shortLatin = /^[a-z0-9]{1,3}$/.test(c);
  if (names.map(norm).some((n) => n && (c.includes(n) || (!shortLatin && n.includes(c))))) return true;
  // 동의어 (영문·약어·다른 표기)
  return aliasGroups(std.component ?? std.name).some((g) => g.some((a) => aliasHit(a, c, cw)));
}

export function calcDose(
  std: StandardDaily,
  content: ContentInfo | null,
  opts: { daysPerUnit?: number; productionQty?: number } = {},
): DoseResult {
  const warnings: string[] = [];
  const target = std.quoteMin ?? std.dailyMin;
  if (target == null || !std.dailyUnit) return { ok: false, warnings, reason: "이 공전 원료는 1일 섭취량 기준이 등록되어 있지 않습니다." };
  const tb = targetBase(std.dailyUnit);
  if (!tb) return { ok: false, warnings, reason: `기준 단위(${std.dailyUnit})를 계산할 수 없습니다.` };
  if (!std.dailyVerified) warnings.push("1일 섭취량 기준이 담당자 확인 전 초안입니다.");
  if (/\b(RAE|NE|DFE)\b|α-TE/i.test(std.dailyUnit)) {
    warnings.push(`기준 단위가 ${std.dailyUnit} 입니다. 원료 형태(에스테르·염 등)에 따라 환산계수가 달라 실제 필요량은 더 많을 수 있습니다.`);
  }

  let dailyMaterialG: number;
  if (std.dailyBasis === "원료") {
    if (tb.dim !== "mass") return { ok: false, warnings, reason: "원료 중량 기준인데 단위가 질량이 아닙니다." };
    dailyMaterialG = (target * tb.factor) / 1000;
  } else {
    if (!content || content.amount == null || !content.unit) {
      return { ok: false, warnings, reason: "원료의 함유량이 등록되어 있지 않아 필요 투입량을 계산할 수 없습니다. 함유량 탭에서 입력하거나 규격서를 확인하세요." };
    }
    const same = sameComponent(std, content.component);
    if (same === false) {
      return { ok: false, warnings, reason: `원료 함유량의 지표성분(${content.component})이 공전 기준 성분(${std.component ?? std.name})과 달라 계산할 수 없습니다.` };
    }
    if (same === null) warnings.push(`원료 규격에 지표성분명이 없어 함유량 ${content.amount}${content.unit} 를 ${std.component ?? std.name} 함량으로 가정했습니다.`);
    const cp = contentPerGram(content.amount, content.unit);
    if (!cp) return { ok: false, warnings, reason: `함유량 단위(${content.unit})는 공전 기준 단위로 환산할 수 없습니다.` };
    if (cp.dim !== tb.dim) return { ok: false, warnings, reason: `함유량 단위(${content.unit})와 기준 단위(${std.dailyUnit})의 종류가 다릅니다.` };
    if (cp.perG <= 0) return { ok: false, warnings, reason: "함유량이 0입니다." };
    if (content.qualifier === "이하") warnings.push("함유량이 '이하'로 적혀 있어 실제 함량이 더 낮을 수 있습니다.");
    dailyMaterialG = (target * tb.factor) / cp.perG;
    const max = std.dailyMax != null ? (std.dailyMax * tb.factor) / cp.perG : undefined;
    return withQty({ ok: true, dailyMaterialG, warnings }, max, opts);
  }
  const max = std.dailyMax != null ? (std.dailyMax * tb.factor) / 1000 : undefined;
  return withQty({ ok: true, dailyMaterialG, warnings }, max, opts);
}

function withQty(r: DoseResult, maxDailyG: number | undefined, opts: { daysPerUnit?: number; productionQty?: number }): DoseResult {
  const round = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
  r.dailyMaterialG = round(r.dailyMaterialG!);
  if (opts.daysPerUnit && opts.daysPerUnit > 0 && opts.productionQty && opts.productionQty > 0) {
    const mult = (opts.daysPerUnit * opts.productionQty) / 1000;
    r.requiredKg = round(r.dailyMaterialG * mult, 3);
    if (maxDailyG != null) r.maxKg = round(maxDailyG * mult, 3);
  }
  return r;
}

/** "3~80 mg" 같은 표시 */
export function formatDaily(s: Pick<StandardDaily, "dailyMin" | "dailyMax" | "dailyUnit" | "dailyBasis">): string | null {
  if (s.dailyMin == null || !s.dailyUnit) return null;
  const range = s.dailyMax != null ? `${s.dailyMin}~${s.dailyMax}` : `${s.dailyMin} 이상`;
  return `${range} ${s.dailyUnit}${s.dailyBasis === "원료" ? " (원료 중량)" : ""}`;
}
