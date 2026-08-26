/**
 * 단가가 있는 거래처 문서 → Material + MaterialPrice 적재 + 단가충돌 리포트
 *
 * 지금까지의 거래처 파일과 달리 이 둘은 실제 단가를 담은 1차 문서라
 * MaterialCatalog 가 아니라 Material 로 들어간다.
 *
 *   data/material-quotes/csf.json   씨에스에프.png                      17건 (견적서 2023-11-02)
 *   data/material-quotes/jeil.json  제일 취급품목리스트 및 가격(2401).pdf  39건 (판매가 원/kg)
 *
 * 기존 동명 원료는 수정하지 않고 별도 행으로 추가한다.
 * (동일 원료·공급사별 단가는 별도 행 — source21 임포트와 같은 방침)
 *
 * 사용법
 *   npx tsx scripts/import-material-quotes.ts --dry-run
 *   npx tsx scripts/import-material-quotes.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const SRC_DIR = path.join(process.cwd(), "data", "material-quotes");
const REPORT_DIR = path.join(process.cwd(), "import-reports");

interface Quote {
  supplierName: string;
  code: string;
  name: string;
  unitPrice: number;
  origin: string | null;
  specification: string | null;
  packingUnit: number | null;
  category: string;
  isFunctional: boolean;
  note: string | null;
  effectiveDate: Date;
  changedBy: string;
  sourceLabel: string;
}

const t = (v: unknown) => String(v ?? "").trim();
const nn = (v: string) => (v ? v : null);

/** "25kg" / "22.67kg" → 25 / 22.67 */
function parsePack(raw: string): number | null {
  const m = raw.match(/([\d.]+)\s*kg/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── 씨에스에프 견적서 ──────────────────────────────────────
function loadCsf(): Quote[] {
  const doc = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "csf.json"), "utf-8"));
  const eff = new Date(`${doc.발행일}T00:00:00Z`);
  const label = `씨에스에프 견적서(${doc.발행일})`;
  return doc.품목.map((r: Record<string, unknown>, i: number) => {
    const price = Number(r["견적가"]);
    const vat = Number(r["부가세"]);
    // 비고에 제조사·원산지가 섞여 있다. "중국산"/"국내제조" 같은 원산지 토큰만 분리한다.
    const bigo = t(r["비고"]);
    const parts = bigo.split("/").map((s) => s.trim()).filter(Boolean);
    const originTok = parts.find((s) => /산$|국내제조|국내산/.test(s)) ?? null;
    const makers = parts.filter((s) => s !== originTok);
    const notes = [
      makers.length ? `제조사 ${makers.join(", ")}` : "",
      doc.단가조건,
      `부가세 ${vat.toLocaleString("ko-KR")}원`,
      // 견적서 자체의 계산 불일치는 지우지 말고 남긴다
      Math.round(price * 0.1) !== vat
        ? `⚠ 부가세가 견적가의 10%(${(price * 0.1).toLocaleString("ko-KR")}원)와 불일치 — 원문 확인 필요`
        : "",
    ].filter(Boolean);
    return {
      supplierName: doc.공급사,
      code: `CSF-${String(i + 1).padStart(2, "0")}`,
      name: t(r["품목명"]),
      unitPrice: price,
      origin: originTok ? originTok.replace(/산$/, "").replace(/국내제조|국내산/, "국산") : null,
      specification: null,
      packingUnit: Number(r["팩킹"]) || null,
      category: "일반식품",
      isFunctional: false,
      note: notes.join(" / "),
      effectiveDate: eff,
      changedBy: label,
      sourceLabel: label,
    };
  });
}

// ── 제일 Product List/Price ───────────────────────────────
function loadJeil(): Quote[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "jeil.json"), "utf-8"));
  const eff = new Date("2024-01-01T00:00:00Z"); // 파일명 (2401)
  const label = "제일 Product List/Price(2401)";
  return raw.map((r: Record<string, unknown>, i: number) => {
    const sec = t(r["구분"]);
    const 고시형 = sec.includes("고시형");
    const notes = [
      t(r["특징"]),
      t(r["유통기간"]) ? `유통기간 ${t(r["유통기간"])}` : "",
      `${sec} No.${t(r["번호"])}`,
      r["미확인글자"] ? "⚠ PDF 폰트 미매핑으로 일부 글자 미확인 — 원문 확인 필요" : "",
    ].filter(Boolean);
    return {
      supplierName: "제일",
      code: `CHEIL-${String(i + 1).padStart(2, "0")}`,
      name: t(r["품목명"]),
      unitPrice: Number(r["판매가"]),
      origin: nn(t(r["원산지"])),
      specification: nn(t(r["규격"])),
      packingUnit: parsePack(t(r["포장단위"])),
      category: 고시형 ? "건기식" : "일반식품",
      isFunctional: 고시형,
      note: notes.join(" / "),
      effectiveDate: eff,
      changedBy: label,
      sourceLabel: label,
    };
  });
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
function writeReport(name: string, rows: Record<string, unknown>[]) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, name), "﻿" + toCsv(rows), "utf-8");
  console.log(`  · ${name.padEnd(30)} ${String(rows.length).padStart(4)}건`);
}

/** 괄호·규격·슬래시 뒤를 떼고 비교용 키를 만든다 */
const matchKey = (n: string) =>
  n.replace(/\([^)]*\)/g, "").replace(/\/.*$/, "")
   .replace(/\d+(\.\d+)?\s*%/gi, "").replace(/\s+/g, "").trim();

async function main() {
  const quotes = [...loadCsf(), ...loadJeil()];
  console.log(`\n단가 문서 로드: ${quotes.length}건`);
  const bySup: Record<string, number> = {};
  quotes.forEach((q) => (bySup[q.supplierName] = (bySup[q.supplierName] || 0) + 1));
  console.log(`  ${Object.entries(bySup).map(([k, v]) => `${k} ${v}`).join(" / ")}`);
  if (DRY_RUN) console.log("모드: DRY-RUN (DB 미변경)");

  // ── 단가충돌 리포트 ─────────────────────────────────
  const mats = await prisma.material.findMany({
    select: { name: true, unitPrice: true, origin: true, supplier: { select: { name: true } } },
  });
  const conflicts: Record<string, unknown>[] = [];
  for (const q of quotes) {
    const k = matchKey(q.name);
    if (k.length < 2) continue;
    for (const m of mats.filter((m) => matchKey(m.name) === k)) {
      const diff = (q.unitPrice - m.unitPrice) / m.unitPrice;
      conflicts.push({
        신규공급사: q.supplierName, 신규품목: q.name, 신규단가: q.unitPrice,
        신규원산지: q.origin ?? "", 출처: q.sourceLabel,
        기존원료: m.name, 기존공급사: m.supplier.name, 기존단가: m.unitPrice,
        기존원산지: m.origin ?? "",
        괴리율: `${(diff * 100).toFixed(1)}%`,
        절대괴리: Math.abs(diff),
      });
    }
  }
  conflicts.sort((a, b) => Number(b.절대괴리) - Number(a.절대괴리));
  conflicts.forEach((c) => delete c.절대괴리);

  console.log("\n── 리포트 ──────────────────────────────");
  writeReport("09_단가충돌_검수.csv", conflicts);
  const matched = new Set(conflicts.map((c) => c.신규품목)).size;
  console.log(`\n  기존 원료와 동명 매칭: ${matched}건 / 신규: ${quotes.length - matched}건`);
  console.log(`  충돌 조합: ${conflicts.length}건`);

  if (DRY_RUN) { console.log(`\nDRY-RUN 종료. 리포트: ${REPORT_DIR}\n`); return; }

  // ── 적재 ────────────────────────────────────────────
  console.log("\n── 적재 ────────────────────────────────");
  const supIds = new Map<string, string>();
  for (const nm of [...new Set(quotes.map((q) => q.supplierName))]) {
    let sup = await prisma.supplier.findFirst({ where: { name: nm } });
    if (!sup) {
      let seq = 1, code = "";
      do { code = `QT${String(seq++).padStart(3, "0")}`; }
      while (await prisma.supplier.findUnique({ where: { code } }));
      sup = await prisma.supplier.create({ data: { code, name: nm, category: "material", isActive: true } });
      console.log(`  공급사 신규 생성: ${nm} (${code})`);
    } else console.log(`  공급사 기존 재사용: ${nm} (${sup.code})`);
    supIds.set(nm, sup.id);
  }

  // code 로 멱등 처리 — 재실행 시 기존 행을 갱신한다
  let created = 0, updated = 0;
  for (const q of quotes) {
    const supplierId = supIds.get(q.supplierName)!;
    const data = {
      supplierId, name: q.name, category: q.category, origin: q.origin,
      specification: q.specification, unit: "kg", unitPrice: q.unitPrice,
      packingUnit: q.packingUnit, isFunctional: q.isFunctional,
      note: q.note, updatedBy: q.changedBy, isActive: true,
    };
    const prev = await prisma.material.findUnique({ where: { code: q.code } });
    const mat = prev
      ? (updated++, await prisma.material.update({ where: { code: q.code }, data }))
      : (created++, await prisma.material.create({ data: { ...data, code: q.code } }));

    // 같은 문서로 이미 넣은 단가이력이 있으면 중복 생성하지 않는다
    const dupPrice = await prisma.materialPrice.findFirst({
      where: { materialId: mat.id, effectiveDate: q.effectiveDate, changedBy: q.changedBy },
    });
    if (!dupPrice) {
      await prisma.materialPrice.create({
        data: { materialId: mat.id, price: q.unitPrice, effectiveDate: q.effectiveDate, changedBy: q.changedBy },
      });
    }
  }
  console.log(`  원료 신규 ${created}건 / 갱신 ${updated}건 (단가이력 포함)`);
  console.log(`\n리포트: ${REPORT_DIR}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
