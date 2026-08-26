/**
 * 견적서 특기사항 조립
 *
 * 설정에 등록한 기본 문구를 견적서 조건에 맞춰 골라내고 치환한다.
 *
 * 적용 대상(appliesTo)
 *   ALL             항상
 *   HEALTH_FOOD     식품유형이 건강기능식품일 때만
 *                   (기준규격분석비·품목제조신고비·광고심의비는 건기식에만 발생)
 *   NON_HEALTH_FOOD 건강기능식품이 아닐 때만
 *
 * 치환어
 *   {동판비}  제품 중 스틱류가 하나라도 있으면 "스틱동판비, 박스동판비", 그 외에는 "박스동판비"
 *
 * 번호 문구 아래에는 원료 목록에서 뽑은 주원료·부원료 줄을 붙인다.
 * 붙인 뒤에는 그냥 텍스트라 견적서마다 자유롭게 고칠 수 있다.
 */
import { isStickForm } from "@/lib/quotation/packagingMethod";

export const HEALTH_FOOD = "건강기능식품";

/** 식품유형 선택지 */
export const FOOD_TYPES = [
  "건강기능식품",
  "기타가공품",
  "과채가공품",
  "고형차",
  "음료베이스",
  "식품첨가물",
  "기타",
] as const;

export const APPLIES_TO = {
  ALL: "항상",
  HEALTH_FOOD: "건강기능식품일 때만",
  NON_HEALTH_FOOD: "건강기능식품이 아닐 때만",
} as const;
export type AppliesTo = keyof typeof APPLIES_TO;

export interface NoteTemplateLike {
  content: string;
  appliesTo?: string | null;
  isActive?: boolean;
}

/** 원료 한 줄 — 특기사항의 주원료·부원료 표기에 쓴다 */
export interface NoteItemLike {
  materialName: string;
  theoryAmount?: number | null;
  /** 주원료 / 부원료 */
  role?: string | null;
}

export const ITEM_ROLES = ["주원료", "부원료"] as const;

/** 특기사항 조립에 필요한 제품 정보 */
export interface NoteProductLike {
  name?: string | null;
  /** 제형 코드 — 스틱류 판별용 */
  formCode?: string | null;
  /** 제품유형명 — formCode 가 비었을 때 보조 판별 */
  typeName?: string | null;
  items?: NoteItemLike[];
}

export interface NoteContext {
  /** 식품유형 (건강기능식품 / 기타가공품 …) */
  foodType?: string | null;
  products?: NoteProductLike[];
}

/** "글루타치온98% 200mg, 비타민C 100mg" 형태로 잇는다 */
function joinItems(items: NoteItemLike[]): string {
  return items
    .filter((it) => (it.materialName ?? "").trim())
    .map((it) => {
      const mg = Number(it.theoryAmount) || 0;
      return mg > 0 ? `${it.materialName} ${mg.toLocaleString("ko-KR")}mg` : it.materialName;
    })
    .join(", ");
}

/**
 * 제품별 원료 → "*주원료 : …" 줄.
 * 제품이 여러 개면 "*주원료(정제) : …" 처럼 제품명을 괄호로 붙인다.
 */
export function buildMaterialLines(products?: NoteProductLike[]): string[] {
  const list = products ?? [];
  const multi = list.length > 1;
  const out: string[] = [];
  for (const [i, pr] of list.entries()) {
    const tag = multi ? `(${(pr.name ?? "").trim() || `제품 ${i + 1}`})` : "";
    for (const role of ITEM_ROLES) {
      const text = joinItems((pr.items ?? []).filter((it) => (it.role || "주원료") === role));
      if (text) out.push(`*${role}${tag} : ${text}`);
    }
  }
  return out;
}

/** 조건에 맞는 문구인가 */
function matches(t: NoteTemplateLike, ctx: NoteContext): boolean {
  if (t.isActive === false) return false;
  const isHealth = (ctx.foodType ?? "") === HEALTH_FOOD;
  switch (t.appliesTo) {
    case "HEALTH_FOOD": return isHealth;
    case "NON_HEALTH_FOOD": return !isHealth;
    default: return true;
  }
}

/** 치환어 적용 — 스틱류 제품이 하나라도 있으면 스틱동판비를 함께 적는다 */
function resolve(content: string, ctx: NoteContext): string {
  const stick = (ctx.products ?? []).some((p) => isStickForm(p.formCode, p.typeName));
  return content.replace(/\{동판비\}/g, stick ? "스틱동판비, 박스동판비" : "박스동판비");
}

/** 조건에 맞는 문구만 골라 "1. …" 형태로 번호를 붙인다 */
export function buildQuotationNote(
  templates: NoteTemplateLike[],
  ctx: NoteContext
): string {
  const numbered = (templates ?? [])
    .filter((t) => matches(t, ctx))
    .map((t, i) => `${i + 1}. ${resolve(t.content, ctx)}`);
  return [...numbered, ...buildMaterialLines(ctx.products)].join("\n");
}
