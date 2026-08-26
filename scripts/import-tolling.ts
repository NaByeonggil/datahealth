/**
 * 임가공비 자료 전용 임포터
 *
 * SynologyDrive `5임가공비` 폴더의 비정형 엑셀/텍스트를 읽어
 * TollingRate(임가공 단가) / TollingExtra(추가 공정비) / Supply(자재) / ProductType(제형) 으로 적재한다.
 * 파일마다 서식이 완전히 달라 범용 임포트(/import)로는 처리할 수 없어 전용 파서로 작성했다.
 *
 *   실행: npm run import:tolling [-- <폴더경로>]
 *
 * 같은 파일을 다시 실행하면 해당 sourceFile 로 적재된 행을 지우고 다시 넣는다(멱등).
 */
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const DIR =
  process.argv[2] ||
  process.env.TOLLING_DIR ||
  "/Users/nabyeonggil/Library/CloudStorage/SynologyDrive-1/5임가공비";

type Row = (string | number)[];

const report: { file: string; rates: number; extras: number; supplies: number; sets: number; skipped: string[] }[] = [];
let current = { file: "", rates: 0, extras: 0, supplies: 0, sets: 0, skipped: [] as string[] };

const startFile = (file: string) => {
  current = { file, rates: 0, extras: 0, supplies: 0, sets: 0, skipped: [] };
  report.push(current);
};

/** 숫자만 뽑아낸다. "6만기준" → 6, "132원/포" → 132 */
const num = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (v == null) return 0;
  const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

const text = (v: unknown): string => (v == null ? "" : String(v).trim());

/** 엑셀 날짜 시리얼 → Date */
const excelDate = (v: unknown): Date | null => {
  const n = typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n < 20000 || n > 60000) return null;
  return new Date(Date.UTC(1899, 11, 30 + n));
};

const readRows = (file: string, sheet?: string): Row[] => {
  const wb = XLSX.readFile(path.join(DIR, file));
  const ws = wb.Sheets[sheet || wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: "" });
};

/** 파일 단위 재적재 */
async function resetSource(file: string) {
  await prisma.tollingRate.deleteMany({ where: { sourceFile: file } });
  await prisma.tollingExtra.deleteMany({ where: { sourceFile: file } });
  await prisma.supply.deleteMany({ where: { sourceFile: file } });
  await prisma.packagingSet.deleteMany({ where: { sourceFile: file } });
}

const vendorCache = new Map<string, string>();
async function vendorId(name: string, category: "tolling" | "packaging"): Promise<string> {
  if (vendorCache.has(name)) return vendorCache.get(name)!;
  const found = await prisma.supplier.findFirst({ where: { name } });
  if (found) {
    vendorCache.set(name, found.id);
    return found.id;
  }
  const count = await prisma.supplier.count();
  const created = await prisma.supplier.create({
    data: { code: `VD${String(count + 1).padStart(3, "0")}`, name, category },
  });
  vendorCache.set(name, created.id);
  return created.id;
}

/** 제형 마스터 upsert — 이름이 같으면 기존 행에 코드/MOQ 만 채운다 */
async function upsertProductType(opts: {
  name: string;
  formCode: string;
  category: string;
  defaultMoq?: number;
  processingCost?: number;
}) {
  const found = await prisma.productType.findFirst({ where: { name: opts.name } });
  if (found) {
    return prisma.productType.update({
      where: { id: found.id },
      data: {
        formCode: opts.formCode,
        category: opts.category,
        defaultMoq: opts.defaultMoq || found.defaultMoq,
        processingCost: opts.processingCost ?? found.processingCost,
      },
    });
  }
  const count = await prisma.productType.count();
  return prisma.productType.create({
    data: {
      code: `PT${String(101 + count).padStart(3, "0")}`,
      name: opts.name,
      formCode: opts.formCode,
      category: opts.category,
      defaultMoq: opts.defaultMoq ?? null,
      processingCost: opts.processingCost ?? 0,
      sortOrder: 100 + count,
    },
  });
}

type RateInput = {
  vendorName: string;
  vendorCategory?: "tolling" | "packaging";
  formName: string;
  formCode?: string;
  specLabel?: string;
  specMin?: number;
  specMax?: number;
  specUnit?: string;
  qtyMin?: number;
  qtyMax?: number | null;
  unitCost: number;
  costBasis?: string;
  supplyMode?: string;
  vendorPrice?: number;
  ownMargin?: number;
  includesProfit?: boolean;
  isNegotiable?: boolean;
  effectiveDate: Date;
  isCurrent?: boolean;
  note?: string;
};

async function addRate(r: RateInput) {
  await prisma.tollingRate.create({
    data: {
      vendorId: await vendorId(r.vendorName, r.vendorCategory || "tolling"),
      vendorName: r.vendorName,
      formName: r.formName,
      formCode: r.formCode || null,
      productTypeId: (await prisma.productType.findFirst({ where: { name: r.formName } }))?.id || null,
      specLabel: r.specLabel || null,
      specMin: r.specMin ?? null,
      specMax: r.specMax ?? null,
      specUnit: r.specUnit || null,
      qtyMin: r.qtyMin ?? 0,
      qtyMax: r.qtyMax ?? null,
      unitCost: r.unitCost,
      costBasis: r.costBasis || "per_unit",
      supplyMode: r.supplyMode || "bulk",
      vendorPrice: r.vendorPrice ?? null,
      ownMargin: r.ownMargin ?? null,
      includesProfit: !!r.includesProfit,
      isNegotiable: !!r.isNegotiable,
      effectiveDate: r.effectiveDate,
      isCurrent: r.isCurrent ?? true,
      sourceFile: current.file,
      note: r.note || null,
    },
  });
  current.rates++;
}

/** 같은 파일 안에서 완전히 같은 항목이 두 번 들어오는 것을 막는다 (예: 융복합 30ml 벌크/완포장 두 블록의 정제포장비) */
const extraKeys = new Set<string>();

async function addExtra(e: {
  name: string;
  vendorName?: string;
  formName?: string;
  calcType?: string;
  amount: number;
  percentBase?: string;
  condition?: string;
  effectiveDate: Date;
  note?: string;
}) {
  const key = [current.file, e.name, e.vendorName, e.formName, e.calcType, e.amount].join("|");
  if (extraKeys.has(key)) return;
  extraKeys.add(key);

  await prisma.tollingExtra.create({
    data: {
      name: e.name,
      vendorName: e.vendorName || null,
      vendorId: e.vendorName ? await vendorId(e.vendorName, "tolling") : null,
      formName: e.formName || null,
      calcType: e.calcType || "per_unit",
      amount: e.amount,
      percentBase: e.percentBase || null,
      condition: e.condition || null,
      effectiveDate: e.effectiveDate,
      sourceFile: current.file,
      note: e.note || null,
    },
  });
  current.extras++;
}

async function addSupply(s: {
  code: string;
  name: string;
  unitPrice: number;
  specification?: string;
  supplierName?: string;
  capacity?: number;
  capacityUnit?: string;
  color?: string;
  printed?: string;
  origin?: string;
  vialType?: string;
  boxQty?: number;
  moq?: number;
  effectiveDate: Date;
  note?: string;
}) {
  const data = {
    name: s.name,
    unitPrice: s.unitPrice,
    specification: s.specification || null,
    supplierId: s.supplierName ? await vendorId(s.supplierName, "packaging") : null,
    capacity: s.capacity ?? null,
    capacityUnit: s.capacityUnit || null,
    color: s.color || null,
    printed: s.printed || null,
    origin: s.origin || null,
    vialType: s.vialType || null,
    boxQty: s.boxQty ?? null,
    moq: s.moq ?? null,
    effectiveDate: s.effectiveDate,
    sourceFile: current.file,
    note: s.note || null,
  };
  await prisma.supply.upsert({
    where: { code: s.code },
    create: { code: s.code, ...data },
    update: data,
  });
  current.supplies++;
}

type SetItemInput = {
  name: string;
  spec?: string;
  unitPrice: number;
  qtyPerUnit?: number;
  isFreeIssue?: boolean;
  note?: string;
};

/** 부자재 세트 등록 (용기+캡+라벨처럼 함께 묶여 다니는 자재 구성) */
async function addPackagingSet(set: {
  code: string;
  name: string;
  formName?: string;
  capacity?: number;
  capacityUnit?: string;
  vendorName?: string;
  effectiveDate: Date;
  note?: string;
  items: SetItemInput[];
}) {
  const data = {
    name: set.name,
    formName: set.formName || null,
    capacity: set.capacity ?? null,
    capacityUnit: set.capacityUnit || null,
    vendorName: set.vendorName || null,
    vendorId: set.vendorName ? await vendorId(set.vendorName, "packaging") : null,
    effectiveDate: set.effectiveDate,
    sourceFile: current.file,
    note: set.note || null,
  };
  const items = set.items.map((i, idx) => ({
    sortOrder: idx + 1,
    name: i.name,
    spec: i.spec || null,
    unitPrice: i.unitPrice,
    qtyPerUnit: i.qtyPerUnit ?? 1,
    isFreeIssue: !!i.isFreeIssue,
    note: i.note || null,
  }));

  const existing = await prisma.packagingSet.findUnique({ where: { code: set.code } });
  if (existing) {
    await prisma.packagingSetItem.deleteMany({ where: { setId: existing.id } });
    await prisma.packagingSet.update({
      where: { id: existing.id },
      data: { ...data, items: { create: items } },
    });
  } else {
    await prisma.packagingSet.create({ data: { code: set.code, ...data, items: { create: items } } });
  }
  current.sets++;
}

/** "10g ~ 15g", "250ml까지", "1L", "155mg" → 규격 범위 */
function parseSpec(label: string): { specMin?: number; specMax?: number; specUnit?: string } {
  const clean = label.replace(/\s|\n/g, "");
  const unit = clean.includes("ml") ? "ml" : clean.includes("mg") ? "mg" : clean.includes("L") ? "L" : "g";
  const nums = clean.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  if (clean.includes("까지") || clean.includes("이하")) return { specMax: nums[0], specUnit: unit };
  if (clean.includes("이상")) return { specMin: nums[0], specUnit: unit };
  if (nums.length >= 2) return { specMin: nums[0], specMax: nums[1], specUnit: unit };
  if (nums.length === 1) return { specMin: nums[0], specMax: nums[0], specUnit: unit };
  return {};
}

const FORM_CODES: Record<string, { code: string; category: string }> = {
  정제: { code: "TABLET", category: "고형" },
  분말스틱: { code: "POWDER_STICK", category: "고형" },
  액상스틱: { code: "LIQUID_STICK", category: "액상" },
  젤리스틱: { code: "JELLY_STICK", category: "젤리" },
  환스틱: { code: "PILL_STICK", category: "고형" },
  경질캅셀: { code: "HARD_CAPSULE", category: "고형" },
  식물성연질: { code: "V_SOFTCAPSULE", category: "고형" },
  동물성연질: { code: "A_SOFTCAPSULE", category: "고형" },
  멀티팩: { code: "MULTIPACK", category: "고형" },
  "액상파우치(100ml)이하": { code: "LIQUID_POUCH_100", category: "액상" },
  액상파우치250ml까지: { code: "LIQUID_POUCH_250", category: "액상" },
  바이알: { code: "VIAL", category: "용기형" },
  스파우트병: { code: "SPOUT_BOTTLE", category: "용기형" },
  침향제품: { code: "AGARWOOD", category: "고형" },
  "원통(플라스틱)": { code: "CIRCLE_BOTTLE", category: "용기형" },
  유산균전용병: { code: "LACTO_BOTTLE", category: "용기형" },
};

// ─────────────────────────────────────────────────────────────
// 1) 회사가공비231130.xlsx — 자사 기준 제형별 기본 가공비
// ─────────────────────────────────────────────────────────────
async function importCompanyRates() {
  const file = "회사가공비231130.xlsx";
  startFile(file);
  await resetSource(file);
  const rows = readRows(file);
  const headerIdx = rows.findIndex((r) => r.some((c) => text(c) === "유형코드"));
  const header = rows[headerIdx].map(text);
  const col = (label: string) => header.findIndex((h) => h === label);
  const baseDate = new Date("2023-11-30");

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const code = text(r[col("유형코드")]);
    const name = text(r[col("유형이름")]);
    const cost = num(r[col("기본가공비")]);

    if (!code && !name) continue;

    // 유형코드 없는 예외 행 (예: 정제/캡슐 30만정 이하·이상 - 유유)
    if (!code) {
      const joined = r.map(text).join(" ");
      const price = num(r.find((c) => /원$/.test(text(c))));
      const vendor = r.map(text).find((c) => c && /^[가-힣A-Za-z0-9]+$/.test(c) && c !== name && !/원|만정/.test(c));
      if (price && name) {
        const isOver = joined.includes("이상");
        await addRate({
          vendorName: vendor || "미지정",
          formName: name,
          unitCost: price,
          costBasis: "per_tablet",
          qtyMin: isOver ? 300000 : 0,
          qtyMax: isOver ? null : 299999,
          effectiveDate: baseDate,
          note: joined.replace(/\s+/g, " ").trim(),
        });
      } else {
        current.skipped.push(`${file} ${i + 1}행: ${joined.slice(0, 40)}`);
      }
      continue;
    }

    if (!cost) {
      current.skipped.push(`${file} ${i + 1}행: ${name} (가공비 없음)`);
      continue;
    }

    const moq = num(r[col("최소MOQ")]) || undefined;
    const meta = FORM_CODES[name] || { code: code.toUpperCase().replace(/[-\s]/g, "_"), category: "기타" };
    await upsertProductType({
      name,
      formCode: meta.code,
      category: meta.category,
      defaultMoq: moq,
      processingCost: cost,
    });

    const changed = excelDate(r[col("변경일자")]) || baseDate;
    await addRate({
      vendorName: "자사기준",
      formName: name,
      formCode: meta.code,
      unitCost: cost,
      qtyMin: moq || 0,
      ownMargin: num(r[col("회사")]) || undefined,
      effectiveDate: changed,
      note: `유형코드 ${code}`,
    });

    // 롤비 / 병값 / 부자재비용은 별도 항목으로 분리
    for (const label of ["롤비", "병값", "부자재비용"]) {
      const idx = col(label);
      const v = idx >= 0 ? num(r[idx]) : 0;
      if (v) {
        await addExtra({
          name: label,
          formName: name,
          amount: v,
          effectiveDate: changed,
          note: `${name} ${label}`,
        });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 2) 회사가공비.xlsx (구버전) — 이력 보존용, isCurrent=false
// ─────────────────────────────────────────────────────────────
async function importCompanyRatesLegacy() {
  const file = "회사가공비.xlsx";
  if (!fs.existsSync(path.join(DIR, file))) return;
  startFile(file);
  await resetSource(file);
  const rows = readRows(file);
  const baseDate = new Date("2023-11-28");

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = text(r[0]);
    const cost = num(r[2]);
    if (!name || !cost || typeof r[2] !== "number") continue;

    const qty = num(r[1]) ? num(r[1]) * 10000 : 0; // "6만기준" → 60000
    const noteParts = [text(r[1]), text(r[3]), text(r[4]) && `박스비 ${text(r[4])}`, text(r[5]) && `병 ${text(r[5])}`]
      .filter(Boolean)
      .join(" / ");

    await addRate({
      vendorName: "자사기준",
      formName: name,
      unitCost: cost,
      qtyMin: qty,
      effectiveDate: excelDate(r[6]) || baseDate,
      isCurrent: false, // 231130 파일이 최신본
      note: noteParts || undefined,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 3) 액상,젤리스틱 임가공비.xlsx — 업체별·수량구간별 단가
// ─────────────────────────────────────────────────────────────
async function importLiquidJellyStick() {
  const file = "액상,젤리스틱 임가공비.xlsx";
  startFile(file);
  await resetSource(file);
  const rows = readRows(file);
  const headerIdx = rows.findIndex((r) => text(r[0]) === "업체명");
  const baseDate = new Date("2023-11-07");

  let vendor = "";
  let form = "";
  let spec = "";

  for (let i = headerIdx + 2; i < rows.length; i++) {
    const r = rows[i];
    if (text(r[0])) vendor = text(r[0]);
    if (text(r[1])) form = text(r[1]);
    if (text(r[2])) spec = text(r[2]).replace(/\n/g, " ");

    const qty = num(r[3]);
    const cost = num(r[4]);
    if (!qty || !cost) continue;

    await addRate({
      vendorName: vendor,
      formName: form,
      specLabel: spec,
      ...parseSpec(spec),
      qtyMin: qty,
      unitCost: cost,
      includesProfit: true, // 파일 주석: 제조사 일반관리비·제조경비·이윤 포함
      effectiveDate: baseDate,
      note: text(r[7]) || undefined,
    });

    const extract = num(r[5]);
    if (extract) {
      await addExtra({
        name: "추출",
        vendorName: vendor,
        formName: form,
        amount: extract,
        effectiveDate: baseDate,
        note: `${spec} / ${qty.toLocaleString()}개 기준`,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 4) 동물용 임가공비 연질캅셀.xlsx — 납품가 + 자사마진 구조
// ─────────────────────────────────────────────────────────────
async function importAnimalSoftcapsule() {
  const file = "동물용 임가공비 연질캅셀.xlsx";
  startFile(file);
  await resetSource(file);
  const rows = readRows(file);
  const baseDate = new Date("2024-04-11");
  const moqRow = rows.find((r) => r.some((c) => /MOQ/.test(text(c))));
  const moq = moqRow ? num(moqRow.find((c) => /MOQ/.test(text(c)))) : 180000;

  const seen = new Set<string>();
  for (const r of rows) {
    const name = text(r[0]) || text(r[1]);
    if (!/연질캅셀/.test(name)) continue;
    const spec = text(r[1]) || text(r[2]);
    const vendorPrice = num(r[2]) || num(r[3]);
    const own = num(r[3]) || num(r[4]);
    if (!vendorPrice) continue;
    const key = `${spec}-${vendorPrice}-${own}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await addRate({
      vendorName: "동물용 연질캅셀 협력사",
      formName: "동물성연질",
      formCode: "A_SOFTCAPSULE",
      specLabel: spec,
      ...parseSpec(spec),
      qtyMin: moq,
      unitCost: vendorPrice + own,
      vendorPrice,
      ownMargin: own,
      effectiveDate: baseDate,
      note: `동물용 / 납품 ${vendorPrice}원 + 회사 ${own}원`,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 5) 팜텍코리아 자재비 및 가공비 (7).xlsx — 용기별 가공비 + 부자재
// ─────────────────────────────────────────────────────────────
async function importPharmtech() {
  const file = "팜텍코리아 자재비 및 가공비 (7).xlsx";
  startFile(file);
  await resetSource(file);
  const rows = readRows(file);
  const baseDate = new Date("2024-02-13");
  const moqRow = rows.find((r) => r.some((c) => /MOQ/.test(text(c))));
  const moq = moqRow ? num(moqRow.find((c) => /MOQ/.test(text(c)))) : 45000;
  const vendor = "팜텍코리아";

  let section = "";
  let setItems: SetItemInput[] = [];

  const flushSet = async () => {
    if (section && setItems.length > 1) {
      await addPackagingSet({
        code: `PTK-SET-${section.replace(/[^0-9A-Za-z가-힣]/g, "")}`.slice(0, 40),
        name: `${section} 부자재 세트`,
        formName: section,
        capacity: num(section.match(/(\d+)ml/)?.[1]) || undefined,
        capacityUnit: /ml/.test(section) ? "ml" : undefined,
        vendorName: vendor,
        effectiveDate: baseDate,
        note: "라벨비 별도",
        items: setItems,
      });
    }
    setItems = [];
  };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const first = text(r[0]);

    const secMatch = first.match(/^\d+\.\s*(.+)$/);
    if (secMatch) {
      await flushSet();
      section = secMatch[1].trim();
      // "5. 스틱/파우치 가공비 : 132원/포" 처럼 한 줄에 단가가 들어있는 경우
      const inline = section.match(/(.+?)\s*가공비\s*[:：]\s*([\d,]+)\s*원/);
      if (inline) {
        await addRate({
          vendorName: vendor,
          formName: inline[1].trim(),
          unitCost: num(inline[2]),
          qtyMin: moq,
          effectiveDate: baseDate,
          note: section,
        });
        section = "";
      }
      continue;
    }

    if (first === "구분" || !first || !section) continue;

    const unitPrice = num(r[3]);
    const processCost = num(r[4]);

    if (processCost) {
      await addRate({
        vendorName: vendor,
        formName: section,
        specLabel: section.match(/\d+ml/)?.[0],
        ...parseSpec(section),
        qtyMin: moq,
        unitCost: processCost,
        costBasis: "per_bottle",
        effectiveDate: baseDate,
        note: "바이알/몰드병 라벨비 별도",
      });
    }

    if (unitPrice) {
      const code = `PTK-${section.replace(/[^0-9A-Za-z가-힣]/g, "")}-${first.replace(/[^0-9A-Za-z가-힣]/g, "")}`;
      setItems.push({
        name: first,
        spec: [text(r[1]), text(r[2]) && `인쇄 ${text(r[2])}`].filter(Boolean).join(" / "),
        unitPrice,
      });
      await addSupply({
        code: code.slice(0, 40),
        name: first,
        unitPrice,
        specification: [section, text(r[1]), text(r[2]) && `인쇄 ${text(r[2])}`].filter(Boolean).join(" / "),
        supplierName: vendor,
        color: text(r[1]) || undefined,
        printed: text(r[2]) || undefined,
        capacity: num(section.match(/(\d+)ml/)?.[1]) || undefined,
        capacityUnit: /ml/.test(section) ? "ml" : undefined,
        moq,
        effectiveDate: baseDate,
      });
    }
  }
  await flushSet();
}

// ─────────────────────────────────────────────────────────────
// 6) 액티브바이알 리스트 — 용기 마스터
// ─────────────────────────────────────────────────────────────
async function importVialList() {
  const file = "액티브바이알 리스트(빅솔_유산균용기_정리)20231212.xlsx";
  startFile(file);
  await resetSource(file);
  const rows = readRows(file);
  const headerIdx = rows.findIndex((r) => r.some((c) => text(c) === "품목명"));
  const header = rows[headerIdx].map(text);
  const col = (label: string) => header.findIndex((h) => h === label);
  const baseDate = new Date("2023-12-12");

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const name = text(r[col("품목명")]);
    if (!name) continue;
    const price = num(r[col("단가")]);

    // 호수별 캡슐 수용량은 참고값으로 비고에 남긴다
    const capsuleNote = ["0호 캡슐", "1호 캡슐", "2호 캡슐", "3호 캡슐"]
      .map((h) => (col(h) >= 0 && text(r[col(h)]) ? `${h} ${text(r[col(h)])}` : ""))
      .filter(Boolean)
      .join(" / ");

    await addSupply({
      code: `VIAL-${name}`.slice(0, 40),
      name: `바이알 ${name}`,
      unitPrice: price,
      specification: `${num(r[col("용량(ml)")])}ml / ${text(r[col("Vial Type")])}`,
      supplierName: "빅솔",
      capacity: num(r[col("용량(ml)")]),
      capacityUnit: "ml",
      origin: text(r[col("원산지")]) || undefined,
      vialType: text(r[col("Vial Type")]) || undefined,
      boxQty: num(r[col("Vial(ea)/Box")]) || undefined,
      effectiveDate: baseDate,
      note: capsuleNote ? `수용량 - ${capsuleNote}` : undefined,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 7) 제형별단가표(상상바이오).xlsx — 공정조합별 단가 (30만 미만/이상)
// ─────────────────────────────────────────────────────────────
async function importSangsangbio() {
  const file = "제형별단가표(상상바이오).xlsx";
  if (!fs.existsSync(path.join(DIR, file))) return;
  startFile(file);
  await resetSource(file);
  const rows = readRows(file);
  const baseDate = new Date("2024-02-07");
  const vendor = "상상바이오";
  let section = "";

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const first = text(r[0]);
    if (!first) continue;

    const sec = first.match(/^제형\((.+)\)$/);
    if (sec) {
      section = sec[1];
      continue;
    }

    // 다른 업체 단가: "파워온 - 14원/T(MOQ이상 생산 시 적용)"
    const other = first.match(/^([가-힣A-Za-z0-9]+)\s*-\s*([\d,]+)\s*원\/T/);
    if (other) {
      await addRate({
        vendorName: other[1],
        formName: "정제",
        unitCost: num(other[2]),
        costBasis: "per_tablet",
        effectiveDate: baseDate,
        isNegotiable: true,
        note: first,
      });
      continue;
    }

    // 부가 단가 메모: "-타정/필름코팅 8원/T"
    const extraLine = first.match(/^-\s*(.+?)\s*([\d,]+)\s*원\/([TCP])/);
    if (extraLine) {
      await addExtra({
        name: extraLine[1].trim(),
        vendorName: vendor,
        amount: num(extraLine[2]),
        effectiveDate: baseDate,
        note: first,
      });
      continue;
    }

    if (first.startsWith("※")) {
      if (/물류비/.test(first)) {
        await addExtra({
          name: "물류비",
          vendorName: vendor,
          calcType: "per_lot",
          amount: 0,
          condition: first.replace("※", "").trim(),
          effectiveDate: baseDate,
        });
      }
      continue;
    }

    if (!section || !first.includes("/")) continue;

    // B~C = 기존(30만 미만/이상), D~E = 변경(현행)
    const under = num(r[3]) || num(r[1]);
    const over = num(r[4]) || num(r[2]);
    const note = text(r[5]).replace(/\n/g, " ") || undefined;
    const negotiable = /협의|NEGO/.test(note || "");

    if (under) {
      await addRate({
        vendorName: vendor,
        formName: `${section} - ${first}`,
        unitCost: under,
        costBasis: "per_tablet",
        qtyMin: 0,
        qtyMax: 299999,
        effectiveDate: baseDate,
        isNegotiable: negotiable,
        note,
      });
    }
    if (over) {
      await addRate({
        vendorName: vendor,
        formName: `${section} - ${first}`,
        unitCost: over,
        costBasis: "per_tablet",
        qtyMin: 300000,
        effectiveDate: baseDate,
        isNegotiable: negotiable,
        note,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 8) 융복합비용.txt — 융복합 액상 견적 (벌크 / 완포장)
// ─────────────────────────────────────────────────────────────
async function importFusionTxt() {
  const file = "융복합비용.txt";
  startFile(file);
  await resetSource(file);
  const raw = fs.readFileSync(path.join(DIR, file), "utf-8");
  const baseDate = new Date("2024-05-09");
  const vendor = "팜텍코리아";

  const blocks = raw.split(/\*\s*(?=\d+ml)/).slice(1);
  for (const block of blocks) {
    const capacity = num(block.match(/(\d+)ml/)?.[1]);
    const process = num(block.match(/가공비\s*[:：]\s*([\d,]+)/)?.[1]);
    const material = num(block.match(/부자재\s*[:：]\s*([\d,]+)/)?.[1]);
    const tabletPack = num(block.match(/정제포장비용\s*[:：]\s*([\d,]+)/)?.[1]);
    const finalPrice = num(block.match(/최종\s*1병당\s*단가\s*[:：]?\s*([\d,]+)/)?.[1]);
    const isFinished = /완포장까지/.test(block);
    if (!process) continue;

    const mode = isFinished ? "finished" : capacity === 20 ? "bulk" : "semi";
    await addRate({
      vendorName: vendor,
      formName: `융복합 액상 ${capacity}ml`,
      specLabel: `${capacity}ml`,
      specMin: capacity,
      specMax: capacity,
      specUnit: "ml",
      unitCost: process,
      costBasis: "per_bottle",
      supplyMode: mode,
      effectiveDate: baseDate,
      note: [
        material ? `부자재 ${material}원` : "",
        tabletPack ? `정제포장 ${tabletPack}원` : "",
        finalPrice ? `확정 견적 ${finalPrice}원(VAT별도)` : "",
        /사급/.test(block) ? "단케이스·카톤박스 사급" : "",
      ]
        .filter(Boolean)
        .join(" / "),
    });

    if (tabletPack) {
      await addExtra({
        name: "정제 포장비",
        vendorName: vendor,
        formName: `융복합 액상 ${capacity}ml`,
        amount: tabletPack,
        effectiveDate: baseDate,
      });
    }
    if (isFinished) {
      const profit = num(block.match(/완포장비용\(기업이윤\s*(\d+)%\)/)?.[1]);
      if (profit) {
        await addExtra({
          name: "완포장비 (기업이윤)",
          vendorName: vendor,
          formName: `융복합 액상 ${capacity}ml`,
          calcType: "percent",
          amount: profit,
          percentBase: "cost_subtotal",
          effectiveDate: baseDate,
          condition: "완포장 진행 시",
        });
      }
    }

    // 부자재 상세: "(병 75원, 스크류캡 60원, ...)"
    const detail = block.match(/부자재\s*[:：]\s*[\d,]+원?\/?병?\s*\(([^)]+)\)/)?.[1];
    if (detail) {
      const items: SetItemInput[] = [];
      for (const part of detail.split(",")) {
        const m = part.trim().match(/^(.+?)\s*([\d,]+)\s*원$/);
        if (!m) continue;
        items.push({ name: m[1].trim(), unitPrice: num(m[2]) });
        await addSupply({
          code: `FUS-${capacity}-${m[1].replace(/\s/g, "")}`.slice(0, 40),
          name: m[1].trim(),
          unitPrice: num(m[2]),
          specification: `융복합 액상 ${capacity}ml`,
          supplierName: vendor,
          effectiveDate: baseDate,
        });
      }
      // 사급 자재는 금액 0 으로 세트에 남겨 구성만 보이게 한다
      const freeIssue = block.match(/\(([^)]*사급[^)]*)\)/)?.[1];
      if (freeIssue) {
        freeIssue
          .replace(/사급/g, "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .forEach((name) => items.push({ name, unitPrice: 0, isFreeIssue: true, note: "사급(고객 제공)" }));
      }

      if (items.length) {
        await addPackagingSet({
          code: `FUS-SET-${capacity}${isFinished ? "-FIN" : ""}`,
          name: `융복합 액상 ${capacity}ml 부자재 세트${isFinished ? " (완포장)" : ""}`,
          formName: `융복합 액상 ${capacity}ml`,
          capacity,
          capacityUnit: "ml",
          vendorName: vendor,
          effectiveDate: baseDate,
          note: material ? `원본 표기 부자재 ${material}원/병` : undefined,
          items,
        });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n\x1b[1m임가공비 자료 임포트\x1b[0m  (${DIR})\n`);

  await importCompanyRates();
  await importCompanyRatesLegacy();
  await importLiquidJellyStick();
  await importAnimalSoftcapsule();
  await importPharmtech();
  await importVialList();
  await importSangsangbio();
  await importFusionTxt();

  console.log("파일별 적재 결과");
  console.log("─".repeat(78));
  for (const r of report) {
    console.log(
      `  ${r.file.padEnd(46)} 단가 ${String(r.rates).padStart(3)} · 추가비 ${String(r.extras).padStart(3)} · 자재 ${String(r.supplies).padStart(3)} · 세트 ${String(r.sets).padStart(2)}`
    );
    r.skipped.forEach((s) => console.log(`      \x1b[33m건너뜀\x1b[0m ${s}`));
  }

  const currentRates = await prisma.tollingRate.findMany({
    where: { isCurrent: true },
    select: { formName: true, vendorName: true, unitCost: true, qtyMin: true, sourceFile: true },
  });

  // (1) 진짜 충돌 — 같은 업체·제형·수량구간에 서로 다른 단가
  const byVendorForm = new Map<string, typeof currentRates>();
  currentRates.forEach((r) => {
    const key = `${r.vendorName}|${r.formName}|${r.qtyMin}`;
    byVendorForm.set(key, [...(byVendorForm.get(key) || []), r]);
  });
  const conflicts = [...byVendorForm.entries()].filter(
    ([, list]) => new Set(list.map((l) => l.unitCost)).size > 1
  );

  if (conflicts.length) {
    console.log("\n\x1b[31m단가 충돌 — 같은 업체·제형·수량구간에 값이 두 개 이상\x1b[0m");
    console.log("─".repeat(78));
    conflicts.forEach(([key, list]) => {
      const [vendor, form, qty] = key.split("|");
      console.log(`  ${vendor} / ${form} (수량 ${Number(qty).toLocaleString()}~)`);
      list.forEach((l) => console.log(`      ${String(l.unitCost).padStart(6)}원   ← ${l.sourceFile}`));
    });
  } else {
    console.log("\n\x1b[32m단가 충돌 없음 (같은 업체·제형·수량구간 중복 단가 없음)\x1b[0m");
  }

  // (2) 업체 비교 — 같은 제형을 두 업체 이상이 견적한 경우 (정상, 견적 시 선택 대상)
  const byForm = new Map<string, typeof currentRates>();
  currentRates.forEach((r) => {
    byForm.set(r.formName, [...(byForm.get(r.formName) || []), r]);
  });
  const comparable = [...byForm.entries()].filter(
    ([, list]) => new Set(list.map((l) => l.vendorName)).size > 1
  );
  if (comparable.length) {
    console.log("\n업체 비교 가능 제형 (견적 시 선택)");
    console.log("─".repeat(78));
    comparable.forEach(([form, list]) => {
      const sorted = [...list].sort((a, b) => a.unitCost - b.unitCost);
      const label = sorted
        .map((l) => `${l.vendorName} ${l.unitCost}원(${l.qtyMin ? `${(l.qtyMin / 10000).toFixed(0)}만~` : "전량"})`)
        .join("  ·  ");
      console.log(`  ${form.padEnd(16)} ${label}`);
    });
  }

  const [rates, extras, supplies, sets, types, vendors] = await Promise.all([
    prisma.tollingRate.count(),
    prisma.tollingExtra.count(),
    prisma.supply.count(),
    prisma.packagingSet.count(),
    prisma.productType.count(),
    prisma.supplier.count(),
  ]);
  console.log("\n합계");
  console.log("─".repeat(78));
  console.log(
    `  임가공 단가 ${rates}건 · 추가 공정비 ${extras}건 · 자재 ${supplies}건 · 부자재 세트 ${sets}건 · 제형 ${types}건 · 거래처 ${vendors}건\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
