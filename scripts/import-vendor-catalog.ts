/**
 * 거래처 품목리스트 → MaterialCatalog 적재 + 기존 Material 대조 리포트
 *
 * 적재 대상 (단가 없음 → Material 이 아닌 MaterialCatalog 로 들어간다)
 *   data/vendor-catalog/btc.json       (BTC) 취급원료 리스트.xlsx        56건
 *   data/vendor-catalog/biocare.json   (주)바이오케어 식품원료리스트.pdf  69건  ※ 스캔 PDF 육안 전사
 *   data/vendor-catalog/bitek.json     (주)바이텍 원료 리스트.pdf        29건  ※ 카탈로그 PDF 육안 전사
 *   data/vendor-catalog/highbase.json  3-2. 직수입원료 목록(하이베이스)   177건
 *   data/vendor-catalog/bareun.json    바른에프피 품목리스트             159건  ※ 셀 글자색=독점 표기 추출
 *   data/vendor-catalog/oldam.json     올담식품 리스트.xlsx              515건  ※ 5시트 중 농축액·분말·퓨레만
 *                                        (향분말 139 / 맛분말 78 은 제품명+코드뿐이라 보류)
 *   data/vendor-catalog/haechansol.json 해찬솔푸드-품목리스트(통합)(24.03.27).pdf  610건
 *                                        ※ 텍스트PDF 22p, 섹션마다 컬럼 스키마가 3종이라 헤더별로 파싱
 *   data/vendor-catalog/taewang.json   태왕물산 주식회사_식첨 품목.xlsx     637건 (식첨 544 + 유기농 93)
 *   data/vendor-catalog/taesung.json   태성 수입원료(아이템 리스트).xlsx    107건
 *   data/vendor-catalog/dongil.json    동일팜텍 품목리스트_2024.pdf          42건
 *   data/vendor-catalog/highbase31.json 3-1. 취급원료 목록(하이베이스)        601건
 *     └ [한줄] 시트만 사용. 같은 파일의 [ㄱㄴ순서정리함2011년12월26] 시트에만 있는
 *       440건은 2011년 스냅샷이라 현행 여부가 불확실해 제외했다.
 *       원산지·규격·포장 컬럼이 없어 품목명+코드만 들어간다.
 *   data/vendor-catalog/joeun.json     조은푸드텍 제품리스트_230914.pdf     504건
 *   data/vendor-catalog/daeduk.json    취급 품목 리스트(대덕약업).pdf         54건  ※ 4쪽 육안 전사
 *   data/vendor-catalog/hyangrim.json  향림산업 전제품리스트.pdf             33건  ※ 7쪽 육안 전사(카드형)
 *   data/vendor-catalog/jinsung.json   진성교역상사&콩코드상사 Product List   36건
 *   data/vendor-catalog/gqbio.json     지큐바이오_취급원료 리스트_ver0011.pdf  28건
 *
 * 리포트 전용 (REPORT_ONLY — 대조에는 쓰되 적재하지 않음)
 *   data/vendor-catalog/prime.json     프라임H&B 상품소개서 [원료리스트]  229건
 *     └ "수입 및 구매업체" 컬럼에 38개 업체가 섞인 중개 리스트라
 *       그대로 넣으면 공급사 마스터에 신규 30개가 생긴다. 대조 단서로만 사용한다.
 *
 * 사용법
 *   npx tsx scripts/import-vendor-catalog.ts --dry-run   # 리포트만
 *   npx tsx scripts/import-vendor-catalog.ts             # 적재 + 리포트
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const SRC_DIR = path.join(process.cwd(), "data", "vendor-catalog");
const REPORT_DIR = path.join(process.cwd(), "import-reports");

interface Item {
  supplierName: string;
  name: string;
  category: string | null;
  origin: string | null;
  specification: string | null;
  packingUnit: number | null;
  refCode: string | null;
  note: string | null;
  sourceFile: string;
  /** true 면 대조 리포트에만 쓰고 MaterialCatalog 에는 넣지 않는다 */
  reportOnly?: boolean;
}

const t = (v: unknown) => String(v ?? "").trim();
const nn = (v: string) => (v ? v : null);

// ── 출처별 로더 ────────────────────────────────────────────
function loadBtc(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "btc.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const pk = Number(t(r["포장단위"]));
    return {
      supplierName: "BTC",
      // 품목명이 브랜드명(Supro 661)인 경우가 많아 "구분 / 품목명" 으로 식별성 확보
      name: t(r["구분"]) && t(r["구분"]) !== t(r["품목명"])
        ? `${t(r["품목명"])} (${t(r["구분"])})`
        : t(r["품목명"]),
      category: nn(t(r["시트"])),
      origin: nn(t(r["원산지"])),
      specification: nn(t(r["함량"])),
      packingUnit: Number.isFinite(pk) && pk > 0 ? pk : null,
      refCode: nn(t(r["고시번호"])),
      note: nn(t(r["비고"])),
      sourceFile: "(BTC) 취급원료 리스트.xlsx",
    };
  });
}

function loadBiocare(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "biocare.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => ({
    supplierName: "바이오케어",
    name: t(r["품목명"]),
    category: nn(t(r["구분"])),
    origin: nn(t(r["원산지"])),
    specification: null,
    packingUnit: null,
    refCode: null,
    note: null,
    sourceFile: "(주)바이오케어 식품원료리스트 .pdf",
  }));
}

function loadBitek(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "bitek.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => ({
    supplierName: "바이텍",
    name: t(r["품목명"]),
    category: nn(t(r["구분"])),
    origin: null, // 원본에 원산지 항목 자체가 없음
    specification: nn(t(r["규격"])),
    packingUnit: null,
    refCode: null,
    note: nn(t(r["비고"])),
    sourceFile: "(주)바이텍 원료 리스트.pdf",
  }));
}

function loadHighbase(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "highbase.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const pk = Number(t(r["포장"]));
    // 유통기한(년) · 수입사 · 제조사는 별도 컬럼이 없으므로 note 로 합친다
    const notes = [
      t(r["유통기한"]) ? `유통기한 ${t(r["유통기한"])}년` : "",
      t(r["수입사"]) ? `수입사 ${t(r["수입사"])}` : "",
      t(r["제조사"]) ? `제조사 ${t(r["제조사"])}` : "",
    ].filter(Boolean);
    return {
      supplierName: "하이베이스",
      name: t(r["품목명"]),
      category: nn(t(r["구분"])),
      origin: nn(t(r["원산지"])),
      specification: nn(t(r["규격"])),
      packingUnit: Number.isFinite(pk) && pk > 0 ? pk : null,
      refCode: nn(t(r["순서"])),
      note: notes.length ? notes.join(" / ") : null,
      sourceFile: "251-255쪽 3-2. 직수입원료 목록-1(하이베이스).xlsx",
    };
  });
}

function loadBareun(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "bareun.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    // 패킹단위가 "1kg, 5kg" 처럼 복수인 경우가 있어 첫 숫자만 취하고 원문은 note 로
    const packRaw = t(r["패킹단위"]);
    const m = packRaw.match(/([\d.]+)\s*kg/i);
    const pk = m ? Number(m[1]) : NaN;
    const notes = [
      r["독점"] ? "★독점 또는 경쟁력있는 수급" : "",
      t(r["건식여부"]) ? `건식여부 ${t(r["건식여부"])}` : "",
      t(r["제조사"]) ? `제조사 ${t(r["제조사"])}` : "",
      t(r["비고"]),
      packRaw && !m ? `패킹원문 ${packRaw}` : "",
      packRaw && m && /,/.test(packRaw) ? `패킹원문 ${packRaw}` : "",
    ].filter(Boolean);
    return {
      supplierName: "바른에프피",
      name: t(r["품목명"]),
      category: nn(t(r["구분"])),
      origin: nn(t(r["원산지"])),
      specification: null,
      packingUnit: Number.isFinite(pk) && pk > 0 ? pk : null,
      refCode: null,
      note: notes.length ? notes.join(" / ") : null,
      sourceFile: "바른에프피 품목리스트(카무트글루텐분해효소 24.02.05).xlsx",
    };
  });
}

function loadOldam(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "oldam.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const pk = Number(t(r["단위"]).replace(/kg/i, ""));
    // Brix 는 농축액 시트에만 있는 농도 지표라 규격으로 올린다
    const brix = t(r["Brix"]);
    const notes = [
      t(r["효능"]) ? `효능 ${t(r["효능"])}` : "",
      t(r["단위"]) && !Number.isFinite(pk) ? `단위원문 ${t(r["단위"])}` : "",
    ].filter(Boolean);
    return {
      supplierName: "올담식품",
      name: t(r["품목명"]),
      category: t(r["시트"]) === "퓨레, 당절임" ? "퓨레/당절임" : t(r["시트"]),
      origin: nn(t(r["원산지"])),
      specification: brix ? `Brix ${brix}` : null,
      packingUnit: Number.isFinite(pk) && pk > 0 ? pk : null,
      refCode: nn(t(r["제품번호"])), // 거래처 자체 제품코드 AD-xxxx
      note: notes.length ? notes.join(" / ") : null,
      sourceFile: "올담식품 리스트.xlsx",
    };
  });
}

function loadHaechansol(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "haechansol.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const brix = t(r["BRIX"]);
    const notes = [
      t(r["성분함량표시"]) ? `성분 ${t(r["성분함량표시"])}` : "",
      t(r["원물효능"]) ? `효능 ${t(r["원물효능"])}` : "",
      t(r["보관방법"]) ? `보관 ${t(r["보관방법"])}` : "",
    ].filter(Boolean);
    return {
      supplierName: "해찬솔",
      name: t(r["제품명"]),
      category: t(r["구분"]) || null,
      origin: nn(t(r["원산지"])),
      specification: brix ? `BRIX ${brix}` : null,
      packingUnit: null, // 원본에 포장단위 컬럼이 없다
      refCode: nn(t(r["LOT"])), // 거래처 LOT 코드 HCS-xxxx
      note: notes.length ? notes.join(" / ") : null,
      sourceFile: "해찬솔푸드-품목리스트(통합)(24.03.27).pdf",
    };
  });
}

function loadTaewang(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "taewang.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const pk = Number(t(r["포장단위"]));
    const brix = t(r["브릭스"]);
    const notes = [
      t(r["유통기한"]) ? `유통기한 ${t(r["유통기한"])}` : "",
      t(r["제조사"]) ? `제조사 ${t(r["제조사"])}` : "",
      t(r["성분명"]) ? `성분 ${t(r["성분명"])}` : "",
      t(r["가공형태"]) ? `가공형태 ${t(r["가공형태"])}` : "",
      t(r["보관조건"]) ? `보관 ${t(r["보관조건"])}` : "",
      !Number.isFinite(pk) && t(r["포장단위"]) ? `포장원문 ${t(r["포장단위"])}` : "",
    ].filter(Boolean);
    return {
      supplierName: "태왕물산",
      name: t(r["품목명"]),
      category: t(r["시트"]) || null,
      origin: nn(t(r["원산지"])),
      specification: brix ? `BRIX ${brix}` : null,
      packingUnit: Number.isFinite(pk) && pk > 0 ? pk : null,
      refCode: nn(t(r["번호"])),
      note: notes.length ? notes.join(" / ") : null,
      sourceFile: "태왕물산 주식회사_식첨 품목.xlsx",
    };
  });
}

function loadTaesung(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "taesung.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const pk = Number(t(r["포장단위"]).replace(/kg/i, "").trim());
    // 지표성분 + 함량 이 규격을 이룬다 ("총(-)-Hydroxycitric acid 60%")
    const spec = [t(r["지표성분"]), t(r["함량"])].filter(Boolean).join(" ");
    return {
      supplierName: "태성",
      name: t(r["원료명"]),
      category: t(r["시트"]) || null,
      origin: nn(t(r["제조국"])),
      specification: nn(spec),
      packingUnit: Number.isFinite(pk) && pk > 0 ? pk : null,
      refCode: nn(t(r["번호"])),
      note: t(r["제조사"]) ? `제조사 ${t(r["제조사"])}` : null,
      sourceFile: "태성 수입원료(아이템 리스트) _ 23.08.21.xlsx",
    };
  });
}

function loadDongil(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "dongil.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const pk = Number(t(r["포장단위"]).replace(/kg/i, ""));
    const notes = [
      t(r["기능성"]) ? `기능성 ${t(r["기능성"])}` : "",
      t(r["성상"]) ? `성상 ${t(r["성상"])}` : "",
      t(r["수용화"]) ? `수용화 ${t(r["수용화"])}` : "",
    ].filter(Boolean);
    return {
      supplierName: "동일팜텍",
      name: t(r["제품명"]),
      category: t(r["구분"]) || null,
      origin: nn(t(r["원산지"])),
      specification: nn(t(r["지표물질"])),
      packingUnit: Number.isFinite(pk) && pk > 0 ? pk : null,
      refCode: nn(t(r["번호"])),
      note: notes.length ? notes.join(" / ") : null,
      sourceFile: "동일팜텍 품목리스트_2024.pdf",
    };
  });
}

function loadHighbase31(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "highbase31.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => ({
    supplierName: "하이베이스",
    name: t(r["품목명"]),
    category: "취급원료",
    origin: null,        // 원본에 컬럼 없음
    specification: null, // 원본에 컬럼 없음
    packingUnit: null,
    refCode: nn(t(r["코드"])),
    note: null,
    sourceFile: "247-250쪽 3-1. 취급원료 목록-1(하이베이스).xlsx",
  }));
}

function loadJoeun(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "joeun.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    // 품목명 끝의 "(65)" 는 BRIX 값이다
    const nm = t(r["품목명"]);
    const bx = nm.match(/\((\d{1,3})\)\s*$/);
    return {
      supplierName: "조은푸드텍",
      name: nm,
      category: nn(t(r["구분"])),
      origin: nn(t(r["원산지"])),
      specification: bx ? `BRIX ${bx[1]}` : null,
      packingUnit: null,
      refCode: null,
      note: nn(t(r["비고"])),
      sourceFile: "조은푸드텍 제품리스트_230914.pdf",
    };
  });
}

function loadDaeduk(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "daeduk.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const notes = [
      t(r["기능성내용"]) ? `기능성 ${t(r["기능성내용"])}` : "",
      t(r["일일섭취량"]) ? `일일섭취량 ${t(r["일일섭취량"])}` : "",
      t(r["성상용해성"]) ? `성상 ${t(r["성상용해성"])}` : "",
    ].filter(Boolean);
    return {
      supplierName: "대덕약업",
      name: t(r["원료명"]),
      category: nn(t(r["제품유형"])),
      origin: nn(t(r["원산지"])),
      specification: nn(t(r["기능성분함량"])),
      packingUnit: null,
      refCode: nn(t(r["No"])),
      note: notes.length ? notes.join(" / ") : null,
      sourceFile: "취급 품목 리스트(대덕약업).pdf",
    };
  });
}

function loadHyangrim(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "hyangrim.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    // 포장단위가 "20kg(F, Litho), 25kg(TG)" 처럼 복수인 경우 첫 값만 수치화
    const pk = t(r["포장단위"]).match(/([\d.]+)\s*kg/i);
    const n = pk ? Number(pk[1]) : NaN;
    const notes = [
      t(r["기능성"]) ? `기능성 ${t(r["기능성"])}` : "",
      t(r["비고"]),
      /,|\(/.test(t(r["포장단위"])) ? `포장원문 ${t(r["포장단위"])}` : "",
    ].filter(Boolean);
    return {
      supplierName: "향림산업",
      name: t(r["품목명"]),
      category: nn(t(r["구분"])),
      origin: nn(t(r["원산지"])),
      specification: null,
      packingUnit: Number.isFinite(n) && n > 0 ? n : null,
      refCode: nn(t(r["브랜드"])), // 브랜드명이 사실상 제품 식별자
      note: notes.length ? notes.join(" / ") : null,
      sourceFile: "향림산업 전제품리스트.pdf",
    };
  });
}

function loadJinsung(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "jinsung.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => ({
    supplierName: "진성교역상사",
    name: t(r["품목명"]),
    category: null,
    origin: nn(t(r["원산지"])),
    specification: null,
    packingUnit: null,
    refCode: null,
    note: nn(t(r["기능특성"])),
    sourceFile: "진성교역상사&(주)콩코드상사 Product List_2024.pdf",
  }));
}

function loadGqbio(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "gqbio.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const notes = [
      t(r["기능성"]) ? `기능성 ${t(r["기능성"])}` : "",
      t(r["기타"]),
    ].filter(Boolean);
    return {
      supplierName: "지큐바이오",
      name: t(r["제품명"]),
      category: nn(t(r["구분"])),
      origin: nn(t(r["원산지"])),
      specification: nn(t(r["규격"])),
      packingUnit: null,
      refCode: null,
      note: notes.length ? notes.join(" / ") : null,
      sourceFile: "지큐바이오_취급원료 리스트_ver0011.pdf",
    };
  });
}

/** 프라임H&B — 적재하지 않고 대조에만 사용 */
function loadPrime(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "prime.json"), "utf-8"));
  return raw.map((r: Record<string, unknown>) => {
    const m = t(r["패킹단위"]).match(/([\d.]+)\s*kg/i);
    const pk = m ? Number(m[1]) : NaN;
    return {
      // 파일 소유자가 아니라 실제 "수입 및 구매업체" 를 후보 공급사로 본다
      supplierName: t(r["구매업체"]) || "프라임H&B",
      name: t(r["품목명"]),
      category: nn(t(r["식품유형"])),
      origin: nn(t(r["원산지"])),
      specification: nn(t(r["원료정보"])),
      packingUnit: Number.isFinite(pk) && pk > 0 ? pk : null,
      refCode: null,
      note: nn(t(r["건강기능"])),
      sourceFile: "0.12월_프라임H&B 상품소개서(공유용).xlsx",
      reportOnly: true,
    };
  });
}

// ── 대조용 정규화 ──────────────────────────────────────────
/** 괄호/공백/단위 제거 후 핵심 토큰만 남김 */
function matchKey(name: string): string {
  return name
    .replace(/\([^)]*\)/g, "")
    .replace(/\d+(\.\d+)?\s*(%|mg\/g|B|kg)/gi, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * 두 품목명의 매칭 신뢰도.
 * 단순 부분일치는 "유산균" 이 "열처리유산균사균체" 에 빨려 들어가는 오매칭을 낳으므로
 * 짧은 쪽이 긴 쪽의 몇 %를 차지하는지로 걸러낸다.
 */
function matchScore(a: string, b: string): { level: string; ratio: number } | null {
  if (!a || !b || a.length < 2 || b.length < 2) return null;
  if (a === b) return { level: "확실", ratio: 1 };
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (!long.includes(short)) return null;
  const ratio = short.length / long.length;
  if (ratio >= 0.7) return { level: "높음", ratio };
  if (ratio >= 0.5) return { level: "보통", ratio };
  return null; // 0.5 미만은 오매칭으로 간주하고 버림
}

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
  console.log(`  · ${name.padEnd(34)} ${String(rows.length).padStart(4)}건`);
}

async function main() {
  const items = [
    ...loadBtc(), ...loadBiocare(), ...loadBitek(),
    ...loadHighbase(), ...loadBareun(), ...loadOldam(),
    ...loadHaechansol(), ...loadTaewang(), ...loadTaesung(), ...loadDongil(),
    ...loadHighbase31(),
    ...loadJoeun(), ...loadDaeduk(), ...loadHyangrim(), ...loadJinsung(), ...loadGqbio(),
    ...loadPrime(), // reportOnly
  ];
  console.log(`\n품목 로드: ${items.length}건`);
  const loadable = items.filter((i) => !i.reportOnly);
  const reportOnly = items.filter((i) => i.reportOnly);
  const bySrc: Record<string, number> = {};
  loadable.forEach((i) => (bySrc[i.supplierName] = (bySrc[i.supplierName] || 0) + 1));
  console.log(`  적재대상 ${loadable.length}건 → ${Object.entries(bySrc).map(([k, v]) => `${k} ${v}`).join(" / ")}`);
  console.log(`  리포트전용 ${reportOnly.length}건 (${new Set(reportOnly.map((i) => i.supplierName)).size}개 업체, 적재하지 않음)`);
  if (DRY_RUN) console.log("모드: DRY-RUN (DB 미변경)");

  // ── [3] 기존 Material 대조 ────────────────────────────
  const allMats = await prisma.material.findMany({
    select: { id: true, name: true, unitPrice: true, origin: true, supplierId: true,
              supplier: { select: { name: true } } },
  });
  const unknownSup = await prisma.supplier.findUnique({ where: { code: "SRC21" } });

  const crossRef: Record<string, unknown>[] = [];
  const clueBest = new Map<string, { ratio: number; row: Record<string, unknown> }>();

  for (const it of items) {
    const key = matchKey(it.name);
    if (key.length < 2) continue;
    const hits = allMats
      .map((m) => ({ m, score: matchScore(key, matchKey(m.name)) }))
      .filter((h) => h.score !== null)
      .sort((x, y) => y.score!.ratio - x.score!.ratio);
    if (!hits.length) {
      crossRef.push({
        카탈로그공급사: it.supplierName, 카탈로그품목: it.name,
        구분: it.category ?? "", 원산지: it.origin ?? "",
        매칭상태: "신규(DB에 없음)", 신뢰도: "", 적재여부: it.reportOnly ? "리포트전용" : "적재",
        매칭원료: "", 기존공급사: "", 기존단가: "",
      });
      continue;
    }
    for (const { m, score } of hits) {
      const isUnknown = unknownSup && m.supplierId === unknownSup.id;
      const sameSup = m.supplier.name === it.supplierName;
      crossRef.push({
        카탈로그공급사: it.supplierName, 카탈로그품목: it.name,
        구분: it.category ?? "", 원산지: it.origin ?? "",
        매칭상태: sameSup ? "동일공급사 기등록" : isUnknown ? "★공급사 미상 → 후보" : "타공급사 보유",
        신뢰도: score!.level,
        적재여부: it.reportOnly ? "리포트전용" : "적재",
        매칭원료: m.name, 기존공급사: m.supplier.name, 기존단가: m.unitPrice,
      });
      // 3번 목적: 미지정 830건의 공급사 규명 단서
      // 같은 (미상원료 × 추정공급사) 는 가장 신뢰도 높은 근거 1건만 남긴다
      if (isUnknown) {
        const ck = `${m.id}|${it.supplierName}`;
        const prev = clueBest.get(ck);
        if (!prev || score!.ratio > prev.ratio) {
          clueBest.set(ck, {
            ratio: score!.ratio,
            row: {
              미상원료: m.name, 기존단가: m.unitPrice, 기존원산지: m.origin ?? "",
              추정공급사: it.supplierName, 신뢰도: score!.level,
              단서종류: it.reportOnly ? "프라임H&B 중개리스트" : "거래처 카탈로그",
              근거품목: it.name, 근거출처: it.sourceFile, 카탈로그원산지: it.origin ?? "",
            },
          });
        }
      }
    }
  }

  const supplierClues = [...clueBest.values()]
    .sort((a, b) => b.ratio - a.ratio)
    .map((c) => c.row);

  console.log("\n── 리포트 ──────────────────────────────");
  writeReport("06_거래처카탈로그_대조.csv", crossRef);
  writeReport("07_미상원료_공급사후보.csv", supplierClues);

  const stat = crossRef.reduce<Record<string, number>>((a, r) => {
    const k = String(r.매칭상태); a[k] = (a[k] || 0) + 1; return a;
  }, {});
  console.log("\n── 대조 요약 ───────────────────────────");
  Object.entries(stat).forEach(([k, v]) => console.log(`  ${k.padEnd(24)} ${String(v).padStart(4)}건`));
  console.log(`  ★ 미상원료 공급사 후보     ${String(new Set(supplierClues.map((c) => c.미상원료)).size).padStart(4)}건 (중복제거)`);

  if (DRY_RUN) {
    console.log(`\nDRY-RUN 종료. 리포트: ${REPORT_DIR}\n`);
    return;
  }

  // ── [1] MaterialCatalog 적재 ──────────────────────────
  console.log("\n── 적재 ────────────────────────────────");
  const supIds = new Map<string, string>();
  for (const nm of [...new Set(loadable.map((i) => i.supplierName))]) {
    let sup = await prisma.supplier.findFirst({ where: { name: nm } });
    if (!sup) {
      let seq = 1, code = "";
      do { code = `VND${String(seq++).padStart(3, "0")}`; }
      while (await prisma.supplier.findUnique({ where: { code } }));
      sup = await prisma.supplier.create({
        data: { code, name: nm, category: "material", isActive: true },
      });
      console.log(`  공급사 신규 생성: ${nm} (${code})`);
    } else {
      console.log(`  공급사 기존 재사용: ${nm} (${sup.code})`);
    }
    supIds.set(nm, sup.id);
  }

  // sourceFile 단위로 지우고 다시 넣어 멱등성을 확보한다.
  // 수기로 연결해 둔 materialId 는 (공급사, 품목명) 기준으로 스냅샷 후 복원한다.
  let created = 0, relinked = 0;
  for (const src of [...new Set(loadable.map((i) => i.sourceFile))]) {
    const prev = await prisma.materialCatalog.findMany({
      where: { sourceFile: src, materialId: { not: null } },
      select: { supplierId: true, name: true, materialId: true },
    });
    const linkMap = new Map(prev.map((p) => [`${p.supplierId}|${p.name}`, p.materialId!]));
    const removed = await prisma.materialCatalog.deleteMany({ where: { sourceFile: src } });

    const rows = loadable.filter((i) => i.sourceFile === src);
    for (const it of rows) {
      const supplierId = supIds.get(it.supplierName)!;
      const materialId = linkMap.get(`${supplierId}|${it.name}`) ?? null;
      if (materialId) relinked++;
      await prisma.materialCatalog.create({
        data: {
          supplierId, name: it.name, category: it.category, origin: it.origin,
          specification: it.specification, packingUnit: it.packingUnit,
          refCode: it.refCode, note: it.note, sourceFile: it.sourceFile,
          materialId, isActive: true,
        },
      });
      created++;
    }
    console.log(`  ${src.slice(0, 46).padEnd(46)} 기존 ${String(removed.count).padStart(3)}건 교체 → ${String(rows.length).padStart(3)}건`);
  }
  console.log(`  카탈로그 ${created}건 적재 (원료 연결 복원 ${relinked}건)`);
  console.log(`\n리포트: ${REPORT_DIR}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
