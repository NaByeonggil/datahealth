import * as XLSX from "xlsx";

type Cell = string | number | null | undefined;
// API 응답 행 — 마스터마다 모양이 달라 느슨하게 받는다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
interface SheetSpec {
  name: string;
  headers: string[];
  rows: Cell[][];
}

const yn = (v: unknown) => (v ? "Y" : "");
const date = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString("ko-KR") : "");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

/** 시트마다 헤더 길이·내용 길이로 열 너비를 맞추고 파일명 뒤에 오늘 날짜를 붙여 내려받는다 */
function download(filename: string, sheets: SheetSpec[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const aoa = [s.headers, ...s.rows.map((r) => r.map((c) => c ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = s.headers.map((_, i) => {
      // 한글은 영문보다 넓으므로 길이를 두 배로 친다
      const width = Math.max(
        ...aoa.map((r) => [...String(r[i] ?? "")].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)),
      );
      return { wch: Math.min(Math.max(width + 2, 8), 50) };
    });
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: s.headers.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  XLSX.writeFile(wb, `${filename}_${today()}.xlsx`);
}

const getJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} 조회 실패 (${res.status})`);
  const json = await res.json();
  return Array.isArray(json) ? json : json.data || [];
};

/** 등록된 원료 전체 (현재 화면의 검색·공급사 필터 적용) */
export async function exportMaterials(filter: { supplierId?: string; search?: string } = {}) {
  const params = new URLSearchParams({ page: "1", limit: "100000" });
  if (filter.supplierId) params.set("supplierId", filter.supplierId);
  if (filter.search) params.set("search", filter.search);
  const list = await getJson(`/api/materials?${params}`);
  download("원료목록", [{
    name: "원료",
    headers: ["코드", "원료명", "구분", "공급사", "원산지", "규격", "단위", "단가(원)", "최소주문량", "포장단위", "기능성", "인증", "비고", "수정자", "수정일"],
    rows: list.map((m: Row) => [
      m.code, m.name, m.category, m.supplier?.name, m.origin, m.specification, m.unit,
      m.unitPrice, m.minOrderQty, m.packingUnit, yn(m.isFunctional), m.certifications, m.note,
      m.updatedBy, date(m.updatedAt),
    ]),
  }]);
  return list.length;
}

/** 원료 함유량 (현재 화면의 구분·상태·검색 필터 적용) — 함량이 없으면 "없음"으로 적는다 */
export async function exportMaterialContents(filter: { sourceType?: string; status?: string; search?: string } = {}) {
  const params = new URLSearchParams({ page: "1", limit: "100000" });
  if (filter.sourceType) params.set("sourceType", filter.sourceType);
  if (filter.status) params.set("status", filter.status);
  if (filter.search) params.set("search", filter.search);
  const list = await getJson(`/api/material-contents?${params}`);
  const STATUS: Record<string, string> = { 추출: "함량 있음", 함량없음: "없음", 규격없음: "없음 (규격 없음)" };
  download("원료함유량", [{
    name: "함유량",
    headers: ["구분", "원료코드", "원료명", "공급사", "지표성분", "함유량", "상한", "단위", "조건", "상태", "직접입력", "규격 원문", "규격 내 함량 표기", "비고", "수정일"],
    rows: list.map((r: Row) => [
      r.sourceType === "material" ? "원료" : "취급품목", r.material?.code,
      r.name, (r.material ?? r.catalog)?.supplier?.name, r.component,
      r.amount ?? "없음", r.amountMax, r.unit, r.qualifier, STATUS[r.status] || r.status,
      yn(r.isManual), r.specification, r.matches, r.note, date(r.updatedAt),
    ]),
  }]);
  return list.length;
}

/**
 * 건기식 공전 원료 (현재 화면의 공전 원료·구분·검색 필터 적용)
 * 원료가 여러 공전 원료에 걸리면 공전 원료마다 한 행씩 적어 엑셀 필터로 골라 보기 쉽게 한다.
 * 두 번째 시트는 공전 원료 기준표와 단가 확보/미확보 건수.
 */
export async function exportFunctionalStandards(filter: { standardId?: string; sourceType?: string; search?: string } = {}) {
  const params = new URLSearchParams({ page: "1", limit: "100000" });
  if (filter.standardId) params.set("standardId", filter.standardId);
  if (filter.sourceType) params.set("sourceType", filter.sourceType);
  if (filter.search) params.set("search", filter.search);
  const [standards, list] = await Promise.all([
    getJson("/api/functional-standards"),
    getJson(`/api/functional-standards/materials?${params}`),
  ]);
  const byId = new Map<string, Row>(standards.map((s: Row) => [s.id, s]));
  const content = (c: Row | null) => {
    if (c?.amount == null) return "없음";
    const range = `${c.amount}${c.amountMax != null ? `~${c.amountMax}` : ""}`;
    return `${range}${c.unit === "Brix" ? " Brix" : c.unit ?? ""}${c.qualifier ? ` ${c.qualifier}` : ""}`;
  };
  const rows: Cell[][] = [];
  for (const r of list as Row[]) {
    const ids: string[] = filter.standardId ? [filter.standardId] : r.standardIds;
    for (const id of ids) {
      const s = byId.get(id);
      rows.push([
        s?.code, s?.name, s?.group, s?.component,
        r.sourceType === "material" ? "확보" : "미확보", r.sourceType === "material" ? "원료" : "취급품목",
        r.materialCode, r.name, r.supplier, r.category, r.unitPrice, r.unit,
        r.content?.component, content(r.content), r.specification,
      ]);
    }
  }
  download("건기식공전원료", [
    {
      name: "공전 원료",
      headers: ["공전번호", "공전 원료", "공전 구분", "기능(지표)성분", "단가", "구분", "원료코드", "원료명", "공급사", "분류", "단가(원)", "단위", "지표성분(규격)", "함유량", "규격 원문"],
      rows,
    },
    {
      name: "공전 기준표",
      headers: ["공전번호", "공전 원료", "구분", "기능(지표)성분", "단가 확보(건)", "단가 미확보(건)", "매칭 키워드", "제외 키워드", "비고"],
      rows: standards.map((s: Row) => [
        s.code, s.name, s.group, s.component, s.counts?.material ?? 0, s.counts?.catalog ?? 0, s.keywords, s.excludes, s.note,
      ]),
    },
  ]);
  return rows.length;
}

/** 부자재 세트 — 세트 요약 시트 + 구성 품목 시트 */
export async function exportPackagingSets(search = "") {
  const sets = await getJson(`/api/packaging/sets?search=${encodeURIComponent(search)}`);
  const lineAmount = (i: Row) => (i.isFreeIssue ? 0 : i.unitPrice * (i.qtyPerUnit || 1));
  download("부자재세트", [
    {
      name: "세트 목록",
      headers: ["세트코드", "세트명", "제형", "용량", "단위", "업체", "품목수", "세트 단가(원)", "기준일", "현행", "출처", "비고"],
      rows: sets.map((s: Row) => [
        s.code, s.name, s.formName, s.capacity, s.capacityUnit, s.vendorName, s.items.length,
        s.items.reduce((sum: number, i: Row) => sum + lineAmount(i), 0),
        date(s.effectiveDate), yn(s.isCurrent), s.sourceFile, s.note,
      ]),
    },
    {
      name: "구성 품목",
      headers: ["세트코드", "세트명", "품목", "규격", "단가(원)", "수량", "금액(원)", "사급", "비고"],
      rows: sets.flatMap((s: Row) =>
        s.items.map((i: Row) => [
          s.code, s.name, i.name, i.spec, i.unitPrice, i.qtyPerUnit, lineAmount(i), yn(i.isFreeIssue), i.note,
        ]),
      ),
    },
  ]);
  return sets.length;
}

const COST_BASIS: Record<string, string> = { per_unit: "개당", per_case: "case당", per_bottle: "병당", per_tablet: "정당" };
const SUPPLY_MODE: Record<string, string> = { bulk: "벌크", semi: "반제품", finished: "완제품" };

/** 임가공비 단가 전체 */
export async function exportTollingRates(search = "") {
  const list = await getJson(`/api/tolling/rates?search=${encodeURIComponent(search)}`);
  download("임가공비단가", [{
    name: "임가공비 단가",
    headers: ["업체", "제형/유형", "제형코드", "규격", "규격최소", "규격최대", "규격단위", "수량 시작", "수량 끝", "단가(원)", "단가기준", "납품방식", "납품가", "자사마진", "이윤포함", "VAT포함", "협의가능", "대외비", "기준일", "현행", "출처", "비고"],
    rows: list.map((r: Row) => [
      r.vendorName, r.formName, r.formCode, r.specLabel, r.specMin, r.specMax, r.specUnit,
      r.qtyMin, r.qtyMax ?? "이상", r.unitCost, COST_BASIS[r.costBasis] || r.costBasis,
      SUPPLY_MODE[r.supplyMode] || r.supplyMode, r.vendorPrice, r.ownMargin,
      yn(r.includesProfit), yn(r.includesVat), yn(r.isNegotiable), yn(r.isConfidential),
      date(r.effectiveDate), yn(r.isCurrent), r.sourceFile, r.note,
    ]),
  }]);
  return list.length;
}

/** 가공비 — 제품유형별 현재 가공비 + 변경 이력 */
export async function exportProcessingCosts() {
  const [types, history] = await Promise.all([
    getJson("/api/product-types?all=true"),
    getJson("/api/processing-costs?all=true"),
  ]);
  download("가공비", [
    {
      name: "현재 가공비",
      headers: ["코드", "제품유형", "분류", "현재 가공비(원)"],
      rows: types.map((t: Row) => [t.code, t.name, t.category, t.processingCost]),
    },
    {
      name: "변경 이력",
      headers: ["변경일시", "제품유형", "가공비(원)", "상태", "변경자", "사유"],
      rows: history.map((h: Row) => [
        new Date(h.effectiveDate).toLocaleString("ko-KR"), h.productType?.name, h.cost,
        h.isCurrent ? "현재" : "이전", h.changedBy, h.changeReason,
      ]),
    },
  ]);
  return types.length;
}
