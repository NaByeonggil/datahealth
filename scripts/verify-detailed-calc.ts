/**
 * 상세견적서 계산 검증 (골든 테스트)
 *
 * 원본 엑셀 `whang 상세견적.xlsx` 의 셀 값과 calculateDetailed.ts 의 결과가
 * 일치하는지 확인한다. 계산식을 건드리면 반드시 이 스크립트를 다시 돌릴 것.
 *   실행: npm run verify:calc
 */
import {
  calculateDetailedQuotation,
  recalcMaterialRow,
  calcUnitWeight,
  calcTotalWeight,
  calcTheoreticalQty,
} from "../src/lib/quotation/calculateDetailed";

let failed = 0;

function expect(label: string, actual: number, expected: number, tolerance = 0.01) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (!ok) failed++;
  const mark = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  const detail = ok ? "" : `  (기대: ${expected.toLocaleString()})`;
  console.log(`  ${mark} ${label.padEnd(34)} ${actual.toLocaleString()}${detail}`);
}

// ─── 엑셀 원본 입력값 (정제양식5 시트) ────────────────────────────────
const contentAmount = 12; // 내용량 F3
const packageUnit = 14; // 포장단위 H3
const productionQty = 60000; // 제조단위 A6
const caseQty = 4285; // 실제수량 F6

const totalWeight = calcTotalWeight(contentAmount, productionQty, 1.1);

const rawMaterials = [
  { materialName: "L-테아닌", contentMg: 200, unitPrice: 130000 },
  { materialName: "과라나추출물", contentMg: 340, unitPrice: 55000 },
  { materialName: "오렌지농축액", contentMg: 3000, unitPrice: 12000 },
  { materialName: "오렌지향", contentMg: 300, unitPrice: 27000 },
];
const materials = rawMaterials.map((m) =>
  recalcMaterialRow(m, { contentAmount, totalWeight })
);

const supplies = [
  { supplyName: "스틱필름", quantity: 4285, inputQty: 12, unitPrice: 270000 },
  { supplyName: "케이스(단상자)", quantity: 2000, inputQty: 4285, unitPrice: 250 },
  { supplyName: "카톤", quantity: 0, inputQty: 100, unitPrice: 2000 },
  { supplyName: "마감스티커", quantity: 4285, inputQty: 4285, unitPrice: 10 },
].map((s) => ({ ...s, totalPrice: s.inputQty * s.unitPrice }));

const processes = [
  { processName: "칭량/혼합/스틱충진/종합포장/검사", quantity: 4285, unitCost: 1500 },
].map((p) => ({ ...p, totalCost: p.quantity * p.unitCost }));

const overheads = [
  { name: "검사비", amount: 250000 },
  { name: "관리비", amount: 160000 },
  { name: "운반비", amount: 300000 },
];

const r = calculateDetailedQuotation({
  contentAmount,
  packageUnit,
  productionQty,
  lossRate: 1.1,
  yieldRate: 95,
  caseQty,
  profitRate: 5,
  vatRate: 10,
  finalUnitPrice: 4700, // 엑셀 G50 — 사람이 올려서 넣은 값
  materials,
  supplies,
  processes,
  overheads,
});

console.log("\n\x1b[1m상세견적서 계산 검증 — whang 상세견적.xlsx 대조\x1b[0m\n");

console.log("[제조 정보]");
expect("단위중량 CASE (B6)", calcUnitWeight(contentAmount, packageUnit), 168);
expect("총중량 kg (C6)", r.totalWeight, 792);
expect("이론수량 case", calcTheoreticalQty(productionQty, packageUnit), 4285);

console.log("\n[원료비 — 배합비/투입량 연쇄 계산]");
expect("L-테아닌 배합비 % (C9)", materials[0].mixRatio, 1.6667, 0.001);
expect("L-테아닌 투입량 kg (E9)", materials[0].inputKg, 13.2);
expect("L-테아닌 금액 (G9)", materials[0].totalPrice, 1716000);
expect("과라나 투입량 kg (E10)", materials[1].inputKg, 22.44);
expect("과라나 금액 (G10)", materials[1].totalPrice, 1234200);
expect("오렌지농축액 투입량 (E11)", materials[2].inputKg, 198);
expect("오렌지농축액 금액 (G11)", materials[2].totalPrice, 2376000);
expect("오렌지향 금액 (G12)", materials[3].totalPrice, 534600);
expect("원료비 합계 (G23)", r.materialCost, 5860800);

console.log("\n[섹션 소계]");
expect("자재비 소계 (G32)", r.supplyCost, 4554100);
expect("직접제조비 소계 (G40)", r.processCost, 6427500);
expect("간접제조비 소계 (C51)", r.overheadCost, 710000);

console.log("\n[1 case 당 환산]");
expect("원료비/case (G43)", r.materialPerCase, 1367.748);
expect("자재비/case (G44)", r.supplyPerCase, 1062.8005);
expect("직접제조비/case (G45)", r.processPerCase, 1500);
expect("간접제조비/case (G46)", r.overheadPerCase, 165.6943);

console.log("\n[종합원가]");
expect("소계 원가/case (G47)", r.costPerCase, 4096.2427);
expect("기업이윤 5% (G48)", r.profitPerCase, 204.8121);
expect("합계 별도/case (G49)", r.pricePerCaseExVat, 4301.0548);
expect("확정 납품단가 (G50)", r.finalUnitPrice, 4700);
expect("총납품 예상가 (G51)", r.totalAmount, 20139500);

console.log("\n[참고 — 시스템 제안값]");
console.log(`    VAT 포함 이론가 : ${r.pricePerCaseIncVat.toLocaleString()}원`);
console.log(`    100원 단위 올림 : ${r.suggestedUnitPrice.toLocaleString()}원  (실제 견적은 4,700원 적용)`);

if (failed > 0) {
  console.log(`\n\x1b[31m✗ ${failed}건 불일치\x1b[0m\n`);
  process.exit(1);
}
console.log("\n\x1b[32m✓ 전 항목 엑셀과 일치\x1b[0m\n");
