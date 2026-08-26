/**
 * 제형별 포장방법 자동 표기
 *
 * 포장 형태가 둘로 갈린다.
 *   병 포장 (정제·캅셀류)   단상자*병*30정 / 30캡슐
 *   낱개 포장 (스틱·파우치)  단상자*30포
 *   바이알                 단상자*30병
 *
 * 제품유형 마스터에 formCode 가 비어 있는 항목(연질캅셀·파우치·젤리)이 있어
 * formCode → 제품유형명 → category 순으로 판정한다.
 */

/** 포장 형태 */
type Shape = {
  /** 병에 담고 다시 단상자에 넣는가 */
  bottled: boolean;
  /** 낱개 단위 명칭 */
  unit: string;
};

const BOTTLE_TABLET: Shape = { bottled: true, unit: "정" };
const BOTTLE_CAPSULE: Shape = { bottled: true, unit: "캡슐" };
const STICK: Shape = { bottled: false, unit: "포" };
const VIAL: Shape = { bottled: false, unit: "병" };

/** formCode 기준 */
const BY_FORM_CODE: Record<string, Shape> = {
  TABLET: BOTTLE_TABLET,
  AGARWOOD: BOTTLE_TABLET,
  HARD_CAPSULE: BOTTLE_CAPSULE,
  SOFTCAPSULE: BOTTLE_CAPSULE,
  V_SOFTCAPSULE: BOTTLE_CAPSULE,
  A_SOFTCAPSULE: BOTTLE_CAPSULE,
  POWDER_STICK: STICK,
  LIQUID_STICK: STICK,
  JELLY_STICK: STICK,
  PILL_STICK: STICK,
  MULTIPACK: STICK,
  POUCH: STICK,
  JELLY: STICK,
  LIQUID_POUCH_100: STICK,
  LIQUID_POUCH_250: STICK,
  VIAL,
};

/** formCode 가 비어 있는 제품유형을 이름으로 판정 */
const BY_NAME: { match: RegExp; shape: Shape }[] = [
  { match: /캅셀|캡슐/, shape: BOTTLE_CAPSULE },
  { match: /정제/, shape: BOTTLE_TABLET },
  { match: /바이알/, shape: VIAL },
  { match: /스틱|파우치|젤리|팩/, shape: STICK },
];

function resolveShape(formCode?: string | null, typeName?: string | null, category?: string | null): Shape {
  if (formCode && BY_FORM_CODE[formCode]) return BY_FORM_CODE[formCode];
  const name = (typeName ?? "").trim();
  if (name) {
    const hit = BY_NAME.find((r) => r.match.test(name));
    if (hit) return hit.shape;
  }
  // 최후 폴백 — 고형은 병 포장 정제, 그 외는 스틱으로 본다
  return category === "고형" ? BOTTLE_TABLET : STICK;
}

/**
 * 스틱류(스틱·파우치·젤리·멀티팩) 제형인가.
 * 스틱동판이 별도로 필요한지 판단할 때 쓴다.
 */
export function isStickForm(formCode?: string | null, typeName?: string | null): boolean {
  const s = resolveShape(formCode, typeName, null);
  return !s.bottled && s.unit === "포";
}

/** 포장단위 → "단상자*병*30정" / "단상자*30포" */
export function buildPackagingMethod(
  packageUnit: number,
  formCode?: string | null,
  typeName?: string | null,
  category?: string | null
): string {
  if (!packageUnit || packageUnit <= 0) return "";
  const s = resolveShape(formCode, typeName, category);
  return s.bottled
    ? `단상자*병*${packageUnit}${s.unit}`
    : `단상자*${packageUnit}${s.unit}`;
}

/**
 * 자동 생성된 값인지 판별.
 * 사용자가 직접 쓴 포장방법은 제품유형·포장단위를 바꿔도 덮어쓰지 않기 위해 쓴다.
 */
export function isAutoPackagingMethod(value: string): boolean {
  return /^단상자\*(병\*)?\d+(정|캡슐|포|병)$/.test(value.trim());
}
