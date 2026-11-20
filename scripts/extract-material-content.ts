/**
 * 원료 규격(자유 텍스트) → MaterialContent 함유량 테이블 일괄 재생성
 *
 * 추출 규칙은 src/lib/materials/content.ts 에 있다(원료 저장 API 와 같은 규칙).
 * 원료·카탈로그 한 건당 한 행. 화면에서 손본 행(isManual)은 그대로 두고
 * 나머지만 지우고 다시 채운다(멱등).
 *
 * 사용법
 *   npx tsx scripts/extract-material-content.ts --dry-run
 *   npx tsx scripts/extract-material-content.ts
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma-client";
import * as fs from "fs";
import * as path from "path";
import { readContent, type ContentFields } from "../src/lib/materials/content";

const prisma = createPrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const REPORT_DIR = path.join(process.cwd(), "import-reports");

type Row = ContentFields & {
  sourceType: "material" | "catalog";
  materialId: string | null;
  catalogId: string | null;
  name: string;
};

function toRow(
  src: { sourceType: "material" | "catalog"; id: string; name: string; specification: string | null },
): Row {
  return {
    sourceType: src.sourceType,
    materialId: src.sourceType === "material" ? src.id : null,
    catalogId: src.sourceType === "catalog" ? src.id : null,
    name: src.name,
    ...readContent(src.specification),
  };
}

// ── 리포트 ────────────────────────────────────────────────
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

const fmtAmount = (r: Row) =>
  r.amount == null
    ? "없음"
    : `${r.amount}${r.amountMax != null ? `~${r.amountMax}` : ""}${r.unit === "Brix" ? " Brix" : r.unit}${r.qualifier ? ` ${r.qualifier}` : ""}`;

async function main() {
  const [materials, catalogs] = await Promise.all([
    prisma.material.findMany({ select: { id: true, name: true, specification: true }, orderBy: { name: "asc" } }),
    prisma.materialCatalog.findMany({ select: { id: true, name: true, specification: true }, orderBy: { name: "asc" } }),
  ]);
  const manual = await prisma.materialContent.findMany({
    where: { isManual: true },
    select: { materialId: true, catalogId: true },
  });
  const keep = new Set(manual.flatMap((m) => [m.materialId, m.catalogId]).filter(Boolean));
  const rows = [
    ...materials.map((m) => toRow({ sourceType: "material", ...m })),
    ...catalogs.map((c) => toRow({ sourceType: "catalog", ...c })),
  ].filter((r) => !keep.has(r.materialId ?? r.catalogId));
  if (keep.size) console.log(`\n직접 수정한 ${keep.size}건은 건드리지 않습니다.`);

  const count = (t: string, s: string) => rows.filter((r) => r.sourceType === t && r.status === s).length;
  console.log("\n함유량 추출 결과");
  for (const t of ["material", "catalog"] as const) {
    console.log(
      `  ${t.padEnd(9)} 추출 ${String(count(t, "추출")).padStart(5)}  함량없음 ${String(count(t, "함량없음")).padStart(5)}  규격없음 ${String(count(t, "규격없음")).padStart(5)}`,
    );
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportName = "10_원료함유량.csv";
  fs.writeFileSync(
    path.join(REPORT_DIR, reportName),
    "﻿" +
      toCsv(
        rows.map((r) => ({
          구분: r.sourceType === "material" ? "원료" : "카탈로그",
          원료명: r.name,
          규격원문: r.specification ?? "",
          상태: r.status,
          지표성분: r.component ?? "",
          함유량: fmtAmount(r),
          값: r.amount ?? "",
          상한: r.amountMax ?? "",
          단위: r.unit ?? "",
          조건: r.qualifier ?? "",
          찾은표현: r.matches ?? "",
        })),
      ),
    "utf-8",
  );
  console.log(`  리포트: ${path.join(REPORT_DIR, reportName)}`);

  if (DRY_RUN) {
    console.log("\nDRY-RUN 종료.\n");
    return;
  }
  await prisma.$transaction([
    prisma.materialContent.deleteMany({ where: { isManual: false } }),
    prisma.materialContent.createMany({ data: rows }),
  ]);
  console.log(`\nMaterialContent ${rows.length}건 적재\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
