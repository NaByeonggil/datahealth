/**
 * 공전 원료 기준표에 1일 섭취량 초안 채우기
 *
 * 값은 src/lib/materials/functionalDaily.ts 의 DRAFT_DAILY (공전 번호, 번호가 없으면 원료명으로 찾음).
 * 이미 1일 섭취량이 들어 있는 행은 건드리지 않는다 — 화면에서 고친 값 보존.
 * 채운 값은 dailyVerified = false (초안) 로 들어간다.
 *
 * 사용법
 *   npx tsx scripts/fill-functional-daily.ts
 */
import { PrismaClient } from "@prisma/client";
import { DRAFT_DAILY } from "../src/lib/materials/functionalDaily";

const prisma = new PrismaClient();

async function main() {
  const standards = await prisma.functionalStandard.findMany();
  let filled = 0;
  for (const s of standards) {
    if (s.dailyMin != null) continue;
    const d = (s.code && DRAFT_DAILY[s.code]) || DRAFT_DAILY[s.name];
    if (!d || d.min == null) continue;
    await prisma.functionalStandard.update({
      where: { id: s.id },
      data: {
        dailyMin: d.min, dailyMax: d.max ?? null, dailyUnit: d.unit,
        dailyBasis: d.basis ?? "성분", dailyVerified: false, dailyNote: d.note ?? null,
      },
    });
    filled++;
  }
  console.log(`공전 원료 ${standards.length}건 중 ${filled}건에 1일 섭취량 초안을 채웠습니다.`);
}

main().finally(() => prisma.$disconnect());
