/**
 * 문의 견적 초안의 기본 조건
 *
 * 고객이 따로 적지 않은 항목은 아래 기준으로 초안을 잡는다.
 *   포장단위   30정 / 30포 (캡슐도 30정)
 *   수량       1,000개 이하(미기재 포함)는 최소 주문수량(MOQ) 1,000개
 *   인증 여부  추후 결정
 *   포장 디자인·부자재 사양은 항상 별도
 */
import type { ExtractedInquiryData } from "@/types/ai";
import { packageCountUnit } from "@/lib/quotation/packagingMethod";
import { toNumber } from "./functions/args";

export const DEFAULT_PACKAGE_UNIT = 30;
export const MIN_ORDER_QTY = 1000;
export const CERTIFICATION_TBD = "추후 결정";
export const PACKAGING_SEPARATE_NOTE = "포장 디자인 및 부자재 사양은 별도";

/** 모델이 "언급 없음"을 뜻하며 채워 넣는 값들 */
const UNSPECIFIED = /^(null|none|n\/a|없음|미정|미지정|미기재|해당\s*없음|언급\s*없음|-)?$/i;

/** 기본 조건으로 정해지므로 고객에게 다시 묻지 않는 항목 */
const COVERED_BY_DEFAULTS = /포장|수량|MOQ|인증|디자인|부자재|패키지/i;

/** 추출 결과에 기본 조건을 입힌다. 이미 입힌 값에 다시 돌려도 결과가 같다. */
export function applyQuoteDefaults(data: ExtractedInquiryData): ExtractedInquiryData {
  const prev = data.quoteBasis;

  const givenUnit = prev?.packageUnitAssumed ? 0 : toNumber(data.packageUnit);
  const packageUnitAssumed = givenUnit <= 0;
  const packageUnit = packageUnitAssumed ? DEFAULT_PACKAGE_UNIT : givenUnit;

  const productType = (data.productType ?? "").trim();
  // 캡슐도 견적 기준에서는 "정"으로 센다
  const countUnit = packageCountUnit(null, productType).replace("캡슐", "정");
  const packageUnitLabel = productType
    ? `${packageUnit}${countUnit}`
    : `${packageUnit}정(또는 ${packageUnit}포)`;

  const requestedQty = prev ? prev.requestedQty : toNumber(data.productionQty) || undefined;
  const moqApplied = !requestedQty || requestedQty <= MIN_ORDER_QTY;
  const productionQty = moqApplied ? MIN_ORDER_QTY : requestedQty;

  const givenCert = String(data.certification ?? "").trim();
  const certification = UNSPECIFIED.test(givenCert) ? CERTIFICATION_TBD : givenCert;

  return {
    ...data,
    packageUnit,
    productionQty,
    certification,
    missingInfo: (data.missingInfo ?? []).filter((m) => !COVERED_BY_DEFAULTS.test(String(m))),
    quoteBasis: { packageUnitLabel, packageUnitAssumed, requestedQty, moqApplied, packagingNote: PACKAGING_SEPARATE_NOTE },
  };
}

/** 견적 기준을 사람이 읽는 줄로 — 답변 초안, 견적서 특기사항, 문의 화면이 같이 쓴다 */
export function quoteBasisLines(data: ExtractedInquiryData): string[] {
  const d = data.quoteBasis ? data : applyQuoteDefaults(data);
  const b = d.quoteBasis!;
  const qty = (d.productionQty ?? MIN_ORDER_QTY).toLocaleString("ko-KR");
  const qtyNote = !b.moqApplied
    ? ""
    : b.requestedQty && b.requestedQty < MIN_ORDER_QTY
      ? ` (최소 주문수량 MOQ 적용 — 문의 수량 ${b.requestedQty.toLocaleString("ko-KR")}개)`
      : " (최소 주문수량 MOQ)";
  return [
    `포장단위: ${b.packageUnitLabel}${b.packageUnitAssumed ? " (기본 포장단위)" : ""}`,
    `견적 수량: ${qty}개${qtyNote}`,
    `${b.packagingNote}`,
    `인증 여부: ${d.certification ?? CERTIFICATION_TBD}`,
  ];
}
