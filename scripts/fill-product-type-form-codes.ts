/**
 * 제품유형 마스터의 빈 formCode 채우기 (1회성)
 *
 * 견적서 포장방법 자동 표기(packagingMethod.ts)가 formCode 로 제형을 판정한다.
 * 비어 있으면 제품유형명으로 추정해야 해서 코드를 명시적으로 채운다.
 * 기존 체계를 따랐다: 세부형이 있는 제형은 상위 개념을 일반형 코드로 쓴다.
 *   V_SOFTCAPSULE / A_SOFTCAPSULE → 일반 연질캅셀은 SOFTCAPSULE
 *   LIQUID_POUCH_100 / _250      → 일반 파우치는 POUCH
 *   JELLY_STICK                  → 일반 젤리는 JELLY
 *
 * 이미 값이 있으면 건드리지 않으므로 여러 번 실행해도 안전하다.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/** code → 채울 값. category 는 확실한 것만 채운다 */
const FILL: Record<string, { formCode: string; category?: string }> = {
  PT003: { formCode: "SOFTCAPSULE", category: "고형" }, // 연질캅셀
  PT006: { formCode: "POUCH" },                          // 파우치 — category 는 확인 필요
  PT007: { formCode: "JELLY", category: "젤리" },        // 젤리
};

async function main() {
  for (const [code, v] of Object.entries(FILL)) {
    const pt = await prisma.productType.findUnique({ where: { code } });
    if (!pt) { console.log(`  ${code} 없음 — 건너뜀`); continue; }

    const data: { formCode?: string; category?: string } = {};
    if (!pt.formCode) data.formCode = v.formCode;
    if (!pt.category && v.category) data.category = v.category;

    if (Object.keys(data).length === 0) {
      console.log(`  ${code} ${pt.name} — 이미 채워져 있음 (formCode=${pt.formCode}, category=${pt.category})`);
      continue;
    }
    const saved = await prisma.productType.update({ where: { code }, data });
    console.log(`  ${code} ${saved.name} → formCode=${saved.formCode} category=${saved.category ?? "(비어있음)"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
