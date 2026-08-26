/**
 * source21_data.xlsx → Material 마스터 임포트
 *
 * 파이프라인
 *   [1] 컬럼 밀림 복구  company 칸의 원산지/숫자를 origin/packing 으로 되돌림
 *   [2] 값 정규화        가격·원산지·공급사·포장단위·일자
 *   [3] 중복 판정        키 = 원료명 + 공급사 + 단가
 *   [4] 적재            Supplier / Material / MaterialPrice
 *   [5] 검수 리포트      import-reports/*.csv
 *
 * 사용법
 *   npx tsx scripts/import-source21.ts --dry-run          # 리포트만, DB 미변경
 *   npx tsx scripts/import-source21.ts                    # 실제 적재
 *   npx tsx scripts/import-source21.ts --file=<xlsx경로>
 */
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const SRC_FILE =
  argv.find((a) => a.startsWith("--file="))?.slice("--file=".length) ??
  "/Users/nabyeonggil/Desktop/source21_data.xlsx";
const REPORT_DIR = path.join(process.cwd(), "import-reports");

// ─────────────────────────────────────────────────────────────
// 사전 정의
// ─────────────────────────────────────────────────────────────

/** 원산지로 쓰이는 토큰 (company 칸 오염 판별 + origin 정규화에 공용) */
const COUNTRY_BASE = [
  "국산", "국내산", "한국", "중국", "미국", "인도", "일본", "독일", "프랑스",
  "스페인", "이탈리아", "이태리", "영국", "네덜란드", "네델란드", "덴마크",
  "폴란드", "캐나다", "호주", "뉴질랜드", "베트남", "인도네시아", "태국",
  "말레이시아", "필리핀", "대만", "칠레", "브라질", "페루", "이스라엘",
  "이란", "스위스", "오스트리아", "노르웨이", "스웨덴", "핀란드",
  "에스토니아", "러시아", "멕시코", "아르헨티나", "터키", "이집트",
  "벨기에", "체코", "헝가리", "아일랜드", "포르투갈", "그리스",
  "우크라이나", "우즈베키스탄", "싱가포르", "튀르키예", "스리랑카",
];
const COUNTRY_RE = new RegExp(`^(${COUNTRY_BASE.join("|")})(산|국내가공)?$`);

/** 원산지 표기 통일 (오타 교정 포함) */
const ORIGIN_CANON: Record<string, string> = {
  국내산: "국산", 한국: "국산",
  네델란드: "네덜란드",
  이태리: "이탈리아", 이테리: "이탈리아",
  중귝: "중국",
  우주베키스탄: "우즈베키스탄",
  수입산: "수입", 직수입: "수입",
  "중국베트남": "중국/베트남",
  "국산,중국": "국산/중국",
  "페루,멕시코,호주": "페루/멕시코/호주",
  국내: "국산", 말레지아: "말레이시아",
};

/** company 칸에 들어온 원산지 변형 — COUNTRY_RE 로 못 잡는 값 */
const ORIGIN_EXTRA = new Set([
  "수입", "수입산", "직수입", "중귝", "이테리", "우주베키스탄",
  "중국베트남", "국산,중국", "페루,멕시코,호주", "국내", "말레지아",
]);

/** company 칸에 들어온 규격/함량/기타 — 공급사가 아니므로 note 로 보냄 */
const SPEC_LIKE_RE =
  /%|브릭스|cell\/g|MOQ|^HCS-|^\d+(\.\d+)?kg$|^\d{4}-\d{2}-\d{2}$|당타입|리포조말|건식원료|^개별인정|국내특허|^혼합$|^글루텐|^원산지별/;

/** company 칸에 들어온 사람/무의미 값 */
const NON_SUPPLIER = new Set(["self", "미상", "인터넷", "최준호과장", "본인", "모름", "박대표"]);

/** 공급사 표기 통일 — 프로파일링에서 확인된 동일 업체 변형 */
const SUPPLIER_CANON: Record<string, string> = {
  해찬솔푸드: "해찬솔", 헤찬솔: "해찬솔",
  앤바이오텍: "엔바이오텍",
  올담: "올담식품",
  보타닉사: "보타닉", botanic: "보타닉",
  amber: "ambe", 암베: "ambe",
  arison: "arisun",
  svargro: "SvAgro", svagro: "SvAgro",
  선일에프엔씨: "선일에프앤씨",
  세일인터내쇼날: "세일인터내셔널",
  주영엔에스: "주영",
  엘본에이치엔비: "엘본에이치앤비",
  아리선: "arisun",
  현대: "현대바이오랜드",
};

/** 건기식 구분 → category / isFunctional */
const HEALTH_FOOD_MAP: Record<string, { category: string; functional: boolean }> = {
  건식: { category: "건기식", functional: true },
  건기식: { category: "건기식", functional: true },
  건강기능식품: { category: "건기식", functional: true },
  개별인정형: { category: "건기식", functional: true },
  개별인정: { category: "건기식", functional: true },
  개별인정형건기식: { category: "건기식", functional: true },
  개별인정현원료: { category: "건기식", functional: true },
  "건식(개별인정형": { category: "건기식", functional: true },
  건식일식: { category: "건기식", functional: true },
  일식: { category: "일반식품", functional: false },
  일신: { category: "일반식품", functional: false }, // 오타
};

// ─────────────────────────────────────────────────────────────
// 파서
// ─────────────────────────────────────────────────────────────

const s = (v: unknown) => String(v ?? "").trim();

/** "50,000" → 50000 / "협의"·"X"·"" → null (원문은 별도 보존) */
function parsePrice(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, "").replace(/원/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "25kg" → 25 / "20" → 20 / "건식"·"2023-03-03" → null */
function parsePacking(raw: string): number | null {
  if (!raw) return null;
  const m = raw.match(/^([\d.]+)\s*(kg|Kg|KG|G|g|L|l|ml)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function canonOrigin(raw: string): string | null {
  if (!raw) return null;
  const base = raw.replace(/산$/, "").trim();
  const hit = COUNTRY_BASE.includes(base) ? base : raw.trim();
  return ORIGIN_CANON[hit] ?? hit;
}

function canonSupplier(raw: string): string {
  const v = raw
    .replace(/^(\(주\)|㈜|\(유\)|주식회사)\s*/, "")
    .replace(/\s*(\(주\)|㈜|주식회사)$/, "")
    .trim();
  // 정확일치 → 소문자 일치 순으로 조회 (AMBE / Ambe / ambe 통합)
  if (SUPPLIER_CANON[v]) return SUPPLIER_CANON[v];
  const lower = v.toLowerCase();
  const hit = Object.keys(SUPPLIER_CANON).find((k) => k.toLowerCase() === lower);
  if (hit) return SUPPLIER_CANON[hit];
  // 영문 공급사는 소문자로 통일해 대소문자 변형 병합
  return /^[A-Za-z][A-Za-z\s.&-]*$/.test(v) ? lower : v;
}

/** "231102" / "20231102" → Date, 그 외 null */
function parseDating(raw: string): Date | null {
  if (!raw) return null;
  let v = raw.trim();
  if (/^\d{6}$/.test(v)) v = "20" + v;
  if (!/^\d{8}$/.test(v)) return null;
  const y = +v.slice(0, 4), mo = +v.slice(4, 6), d = +v.slice(6, 8);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// ─────────────────────────────────────────────────────────────
// CSV 유틸
// ─────────────────────────────────────────────────────────────
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const t = String(v ?? "");
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
function writeReport(name: string, rows: Record<string, unknown>[]) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const p = path.join(REPORT_DIR, name);
  fs.writeFileSync(p, "﻿" + toCsv(rows), "utf-8"); // BOM: 엑셀 한글 깨짐 방지
  console.log(`  · ${name.padEnd(28)} ${String(rows.length).padStart(5)}건`);
}

// ─────────────────────────────────────────────────────────────
type Raw = Record<string, unknown>;
interface Clean {
  excelId: string;
  code: string;
  name: string;
  specification: string | null;
  unitPrice: number;
  priceRaw: string;
  supplierName: string | null;
  origin: string | null;
  packingUnit: number | null;
  category: string;
  isFunctional: boolean;
  note: string | null;
  updatedBy: string | null;
  effectiveDate: Date | null;
  repairs: string[];
}

async function main() {
  console.log(`\n원본: ${SRC_FILE}`);
  if (DRY_RUN) console.log("모드: DRY-RUN (DB 미변경)\n");

  const wb = XLSX.readFile(SRC_FILE);
  const rows = XLSX.utils.sheet_to_json<Raw>(wb.Sheets[wb.SheetNames[0]], {
    defval: "",
    raw: false,
  });
  console.log(`읽음: ${rows.length}행\n`);

  const cleaned: Clean[] = [];
  const noPrice: Record<string, unknown>[] = [];
  const repairLog: Record<string, unknown>[] = [];

  for (const r of rows) {
    const excelId = s(r.id);
    const repairs: string[] = [];

    // ── [1] 컬럼 밀림 복구 ────────────────────────────────
    let company = s(r.company);
    let origin = s(r.origin);
    let packing = s(r.packing);
    let specNote = "";

    // 1-a. "중국(아리선)" 처럼 원산지+공급사가 한 칸에 붙은 케이스
    const mixed = company.match(/^(.+?)\((.+)\)$/);
    if (mixed && COUNTRY_RE.test(mixed[1].trim())) {
      if (!origin) origin = mixed[1].trim();
      company = mixed[2].trim();
      repairs.push(`company 분리("${s(r.company)}"→원산지 "${origin}" + 공급사 "${company}")`);
    }

    if (company && (COUNTRY_RE.test(company) || ORIGIN_EXTRA.has(company))) {
      // company 칸에 원산지가 들어간 케이스
      if (!origin) {
        origin = company;
        repairs.push(`company→origin("${company}")`);
      } else {
        repairs.push(`company의 원산지값 폐기("${company}", origin에 이미 "${origin}")`);
      }
      company = "";
    } else if (company && SPEC_LIKE_RE.test(company)) {
      // company 칸에 규격/함량이 들어간 케이스 → note 로 보존
      specNote = company;
      repairs.push(`company→비고(규격값 "${company}")`);
      company = "";
    } else if (company && NON_SUPPLIER.has(company)) {
      repairs.push(`company 무의미값 제거("${company}")`);
      company = "";
    } else if (company && /^\d+(\.\d+)?$/.test(company)) {
      // company 칸에 포장단위 숫자가 들어간 케이스
      if (!packing) {
        packing = company;
        repairs.push(`company→packing("${company}")`);
      } else {
        repairs.push(`company의 숫자값 폐기("${company}")`);
      }
      company = "";
    }

    // packing 칸의 원산지 오염
    if (packing && COUNTRY_RE.test(packing)) {
      if (!origin) {
        origin = packing;
        repairs.push(`packing→origin("${packing}")`);
      }
      packing = "";
    }

    // ── [2] 값 정규화 ───────────────────────────────────
    const name = s(r.rawData).replace(/\s{2,}/g, " ");
    const priceRaw = s(r.kgPrice);
    const unitPrice = parsePrice(priceRaw);
    const packingUnit = parsePacking(packing);
    const supplierName = company ? canonSupplier(company) : null;
    if (company && supplierName !== company) repairs.push(`공급사 통일("${company}"→"${supplierName}")`);

    // 건기식 구분
    const hf = s(r.healthFood);
    const hfHit = HEALTH_FOOD_MAP[hf];
    const category = hfHit?.category ?? "일반식품";
    const isFunctional = hfHit?.functional ?? false;

    // writer / dating 오염분은 note로 흘림
    const writer = s(r.writer);
    const isRealWriter = writer.length > 0 && writer.length <= 8;
    const dating = s(r.dating);
    const effectiveDate = parseDating(dating);

    const noteParts = [s(r.ref1), s(r.ref2), s(r.ref3)].filter(Boolean);
    if (specNote) noteParts.push(`규격원문: ${specNote}`);
    if (hf && !hfHit) noteParts.push(`구분원문: ${hf}`);
    if (writer && !isRealWriter) noteParts.push(`기록원문: ${writer}`);
    if (dating && !effectiveDate) noteParts.push(`일자원문: ${dating}`);
    if (packing && packingUnit === null) noteParts.push(`포장원문: ${packing}`);
    if (priceRaw && unitPrice === null) noteParts.push(`단가원문: ${priceRaw}`);

    const rec: Clean = {
      excelId,
      code: `SRC21-${excelId.padStart(4, "0")}`,
      name,
      specification: s(r.contents) || null,
      unitPrice: unitPrice ?? 0,
      priceRaw,
      supplierName,
      origin: canonOrigin(origin),
      packingUnit,
      category,
      isFunctional,
      note: noteParts.length ? noteParts.join(" / ") : null,
      updatedBy: isRealWriter ? writer : null,
      effectiveDate,
      repairs,
    };

    if (repairs.length) {
      repairLog.push({ excelId, 원료명: name, 복구내역: repairs.join(" / ") });
    }

    // 유효 단가 없는 행은 적재 제외 → 보류 CSV
    if (unitPrice === null) {
      noPrice.push({
        excelId, 원료명: name, 단가원문: priceRaw || "(빈값)",
        공급사: supplierName ?? "", 원산지: rec.origin ?? "", 규격: rec.specification ?? "",
      });
      continue;
    }
    cleaned.push(rec);
  }

  // ── [3] 중복 판정 ─────────────────────────────────────
  const seen = new Map<string, Clean>();
  const dupDropped: Record<string, unknown>[] = [];
  for (const c of cleaned) {
    const key = `${c.name}|${c.supplierName ?? ""}|${c.unitPrice}`;
    const prev = seen.get(key);
    if (prev) {
      dupDropped.push({
        제외된excelId: c.excelId, 유지된excelId: prev.excelId,
        원료명: c.name, 공급사: c.supplierName ?? "", 단가: c.unitPrice,
      });
      continue;
    }
    seen.set(key, c);
  }
  const final = [...seen.values()];

  // ── [5-a] 검수 리포트 ─────────────────────────────────
  // 동일 원료명인데 단가가 크게 벌어지는 그룹 (규격 상이 의심)
  const byName = new Map<string, Clean[]>();
  for (const c of final) {
    if (!byName.has(c.name)) byName.set(c.name, []);
    byName.get(c.name)!.push(c);
  }
  const priceOutliers: Record<string, unknown>[] = [];
  for (const [nm, group] of byName) {
    if (group.length < 2) continue;
    const ps = group.map((g) => g.unitPrice);
    const min = Math.min(...ps), max = Math.max(...ps);
    if (max / min < 3) continue; // 3배 미만은 정상 견적차로 간주
    priceOutliers.push({
      원료명: nm, 건수: group.length, 최저: min, 최고: max,
      배수: (max / min).toFixed(1),
      상세: group.map((g) => `${g.supplierName ?? "미지정"}:${g.unitPrice}`).join(" | "),
    });
  }
  priceOutliers.sort((a, b) => Number(b.배수) - Number(a.배수));

  console.log("── 리포트 ──────────────────────────────");
  writeReport("01_컬럼복구내역.csv", repairLog);
  writeReport("02_단가없음_보류.csv", noPrice);
  writeReport("03_완전중복_제외.csv", dupDropped);
  writeReport("04_단가편차_검수필요.csv", priceOutliers);
  writeReport(
    "05_적재대상.csv",
    final.map((c) => ({
      코드: c.code, 원료명: c.name, 공급사: c.supplierName ?? "(미지정)",
      단가: c.unitPrice, 원산지: c.origin ?? "", 포장단위: c.packingUnit ?? "",
      분류: c.category, 기능성: c.isFunctional ? "Y" : "N",
      규격: c.specification ?? "", 비고: c.note ?? "",
    }))
  );

  console.log("\n── 요약 ────────────────────────────────");
  console.log(`  원본                 ${rows.length}행`);
  console.log(`  - 유효단가 없음       -${noPrice.length}행`);
  console.log(`  - 완전중복           -${dupDropped.length}행`);
  console.log(`  = 적재대상           ${final.length}행`);
  console.log(`  고유 원료명           ${byName.size}개`);
  console.log(`  고유 공급사           ${new Set(final.map((c) => c.supplierName).filter(Boolean)).size}개`);
  console.log(`  컬럼복구 적용         ${repairLog.length}행`);
  console.log(`  단가편차 검수대상      ${priceOutliers.length}그룹`);

  if (DRY_RUN) {
    console.log(`\nDRY-RUN 종료. 리포트: ${REPORT_DIR}\n`);
    return;
  }

  // ── [4] 적재 ──────────────────────────────────────────
  console.log("\n── 적재 ────────────────────────────────");

  // 공급사
  const supplierIds = new Map<string, string>();
  const names = [...new Set(final.map((c) => c.supplierName).filter(Boolean))] as string[];
  let seq = 1;
  for (const nm of names) {
    let sup = await prisma.supplier.findFirst({ where: { name: nm } });
    if (!sup) {
      let code = "";
      do { code = `SRC${String(seq++).padStart(3, "0")}`; }
      while (await prisma.supplier.findUnique({ where: { code } }));
      sup = await prisma.supplier.create({
        data: { code, name: nm, category: "material", isActive: true },
      });
    }
    supplierIds.set(nm, sup.id);
  }
  // 공급사 미상 행을 위한 기본 공급사
  let fallback = await prisma.supplier.findUnique({ where: { code: "SRC21" } });
  if (!fallback) {
    fallback = await prisma.supplier.create({
      data: { code: "SRC21", name: "공급사 미상(source21)", category: "material", isActive: true },
    });
  }
  console.log(`  공급사 ${names.length}개 확보 (+ 미상 폴백 1)`);

  // 원료 + 단가이력
  let created = 0;
  for (const c of final) {
    const supplierId = c.supplierName ? supplierIds.get(c.supplierName)! : fallback.id;
    const mat = await prisma.material.create({
      data: {
        supplierId,
        code: c.code,
        name: c.name,
        category: c.category,
        origin: c.origin,
        specification: c.specification,
        unit: "kg",
        unitPrice: c.unitPrice,
        packingUnit: c.packingUnit,
        isFunctional: c.isFunctional,
        note: c.note,
        updatedBy: c.updatedBy ?? "source21 임포트",
        isActive: true,
      },
    });
    await prisma.materialPrice.create({
      data: {
        materialId: mat.id,
        price: c.unitPrice,
        effectiveDate: c.effectiveDate ?? new Date(),
        changedBy: c.updatedBy ?? "source21 임포트",
      },
    });
    created++;
    if (created % 200 === 0) console.log(`  ... ${created}/${final.length}`);
  }
  console.log(`  원료 ${created}건 적재 완료 (단가이력 동수)`);
  console.log(`\n리포트: ${REPORT_DIR}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
