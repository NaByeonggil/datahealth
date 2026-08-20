import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import XLSX from "xlsx-js-style";
import {
  calculateDetailedQuotation,
  calcUnitWeight,
  calcTotalWeight,
  DetailedQuotationCalcInput,
} from "@/lib/quotation/calculateDetailed";

export interface ExportData extends DetailedQuotationCalcInput {
  quotationNo?: string;
  productName?: string;
  customerName?: string | null;
  productType?: string;
  formType?: string | null;
  intakeGuide?: string | null;
  packagingMethod?: string | null;
  note?: string | null;
  materials?: Array<{
    materialName?: string | null;
    specification?: string | null;
    mixRatio?: number;
    contentMg?: number;
    inputKg?: number;
    unitPrice?: number;
    totalPrice?: number;
    functionalContent?: string | null;
    note?: string | null;
  }>;
  supplies?: Array<{
    supplyName?: string | null;
    specification?: string | null;
    quantity?: number;
    inputQty?: number;
    unitPrice?: number;
    totalPrice?: number;
    note?: string | null;
  }>;
  processes?: Array<{
    processName?: string | null;
    quantity?: number;
    unitCost?: number;
    totalCost?: number;
    note?: string | null;
  }>;
  overheads?: Array<{ name?: string | null; amount?: number; note?: string | null }>;
}

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const fmtDec = (n: number, d = 2) =>
  n.toLocaleString("ko-KR", { maximumFractionDigits: d });
const blank = (n: number) => Array(n).fill("");

/** 화면/저장/출력이 같은 숫자를 쓰도록 계산은 항상 여기서 한 번만 한다 */
function computed(data: ExportData) {
  return {
    totals: calculateDetailedQuotation(data),
    unitWeight: calcUnitWeight(data.contentAmount, data.packageUnit),
    totalWeight: calcTotalWeight(data.contentAmount, data.productionQty, data.lossRate),
  };
}

const COLS = 10;

export function exportToExcel(data: ExportData) {
  const { totals: t, unitWeight, totalWeight } = computed(data);
  const materials = data.materials || [];
  const supplies = data.supplies || [];
  const processes = data.processes || [];
  const overheads = data.overheads || [];

  const rows: (string | number | null)[][] = [];
  const sectionRows: number[] = [];
  const headerRows: number[] = [];
  const totalRows: number[] = [];
  const highlightRows: number[] = [];
  const push = (row: (string | number | null)[]) => rows.push(row) - 1;

  push(["제품 원가견적서", ...blank(COLS - 1)]);
  push([
    "제 품 명", data.productName || "", "", "",
    "내 용 량", data.contentAmount ?? "", "포장단위", data.packageUnit ?? "",
    "견적번호", data.quotationNo || "",
  ]);
  push([
    "제품유형", data.productType || "", "제형", data.formType || "",
    "섭취량", data.intakeGuide || "", "", "", "고객사", data.customerName || "",
  ]);
  headerRows.push(
    push(["제조단위", "단위중량(CASE)", "총중량(kg)", "로스율", "수율(%)", "이론수량", "실제수량(case)", "포장방법", "", ""])
  );
  push([
    data.productionQty ?? 0, unitWeight, totalWeight, data.lossRate ?? 1.1,
    data.yieldRate ?? 0, t.theoreticalQty, t.caseQty, data.packagingMethod || "", "", "",
  ]);
  push(blank(COLS));

  // 1. 원료비
  sectionRows.push(push(["1. 원료비 (성분 및 배합비율)", ...blank(COLS - 1)]));
  headerRows.push(
    push(["No.", "원 료 명", "규격", "배합비율(%)", "함량(mg)", "투입량(kg)", "단가(원/kg)", "총합계", "기능성함량", "비고"])
  );
  materials.forEach((m, i) => {
    push([
      i + 1, m.materialName || "", m.specification || "", m.mixRatio ?? 0, m.contentMg ?? 0,
      m.inputKg ?? 0, m.unitPrice ?? 0, m.totalPrice ?? 0, m.functionalContent || "", m.note || "",
    ]);
  });
  totalRows.push(
    push([
      "", "합 계", "",
      materials.reduce((s, m) => s + (m.mixRatio || 0), 0),
      materials.reduce((s, m) => s + (m.contentMg || 0), 0),
      materials.reduce((s, m) => s + (m.inputKg || 0), 0),
      "", t.materialCost, `${fmtDec(t.materialPerCase)} 원/case`, "",
    ])
  );
  push(blank(COLS));

  // 2. 자재비
  sectionRows.push(push(["2. 자재비", ...blank(COLS - 1)]));
  headerRows.push(
    push(["No.", "자 재 명", "규격", "함량(개)", "투입량(개)", "단가(원)", "금액(원)", "비고", "", ""])
  );
  supplies.forEach((m, i) => {
    push([
      i + 1, m.supplyName || "", m.specification || "", m.quantity ?? 0, m.inputQty ?? 0,
      m.unitPrice ?? 0, m.totalPrice ?? 0, m.note || "", "", "",
    ]);
  });
  totalRows.push(
    push(["", "소 계", "", "", "", "", t.supplyCost, `${fmtDec(t.supplyPerCase)} 원/case`, "", ""])
  );
  push(blank(COLS));

  // 3. 직접제조비
  sectionRows.push(push(["3. 직접제조비 (공정비)", ...blank(COLS - 1)]));
  headerRows.push(
    push(["No.", "작 업 공 정 명", "수량(case)", "공정단가", "총공정비", "비고", "", "", "", ""])
  );
  processes.forEach((p, i) => {
    push([i + 1, p.processName || "", p.quantity ?? 0, p.unitCost ?? 0, p.totalCost ?? 0, p.note || "", "", "", "", ""]);
  });
  totalRows.push(
    push(["", "소 계", "", "", t.processCost, `${fmtDec(t.processPerCase)} 원/case`, "", "", "", ""])
  );
  push(blank(COLS));

  // 4. 간접제조비
  sectionRows.push(push(["4. 간접제조비", ...blank(COLS - 1)]));
  headerRows.push(push(["No.", "내 용", "금액(원)", "비고", "", "", "", "", "", ""]));
  overheads.forEach((o, i) => {
    push([i + 1, o.name || "", o.amount ?? 0, o.note || "", "", "", "", "", "", ""]);
  });
  totalRows.push(
    push(["", "소 계", t.overheadCost, `${fmtDec(t.overheadPerCase)} 원/case`, "", "", "", "", "", ""])
  );
  push(blank(COLS));

  // 종합원가 산출내역
  sectionRows.push(
    push([`종합원가 산출내역 (실제수량 ${fmt(t.caseQty)} case 기준)`, ...blank(COLS - 1)])
  );
  headerRows.push(push(["항 목", "1 case 금액", "총 액", "", "", "", "", "", "", ""]));
  push(["1. 원료비", t.materialPerCase, t.materialCost, ...blank(7)]);
  push(["2. 자재비", t.supplyPerCase, t.supplyCost, ...blank(7)]);
  push(["3. 직접제조비", t.processPerCase, t.processCost, ...blank(7)]);
  push(["4. 간접제조비", t.overheadPerCase, t.overheadCost, ...blank(7)]);
  totalRows.push(push(["5. 소계 (원가)", t.costPerCase, t.totalCostAmount, ...blank(7)]));
  push([`6. 기업이윤 (${data.profitRate ?? 0}%)`, t.profitPerCase, t.totalProfitAmount, ...blank(7)]);
  highlightRows.push(
    push(["7. 합계 (VAT 별도)", t.pricePerCaseExVat, t.totalAmountExVat, ...blank(7)])
  );
  push([`8. 1case 납품 예상가 (VAT 포함)`, t.finalUnitPrice, "", ...blank(7)]);
  highlightRows.push(
    push(["9. 총납품 예상가 (VAT 포함)", t.finalUnitPrice, t.totalAmount, ...blank(7)])
  );

  if (data.note) {
    push(blank(COLS));
    sectionRows.push(push(["비고", ...blank(COLS - 1)]));
    push([data.note, ...blank(COLS - 1)]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 6 }, { wch: 24 }, { wch: 14 }, { wch: 13 }, { wch: 13 },
    { wch: 13 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } }];

  const thinBorder = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };
  const yellowBg = { fgColor: { rgb: "FEF3C7" } };
  const orangeBg = { fgColor: { rgb: "FED7AA" } };
  const grayBg = { fgColor: { rgb: "F3F4F6" } };

  const styleOf = (r: number, c: number) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { t: "s", v: "" };
    if (!ws[ref].s) ws[ref].s = {};
    return ws[ref].s as Record<string, unknown>;
  };

  rows.forEach((row, r) => {
    const isBlank = row.every((v) => v === "" || v === null);
    for (let c = 0; c < COLS; c++) {
      const st = styleOf(r, c);
      if (!isBlank) st.border = thinBorder;
      if (typeof row[c] === "number") st.alignment = { horizontal: "right", vertical: "center" };
      if (r === 0) {
        st.fill = yellowBg;
        st.font = { bold: true, sz: 16 };
        st.alignment = { horizontal: "center", vertical: "center" };
      }
      if (sectionRows.includes(r)) {
        st.fill = yellowBg;
        st.font = { bold: true };
      }
      if (headerRows.includes(r)) {
        st.fill = orangeBg;
        st.font = { bold: true };
        st.alignment = { horizontal: "center", vertical: "center" };
      }
      if (totalRows.includes(r)) {
        st.fill = grayBg;
        st.font = { bold: true };
      }
      if (highlightRows.includes(r)) {
        st.fill = yellowBg;
        st.font = { bold: true };
      }
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, "제품원가견적서");

  const fileName = `제품원가견적서_${data.productName || "견적"}_${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export async function exportToPDF(data: ExportData) {
  const { totals: t, unitWeight, totalWeight } = computed(data);
  const materials = data.materials || [];
  const supplies = data.supplies || [];
  const processes = data.processes || [];
  const overheads = data.overheads || [];

  const container = document.createElement("div");
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 900px;
    padding: 20px;
    background: white;
    font-family: 'Noto Sans KR', sans-serif;
  `;

  container.innerHTML = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .container { font-family: 'Noto Sans KR', sans-serif; font-size: 11px; }
      .title { font-size: 18px; font-weight: bold; text-align: center; padding: 10px; background: #fef3c7; border: 1px solid #000; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
      .header-yellow { background: #fef3c7; font-weight: bold; }
      .header-orange { background: #fed7aa; font-weight: bold; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .text-bold { font-weight: bold; }
      .section-title { background: #fef3c7; font-weight: bold; }
      .total-row { background: #f3f4f6; font-weight: bold; }
      .spacer td { border: none; height: 10px; }
    </style>

    <div class="container">
      <table>
        <tr><td colspan="10" class="title">제품 원가견적서</td></tr>

        <tr>
          <td class="header-yellow">제 품 명</td>
          <td colspan="3">${data.productName || ""}</td>
          <td class="header-yellow">내 용 량</td>
          <td class="text-center">${data.contentAmount ?? ""} g</td>
          <td class="header-yellow">포장단위</td>
          <td class="text-center">${data.packageUnit ?? ""}</td>
          <td class="header-yellow">견적번호</td>
          <td class="text-center">${data.quotationNo || ""}</td>
        </tr>
        <tr>
          <td class="header-yellow">제품유형</td>
          <td>${data.productType || ""}</td>
          <td class="header-yellow">제형</td>
          <td>${data.formType || ""}</td>
          <td class="header-yellow">섭취량</td>
          <td colspan="3">${data.intakeGuide || ""}</td>
          <td class="header-yellow">고객사</td>
          <td>${data.customerName || ""}</td>
        </tr>
        <tr>
          <td class="header-yellow text-center">제조단위</td>
          <td class="header-yellow text-center">단위중량(CASE)</td>
          <td class="header-yellow text-center">총중량(kg)</td>
          <td class="header-yellow text-center">로스율</td>
          <td class="header-yellow text-center">수율(%)</td>
          <td class="header-yellow text-center">이론수량</td>
          <td class="header-yellow text-center">실제수량(case)</td>
          <td class="header-yellow text-center" colspan="3">포장방법</td>
        </tr>
        <tr>
          <td class="text-center">${fmt(Number(data.productionQty) || 0)} 개</td>
          <td class="text-center">${fmtDec(unitWeight)} g</td>
          <td class="text-center">${fmtDec(totalWeight, 3)}</td>
          <td class="text-center">${data.lossRate ?? 1.1}</td>
          <td class="text-center">${data.yieldRate ?? 0} %</td>
          <td class="text-center">${fmt(t.theoreticalQty)}</td>
          <td class="text-center">${fmt(t.caseQty)}</td>
          <td class="text-center" colspan="3">${data.packagingMethod || ""}</td>
        </tr>

        <tr class="spacer"><td colspan="10"></td></tr>

        <tr><td colspan="10" class="section-title">1. 원료비 (성분 및 배합비율)</td></tr>
        <tr>
          <td class="header-orange text-center">No.</td>
          <td class="header-orange" colspan="2">원 료 명</td>
          <td class="header-orange text-center">배합비율(%)</td>
          <td class="header-orange text-center">함량(mg)</td>
          <td class="header-orange text-center">투입량(kg)</td>
          <td class="header-orange text-center">단가(원/kg)</td>
          <td class="header-orange text-center">총합계</td>
          <td class="header-orange text-center" colspan="2">기능성함량</td>
        </tr>
        ${materials
          .map(
            (m, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td colspan="2">${m.materialName || ""}</td>
          <td class="text-right">${m.mixRatio ? fmtDec(m.mixRatio, 4) : ""}</td>
          <td class="text-right">${m.contentMg ? fmtDec(m.contentMg, 3) : ""}</td>
          <td class="text-right">${m.inputKg ? fmtDec(m.inputKg, 3) : ""}</td>
          <td class="text-right">${m.unitPrice ? fmt(m.unitPrice) : ""}</td>
          <td class="text-right">${m.totalPrice ? fmt(m.totalPrice) : ""}</td>
          <td colspan="2">${m.functionalContent || ""}</td>
        </tr>`
          )
          .join("")}
        <tr class="total-row">
          <td colspan="3" class="text-center">합 계</td>
          <td class="text-right">${fmtDec(materials.reduce((s, m) => s + (m.mixRatio || 0), 0), 4)}</td>
          <td class="text-right">${fmtDec(materials.reduce((s, m) => s + (m.contentMg || 0), 0), 2)}</td>
          <td class="text-right">${fmtDec(materials.reduce((s, m) => s + (m.inputKg || 0), 0), 3)}</td>
          <td></td>
          <td class="text-right">${fmt(t.materialCost)}</td>
          <td colspan="2" class="text-right">${fmtDec(t.materialPerCase)} 원/case</td>
        </tr>

        <tr class="spacer"><td colspan="10"></td></tr>

        <tr><td colspan="10" class="section-title">2. 자재비</td></tr>
        <tr>
          <td class="header-orange text-center">No.</td>
          <td class="header-orange" colspan="2">자 재 명</td>
          <td class="header-orange text-center">규격</td>
          <td class="header-orange text-center">함량(개)</td>
          <td class="header-orange text-center">투입량(개)</td>
          <td class="header-orange text-center">단가(원)</td>
          <td class="header-orange text-center">금액(원)</td>
          <td class="header-orange text-center" colspan="2">비고</td>
        </tr>
        ${supplies
          .map(
            (m, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td colspan="2">${m.supplyName || ""}</td>
          <td class="text-center">${m.specification || ""}</td>
          <td class="text-right">${m.quantity ? fmt(m.quantity) : ""}</td>
          <td class="text-right">${m.inputQty ? fmt(m.inputQty) : ""}</td>
          <td class="text-right">${m.unitPrice ? fmt(m.unitPrice) : ""}</td>
          <td class="text-right">${m.totalPrice ? fmt(m.totalPrice) : ""}</td>
          <td colspan="2">${m.note || ""}</td>
        </tr>`
          )
          .join("")}
        <tr class="total-row">
          <td colspan="7" class="text-center">소 계</td>
          <td class="text-right">${fmt(t.supplyCost)}</td>
          <td colspan="2" class="text-right">${fmtDec(t.supplyPerCase)} 원/case</td>
        </tr>

        <tr class="spacer"><td colspan="10"></td></tr>

        <tr>
          <td colspan="5" class="section-title">3. 직접제조비</td>
          <td colspan="5" class="section-title">4. 간접제조비</td>
        </tr>
        <tr>
          <td class="header-orange" colspan="2">작 업 공 정 명</td>
          <td class="header-orange text-center">수량(case)</td>
          <td class="header-orange text-center">공정단가</td>
          <td class="header-orange text-center">총공정비</td>
          <td class="header-orange" colspan="2">내 용</td>
          <td class="header-orange text-center">금액</td>
          <td class="header-orange text-center" colspan="2">비고</td>
        </tr>
        ${Array.from({ length: Math.max(processes.length, overheads.length) })
          .map((_, i) => {
            const p = processes[i];
            const o = overheads[i];
            return `
        <tr>
          <td colspan="2">${p?.processName || ""}</td>
          <td class="text-right">${p?.quantity ? fmt(p.quantity) : ""}</td>
          <td class="text-right">${p?.unitCost ? fmt(p.unitCost) : ""}</td>
          <td class="text-right">${p?.totalCost ? fmt(p.totalCost) : ""}</td>
          <td colspan="2">${o?.name || ""}</td>
          <td class="text-right">${o?.amount ? fmt(o.amount) : ""}</td>
          <td colspan="2">${o?.note || ""}</td>
        </tr>`;
          })
          .join("")}
        <tr class="total-row">
          <td colspan="4" class="text-center">소 계</td>
          <td class="text-right">${fmt(t.processCost)}</td>
          <td colspan="2" class="text-center">소 계</td>
          <td class="text-right">${fmt(t.overheadCost)}</td>
          <td colspan="2"></td>
        </tr>

        <tr class="spacer"><td colspan="10"></td></tr>

        <tr>
          <td colspan="10" class="section-title">종합원가 산출내역 (실제수량 ${fmt(t.caseQty)} case 기준)</td>
        </tr>
        <tr>
          <td class="header-orange" colspan="4">항 목</td>
          <td class="header-orange text-center" colspan="3">1 case 금액</td>
          <td class="header-orange text-center" colspan="3">총 액</td>
        </tr>
        ${[
          ["1. 원료비", t.materialPerCase, t.materialCost],
          ["2. 자재비", t.supplyPerCase, t.supplyCost],
          ["3. 직접제조비", t.processPerCase, t.processCost],
          ["4. 간접제조비", t.overheadPerCase, t.overheadCost],
        ]
          .map(
            ([label, perCase, total]) => `
        <tr>
          <td colspan="4">${label}</td>
          <td class="text-right" colspan="3">${fmtDec(perCase as number)}</td>
          <td class="text-right" colspan="3">${fmt(total as number)}</td>
        </tr>`
          )
          .join("")}
        <tr class="total-row">
          <td colspan="4">5. 소계 (원가)</td>
          <td class="text-right" colspan="3">${fmtDec(t.costPerCase)}</td>
          <td class="text-right" colspan="3">${fmt(t.totalCostAmount)}</td>
        </tr>
        <tr>
          <td colspan="4">6. 기업이윤 (${data.profitRate ?? 0}%)</td>
          <td class="text-right" colspan="3">${fmtDec(t.profitPerCase)}</td>
          <td class="text-right" colspan="3">${fmt(t.totalProfitAmount)}</td>
        </tr>
        <tr class="header-yellow">
          <td colspan="4">7. 합계 (VAT 별도)</td>
          <td class="text-right" colspan="3">${fmtDec(t.pricePerCaseExVat)}</td>
          <td class="text-right" colspan="3">${fmt(t.totalAmountExVat)}</td>
        </tr>
        <tr>
          <td colspan="4">8. 1case 납품 예상가 (VAT 포함)</td>
          <td class="text-right" colspan="3">${fmt(t.finalUnitPrice)}</td>
          <td class="text-right" colspan="3"></td>
        </tr>
        <tr class="header-yellow">
          <td colspan="4" class="text-bold">9. 총납품 예상가 (VAT 포함)</td>
          <td class="text-right text-bold" colspan="3">${fmt(t.finalUnitPrice)}</td>
          <td class="text-right text-bold" colspan="3">${fmt(t.totalAmount)}</td>
        </tr>
        ${
          data.note
            ? `<tr class="spacer"><td colspan="10"></td></tr>
        <tr><td colspan="10" class="section-title">비고</td></tr>
        <tr><td colspan="10">${data.note}</td></tr>`
            : ""
        }
      </table>

      <div style="margin-top: 15px; font-size: 10px; color: #666; text-align: right;">
        생성일: ${new Date().toLocaleDateString("ko-KR")}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      foreignObjectRendering: false,
      removeContainer: true,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll("*").forEach((el) => {
          const htmlEl = el as HTMLElement;
          const computedStyle = window.getComputedStyle(htmlEl);
          if (computedStyle.backgroundColor.includes("lab")) htmlEl.style.backgroundColor = "#ffffff";
          if (computedStyle.color.includes("lab")) htmlEl.style.color = "#1a1a1a";
          if (computedStyle.borderColor.includes("lab")) htmlEl.style.borderColor = "#000000";
        });
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
    const imgX = (pdfWidth - canvas.width * ratio) / 2;

    pdf.addImage(imgData, "PNG", imgX, 5, canvas.width * ratio, canvas.height * ratio);

    const fileName = `제품원가견적서_${data.productName || "견적"}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}
