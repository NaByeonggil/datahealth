/**
 * 건기식 공전(고시형) 원료 기준표 기본값 넣기
 *
 * 목록은 src/lib/materials/functionalStandards.ts 의 DEFAULT_STANDARDS.
 * 원료명이 이미 있는 행은 건드리지 않는다(화면에서 고친 키워드·번호 보존) — 없는 것만 추가.
 *
 * 사용법
 *   npx tsx scripts/seed-functional-standards.ts
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma-client";
import { DEFAULT_STANDARDS } from "../src/lib/materials/functionalStandards";

const prisma = createPrismaClient();

async function main() {
  const existing = await prisma.functionalStandard.findMany({ select: { name: true, code: true } });
  const names = new Set(existing.map((e) => e.name));
  const codes = new Set(existing.map((e) => e.code).filter(Boolean));
  const toAdd = DEFAULT_STANDARDS.filter((s) => !names.has(s.name) && !(s.code && codes.has(s.code)));
  if (toAdd.length) await prisma.functionalStandard.createMany({ data: toAdd });
  console.log(`기존 ${existing.length}건, 추가 ${toAdd.length}건`);
}

main().finally(() => prisma.$disconnect());
