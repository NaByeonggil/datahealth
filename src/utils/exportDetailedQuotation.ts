import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import XLSX from "xlsx-js-style";

interface ExportData {
  quotationNo: string;
  productName: string;
  customerName: string;
  productType: string;
  formType: string;
  contentAmount: string | number;
  packageUnit: string | number;
  intakeGuide: string;
  productionQty: number;
  unitWeight: number;
  totalWeight: number;
  yieldRate: number;
  actualQty: number;
  packagingMethod: string;
  materials: Array<{
    materialName: string;
    specification?: string | null;
    mixRatio: number;
    contentMg: number;
    inputKg: number;
    unitPrice: number;
    totalPrice: number;
    functionalContent?: string | null;
  }>;
  supplies: Array<{
    supplyName: string;
    specification?: string | null;
    quantity: number;
    inputQty: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  processes: Array<{
    processName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  inspectionCost: number;
  managementCost: number;
  deliveryCost: number;
  designCost: number;
  profitRate: number;
  note: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

export function exportToExcel(data: ExportData) {
  const workbook = XLSX.utils.book_new();

  // 계산
  const totalMaterialCost = data.materials.reduce((sum, m) => sum + m.totalPrice, 0);
  const totalSupplyCost = data.supplies.reduce((sum, m) => sum + m.totalPrice, 0);
  const processQty = data.processes[0]?.quantity || 0;
  const processUnitCost = data.processes[0]?.unitCost || 0;
  const processTotalCost = processQty * processUnitCost;
  const totalIndirectCost = data.inspectionCost + data.managementCost + data.deliveryCost + data.designCost;
  const totalCost = totalMaterialCost + totalSupplyCost + processTotalCost + totalIndirectCost;
  const profitAmount = totalCost * (data.profitRate / 100);
  const finalAmount = totalCost + profitAmount;
  const perCaseAmount = data.productionQty ? finalAmount / data.productionQty : 0;

  // 단일 시트로 이미지 양식에 맞게 구성
  const sheetData: (string | number | null)[][] = [
    // 제목
    ["", "제품 원가견적서", "", "", "", "", "", "", "", ""],
    // 기본 정보 헤더
    ["제 품 명", data.productName, "", "", "내 용 량", data.contentAmount, "", "포장단위", data.packageUnit, ""],
    ["제 품 유 형", data.productType, "", "제형", data.formType, "", "섭취량", data.intakeGuide, "", ""],
    // 제조 정보
    ["제조단위", "단위중량(CASE)", "", "총중량(kg)", "", "이윤율(%)", "", "실제수량", "", "포장방법"],
    [data.productionQty + " 개", data.unitWeight + " g", "", data.totalWeight, "", data.yieldRate + " %", "", data.actualQty + " set", "", data.packagingMethod],
    // 빈 줄
    [],
    // 1. 원료비 헤더
    ["1. 원료비(성분/물질/배합/비율)", "", "", "", "", "", "", "", "", ""],
    ["No.", "원 료 명", "", "배합비(%)", "함량(g)", "투입량", "단가", "총합계", "비고", ""],
  ];

  // 원료 데이터 추가
  data.materials.forEach((m, i) => {
    sheetData.push([
      i + 1,
      m.materialName,
      "",
      m.mixRatio || "",
      m.contentMg || "",
      m.inputKg || "",
      m.unitPrice || "",
      m.totalPrice || "",
      m.functionalContent || "",
      "",
    ]);
  });

  // 빈 행 추가 (최소 10행 확보)
  const emptyMaterialRows = Math.max(0, 10 - data.materials.length);
  for (let i = 0; i < emptyMaterialRows; i++) {
    sheetData.push(["", "", "", "", "", "", "", "", "", ""]);
  }

  // 원료비 합계
  sheetData.push(["", "합 계", "", "", "", "", "", totalMaterialCost, "", ""]);
  sheetData.push([]);

  // 2. 자재비 헤더
  sheetData.push(["2. 자재비", "", "", "", "", "", "", "", "", ""]);
  sheetData.push(["", "자 재 명", "규 격", "수량", "단가(원/g)", "투입량", "단가", "금액", "", ""]);

  // 자재 데이터 추가
  data.supplies.forEach((m) => {
    sheetData.push([
      "",
      m.supplyName,
      m.specification || "",
      m.quantity || "",
      "",
      m.inputQty || "",
      m.unitPrice || "",
      m.totalPrice || "",
      "",
      "",
    ]);
  });

  // 자재비 소계
  sheetData.push(["", "", "", "", "소 계", "", "", totalSupplyCost, "", ""]);
  sheetData.push([]);

  // 3. 직접제조비 헤더
  sheetData.push(["3. 직접제조비", "", "", "", "", "", "", "", "공정비", ""]);
  sheetData.push(["", "작 업 공 정 명", "", "수량(case)", "", "공정단가(원/g)", "", "총공정비", "", ""]);

  // 직접제조비 데이터
  const processNames = ["칭량", "혼합", "스틱충진", "선별", "포장"];
  processNames.forEach((name, i) => {
    sheetData.push([
      "",
      name,
      "",
      i === 2 ? processQty + " set" : "",
      "",
      i === 2 ? processUnitCost : "",
      "",
      i === 2 ? processTotalCost : "",
      "",
      "",
    ]);
  });
  sheetData.push([]);

  // 4. 간접제조원가 헤더
  sheetData.push(["4. 간접제조비", "", "", "", "", "", "종합원가(+α)예상 제조비", "", "", ""]);
  sheetData.push(["", "검사비", data.inspectionCost, "", "", "", "1. 원료비", totalMaterialCost, "", ""]);
  sheetData.push(["", "관리비", data.managementCost, "", "", "", "2. 자재비", totalSupplyCost, "", ""]);
  sheetData.push(["", "운반비", data.deliveryCost, "", "", "", "3. 직접제조비", processTotalCost, "", ""]);
  sheetData.push(["", "디자인비용", data.designCost, "", "", "", "4. 간접제조비", totalIndirectCost, "", ""]);
  sheetData.push(["", "소 계", totalIndirectCost, "", "", "", "5. 소계", totalCost, "", ""]);
  sheetData.push(["", "", "", "", "", "", "6. 기업이윤(" + data.profitRate + "%)", profitAmount, "", ""]);
  sheetData.push(["", "", "", "", "", "", "7. 합계(VAT별도)", finalAmount, "", ""]);
  sheetData.push(["", "", "", "", "", "", "8. 1case 납품예상가(VAT별도)", perCaseAmount, "", ""]);
  sheetData.push(["", "", "", "", "", "", "9. 총납품예상가(VAT별도)", finalAmount, "", ""]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // 컬럼 너비 설정
  ws["!cols"] = [
    { wch: 5 },   // A
    { wch: 20 },  // B
    { wch: 10 },  // C
    { wch: 12 },  // D
    { wch: 12 },  // E
    { wch: 12 },  // F
    { wch: 25 },  // G
    { wch: 15 },  // H
    { wch: 10 },  // I
    { wch: 10 },  // J
  ];

  // 셀 병합 설정
  ws["!merges"] = [
    // 제목 병합
    { s: { r: 0, c: 1 }, e: { r: 0, c: 8 } },
    // 제품명 병합
    { s: { r: 1, c: 1 }, e: { r: 1, c: 3 } },
    // 원료비 헤더 병합
    { s: { r: 6, c: 0 }, e: { r: 6, c: 8 } },
  ];

  // 스타일 정의
  const yellowBg = { fgColor: { rgb: "FEF3C7" } };
  const orangeBg = { fgColor: { rgb: "FED7AA" } };
  const grayBg = { fgColor: { rgb: "F3F4F6" } };
  const thinBorder = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };
  const centerAlign = { horizontal: "center", vertical: "center" };
  const rightAlign = { horizontal: "right", vertical: "center" };
  const boldFont = { bold: true };
  const titleFont = { bold: true, sz: 16 };

  // 셀 스타일 적용 헬퍼 함수
  const applyStyle = (cell: string, style: Record<string, unknown>) => {
    if (!ws[cell]) ws[cell] = { v: "" };
    ws[cell].s = { ...ws[cell].s, ...style };
  };

  // 제목 스타일 (행 0)
  for (let c = 0; c <= 9; c++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c });
    applyStyle(cell, { fill: yellowBg, border: thinBorder, font: titleFont, alignment: centerAlign });
  }

  // 기본 정보 헤더 스타일 (행 1-2) - 노란색
  const yellowHeaderCells1 = ["A2", "E2", "H2"]; // 제품명, 내용량, 포장단위
  const yellowHeaderCells2 = ["A3", "C3", "E3"]; // 제품유형, 제형, 섭취량
  const yellowHeaderCells3 = ["A4", "B4", "D4", "F4", "H4", "J4"]; // 제조정보 헤더

  yellowHeaderCells1.forEach(cell => {
    applyStyle(cell, { fill: yellowBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  });
  yellowHeaderCells2.forEach(cell => {
    applyStyle(cell, { fill: yellowBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  });
  yellowHeaderCells3.forEach(cell => {
    applyStyle(cell, { fill: yellowBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  });

  // 기본 정보 값 셀에 테두리 적용
  for (let r = 1; r <= 4; r++) {
    for (let c = 0; c <= 9; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (!ws[cell]) ws[cell] = { v: "" };
      if (!ws[cell].s) ws[cell].s = {};
      ws[cell].s.border = thinBorder;
    }
  }

  // 원료비 섹션 헤더 (행 6) - 노란색
  const materialHeaderRow = 6;
  for (let c = 0; c <= 9; c++) {
    const cell = XLSX.utils.encode_cell({ r: materialHeaderRow, c });
    applyStyle(cell, { fill: yellowBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  }

  // 원료비 테이블 헤더 (행 7) - 주황색
  const materialTableHeaderRow = 7;
  for (let c = 0; c <= 9; c++) {
    const cell = XLSX.utils.encode_cell({ r: materialTableHeaderRow, c });
    applyStyle(cell, { fill: orangeBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  }

  // 원료 데이터 및 합계 행에 테두리 적용
  const materialDataStartRow = 8;
  const materialRowCount = data.materials.length + emptyMaterialRows + 1; // +1 합계
  for (let r = materialDataStartRow; r < materialDataStartRow + materialRowCount; r++) {
    for (let c = 0; c <= 9; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (!ws[cell]) ws[cell] = { v: "" };
      if (!ws[cell].s) ws[cell].s = {};
      ws[cell].s.border = thinBorder;
      // 금액 컬럼 우측 정렬
      if (c >= 3 && c <= 7) {
        ws[cell].s.alignment = rightAlign;
      }
    }
  }

  // 원료비 합계 행 스타일
  const materialTotalRow = materialDataStartRow + data.materials.length + emptyMaterialRows;
  applyStyle(XLSX.utils.encode_cell({ r: materialTotalRow, c: 1 }), { fill: grayBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  applyStyle(XLSX.utils.encode_cell({ r: materialTotalRow, c: 7 }), { fill: grayBg, border: thinBorder, font: boldFont, alignment: rightAlign });

  // 자재비 섹션 계산
  const supplyHeaderRow = materialTotalRow + 2;
  const supplyTableHeaderRow = supplyHeaderRow + 1;
  const supplyDataStartRow = supplyTableHeaderRow + 1;

  // 자재비 섹션 헤더 - 노란색
  for (let c = 0; c <= 9; c++) {
    const cell = XLSX.utils.encode_cell({ r: supplyHeaderRow, c });
    applyStyle(cell, { fill: yellowBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  }

  // 자재비 테이블 헤더 - 주황색
  for (let c = 0; c <= 9; c++) {
    const cell = XLSX.utils.encode_cell({ r: supplyTableHeaderRow, c });
    applyStyle(cell, { fill: orangeBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  }

  // 자재 데이터 행에 테두리 적용
  for (let r = supplyDataStartRow; r < supplyDataStartRow + data.supplies.length + 1; r++) {
    for (let c = 0; c <= 9; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (!ws[cell]) ws[cell] = { v: "" };
      if (!ws[cell].s) ws[cell].s = {};
      ws[cell].s.border = thinBorder;
      if (c >= 3 && c <= 7) {
        ws[cell].s.alignment = rightAlign;
      }
    }
  }

  // 자재비 소계 행 스타일
  const supplyTotalRow = supplyDataStartRow + data.supplies.length;
  applyStyle(XLSX.utils.encode_cell({ r: supplyTotalRow, c: 4 }), { fill: grayBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  applyStyle(XLSX.utils.encode_cell({ r: supplyTotalRow, c: 7 }), { fill: grayBg, border: thinBorder, font: boldFont, alignment: rightAlign });

  // 직접제조비 섹션 계산
  const processHeaderRow = supplyTotalRow + 2;
  const processTableHeaderRow = processHeaderRow + 1;
  const processDataStartRow = processTableHeaderRow + 1;

  // 직접제조비 섹션 헤더 - 노란색
  for (let c = 0; c <= 9; c++) {
    const cell = XLSX.utils.encode_cell({ r: processHeaderRow, c });
    applyStyle(cell, { fill: yellowBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  }

  // 직접제조비 테이블 헤더 - 주황색
  for (let c = 0; c <= 9; c++) {
    const cell = XLSX.utils.encode_cell({ r: processTableHeaderRow, c });
    applyStyle(cell, { fill: orangeBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  }

  // 공정 데이터 행에 테두리 적용
  for (let r = processDataStartRow; r < processDataStartRow + 5; r++) {
    for (let c = 0; c <= 9; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (!ws[cell]) ws[cell] = { v: "" };
      if (!ws[cell].s) ws[cell].s = {};
      ws[cell].s.border = thinBorder;
    }
  }

  // 간접제조비 섹션 계산
  const indirectHeaderRow = processDataStartRow + 6;
  const indirectDataStartRow = indirectHeaderRow + 1;

  // 간접제조비 섹션 헤더 - 노란색
  for (let c = 0; c <= 9; c++) {
    const cell = XLSX.utils.encode_cell({ r: indirectHeaderRow, c });
    applyStyle(cell, { fill: yellowBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  }

  // 간접제조비 및 종합원가 데이터 행에 테두리 적용
  for (let r = indirectDataStartRow; r < indirectDataStartRow + 9; r++) {
    for (let c = 0; c <= 9; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (!ws[cell]) ws[cell] = { v: "" };
      if (!ws[cell].s) ws[cell].s = {};
      ws[cell].s.border = thinBorder;
    }
  }

  // 간접제조비 소계 행 스타일
  const indirectTotalRow = indirectDataStartRow + 4;
  applyStyle(XLSX.utils.encode_cell({ r: indirectTotalRow, c: 1 }), { fill: grayBg, border: thinBorder, font: boldFont, alignment: centerAlign });
  applyStyle(XLSX.utils.encode_cell({ r: indirectTotalRow, c: 2 }), { fill: grayBg, border: thinBorder, font: boldFont, alignment: rightAlign });

  // 종합원가 소계 및 합계 행 스타일
  applyStyle(XLSX.utils.encode_cell({ r: indirectTotalRow, c: 6 }), { fill: grayBg, border: thinBorder, font: boldFont });
  applyStyle(XLSX.utils.encode_cell({ r: indirectTotalRow, c: 7 }), { fill: grayBg, border: thinBorder, font: boldFont, alignment: rightAlign });

  // 합계(VAT별도) 행 노란색
  const totalVatRow = indirectDataStartRow + 6;
  applyStyle(XLSX.utils.encode_cell({ r: totalVatRow, c: 6 }), { fill: yellowBg, border: thinBorder, font: boldFont });
  applyStyle(XLSX.utils.encode_cell({ r: totalVatRow, c: 7 }), { fill: yellowBg, border: thinBorder, font: boldFont, alignment: rightAlign });

  // 총납품예상가 행 노란색
  const finalTotalRow = indirectDataStartRow + 8;
  applyStyle(XLSX.utils.encode_cell({ r: finalTotalRow, c: 6 }), { fill: yellowBg, border: thinBorder, font: boldFont });
  applyStyle(XLSX.utils.encode_cell({ r: finalTotalRow, c: 7 }), { fill: yellowBg, border: thinBorder, font: boldFont, alignment: rightAlign });

  XLSX.utils.book_append_sheet(workbook, ws, "제품원가견적서");

  // 파일 저장
  const fileName = `제품원가견적서_${data.productName || "견적"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export async function exportToPDF(data: ExportData) {
  // 종합원가 계산
  const totalMaterialCost = data.materials.reduce((sum, m) => sum + m.totalPrice, 0);
  const totalSupplyCost = data.supplies.reduce((sum, m) => sum + m.totalPrice, 0);
  const processQty = data.processes[0]?.quantity || 0;
  const processUnitCost = data.processes[0]?.unitCost || 0;
  const processTotalCost = processQty * processUnitCost;
  const totalIndirectCost = data.inspectionCost + data.managementCost + data.deliveryCost + data.designCost;
  const totalCost = totalMaterialCost + totalSupplyCost + processTotalCost + totalIndirectCost;
  const profitAmount = totalCost * (data.profitRate / 100);
  const finalAmount = totalCost + profitAmount;
  const perCaseAmount = data.productionQty ? finalAmount / data.productionQty : 0;

  // HTML 템플릿 생성
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
      .header-light { background: #fefce8; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .text-bold { font-weight: bold; }
      .section-title { background: #fef3c7; font-weight: bold; }
      .no-border-right { border-right: none; }
      .no-border-left { border-left: none; }
      .total-row { background: #f3f4f6; font-weight: bold; }
    </style>

    <div class="container">
      <table>
        <!-- 제목 -->
        <tr>
          <td colspan="10" class="title">제품 원가견적서</td>
        </tr>

        <!-- 기본 정보 1행 -->
        <tr>
          <td class="header-yellow">제 품 명</td>
          <td colspan="3">${data.productName}</td>
          <td class="header-yellow">내 용 량</td>
          <td>${data.contentAmount}</td>
          <td class="header-yellow">포장단위</td>
          <td>${data.packageUnit}</td>
          <td colspan="2"></td>
        </tr>

        <!-- 기본 정보 2행 -->
        <tr>
          <td class="header-yellow">제품유형</td>
          <td>${data.productType}</td>
          <td class="header-yellow">제형</td>
          <td>${data.formType}</td>
          <td class="header-yellow" colspan="2">섭취량</td>
          <td colspan="4">${data.intakeGuide}</td>
        </tr>

        <!-- 제조 정보 헤더 -->
        <tr>
          <td class="header-yellow">제조단위</td>
          <td class="header-yellow">단위중량(CASE)</td>
          <td class="header-yellow" colspan="2">총중량(kg)</td>
          <td class="header-yellow">이윤율(%)</td>
          <td class="header-yellow" colspan="2">실제수량</td>
          <td class="header-yellow" colspan="3">포장방법</td>
        </tr>

        <!-- 제조 정보 값 -->
        <tr>
          <td class="text-center">${fmt(data.productionQty)} 개</td>
          <td class="text-center">${data.unitWeight} g</td>
          <td class="text-center" colspan="2">${data.totalWeight}</td>
          <td class="text-center">${data.yieldRate} %</td>
          <td class="text-center" colspan="2">${fmt(data.actualQty)} set</td>
          <td colspan="3">${data.packagingMethod}</td>
        </tr>

        <!-- 빈 줄 -->
        <tr><td colspan="10" style="height: 10px; border: none;"></td></tr>

        <!-- 1. 원료비 섹션 -->
        <tr>
          <td colspan="10" class="section-title">1. 원료비(성분/물질/배합/비율)</td>
        </tr>
        <tr>
          <td class="header-orange text-center">No.</td>
          <td class="header-orange" colspan="2">원 료 명</td>
          <td class="header-orange text-center">배합비(%)</td>
          <td class="header-orange text-center">함량(g)</td>
          <td class="header-orange text-center">투입량</td>
          <td class="header-orange text-center">단가</td>
          <td class="header-orange text-center">총합계</td>
          <td class="header-orange" colspan="2">비고</td>
        </tr>
        ${data.materials.map((m, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td colspan="2">${m.materialName}</td>
          <td class="text-right">${m.mixRatio || ""}</td>
          <td class="text-right">${m.contentMg || ""}</td>
          <td class="text-right">${m.inputKg || ""}</td>
          <td class="text-right">${m.unitPrice ? fmt(m.unitPrice) : ""}</td>
          <td class="text-right">${m.totalPrice ? fmt(m.totalPrice) : ""}</td>
          <td colspan="2">${m.functionalContent || ""}</td>
        </tr>
        `).join("")}
        <tr class="total-row">
          <td></td>
          <td colspan="2" class="text-center">합 계</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td class="text-right">${fmt(totalMaterialCost)}</td>
          <td colspan="2"></td>
        </tr>

        <!-- 빈 줄 -->
        <tr><td colspan="10" style="height: 10px; border: none;"></td></tr>

        <!-- 2. 자재비 섹션 -->
        <tr>
          <td colspan="10" class="section-title">2. 자재비</td>
        </tr>
        <tr>
          <td class="header-orange text-center"></td>
          <td class="header-orange">자 재 명</td>
          <td class="header-orange text-center">규 격</td>
          <td class="header-orange text-center">수량</td>
          <td class="header-orange text-center">단가(원/g)</td>
          <td class="header-orange text-center">투입량</td>
          <td class="header-orange text-center">단가</td>
          <td class="header-orange text-center">금액</td>
          <td class="header-orange" colspan="2"></td>
        </tr>
        ${data.supplies.map((m) => `
        <tr>
          <td></td>
          <td>${m.supplyName}</td>
          <td class="text-center">${m.specification || ""}</td>
          <td class="text-right">${m.quantity || ""}</td>
          <td></td>
          <td class="text-right">${m.inputQty || ""}</td>
          <td class="text-right">${m.unitPrice ? fmt(m.unitPrice) : ""}</td>
          <td class="text-right">${m.totalPrice ? fmt(m.totalPrice) : ""}</td>
          <td colspan="2"></td>
        </tr>
        `).join("")}
        <tr class="total-row">
          <td colspan="4"></td>
          <td class="text-center">소 계</td>
          <td colspan="2"></td>
          <td class="text-right">${fmt(totalSupplyCost)}</td>
          <td colspan="2"></td>
        </tr>

        <!-- 빈 줄 -->
        <tr><td colspan="10" style="height: 10px; border: none;"></td></tr>

        <!-- 3. 직접제조비 + 4. 간접제조비 + 종합원가 -->
        <tr>
          <td colspan="5" class="section-title">3. 직접제조비</td>
          <td colspan="5" class="section-title">4. 간접제조비 / 종합원가(+α)예상 제조비</td>
        </tr>
        <tr>
          <td class="header-orange" colspan="2">작 업 공 정 명</td>
          <td class="header-orange text-center">수량(case)</td>
          <td class="header-orange text-center">공정단가</td>
          <td class="header-orange text-center">총공정비</td>
          <td class="header-orange" colspan="2">항목</td>
          <td class="header-orange text-center">금액</td>
          <td class="header-orange" colspan="2">종합원가</td>
        </tr>
        <tr>
          <td colspan="2">칭량</td>
          <td></td>
          <td></td>
          <td></td>
          <td colspan="2">검사비</td>
          <td class="text-right">${fmt(data.inspectionCost)}</td>
          <td>1. 원료비</td>
          <td class="text-right">${fmt(totalMaterialCost)}</td>
        </tr>
        <tr>
          <td colspan="2">혼합</td>
          <td></td>
          <td></td>
          <td></td>
          <td colspan="2">관리비</td>
          <td class="text-right">${fmt(data.managementCost)}</td>
          <td>2. 자재비</td>
          <td class="text-right">${fmt(totalSupplyCost)}</td>
        </tr>
        <tr>
          <td colspan="2">스틱충진</td>
          <td class="text-center">${fmt(processQty)} set</td>
          <td class="text-right header-light">${fmt(processUnitCost)}</td>
          <td class="text-right">${fmt(processTotalCost)}</td>
          <td colspan="2">운반비</td>
          <td class="text-right">${fmt(data.deliveryCost)}</td>
          <td>3. 직접제조비</td>
          <td class="text-right">${fmt(processTotalCost)}</td>
        </tr>
        <tr>
          <td colspan="2">선별</td>
          <td></td>
          <td></td>
          <td></td>
          <td colspan="2">디자인비용</td>
          <td class="text-right">${fmt(data.designCost)}</td>
          <td>4. 간접제조비</td>
          <td class="text-right">${fmt(totalIndirectCost)}</td>
        </tr>
        <tr>
          <td colspan="2">포장</td>
          <td></td>
          <td></td>
          <td></td>
          <td colspan="2" class="total-row">소 계</td>
          <td class="text-right total-row">${fmt(totalIndirectCost)}</td>
          <td class="total-row">5. 소계</td>
          <td class="text-right total-row">${fmt(totalCost)}</td>
        </tr>
        <tr>
          <td colspan="5"></td>
          <td colspan="3"></td>
          <td>6. 기업이윤(${data.profitRate}%)</td>
          <td class="text-right">${fmt(profitAmount)}</td>
        </tr>
        <tr>
          <td colspan="5"></td>
          <td colspan="3"></td>
          <td class="header-yellow">7. 합계(VAT별도)</td>
          <td class="text-right header-yellow text-bold">${fmt(finalAmount)}</td>
        </tr>
        <tr>
          <td colspan="5"></td>
          <td colspan="3"></td>
          <td>8. 1case 납품예상가</td>
          <td class="text-right">${fmt(perCaseAmount)}</td>
        </tr>
        <tr>
          <td colspan="5"></td>
          <td colspan="3"></td>
          <td class="header-yellow">9. 총납품예상가</td>
          <td class="text-right header-yellow text-bold">${fmt(finalAmount)}</td>
        </tr>
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
        const allElements = clonedDoc.querySelectorAll("*");
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const computedStyle = window.getComputedStyle(htmlEl);
          if (computedStyle.backgroundColor.includes("lab")) {
            htmlEl.style.backgroundColor = "#ffffff";
          }
          if (computedStyle.color.includes("lab")) {
            htmlEl.style.color = "#1a1a1a";
          }
          if (computedStyle.borderColor.includes("lab")) {
            htmlEl.style.borderColor = "#000000";
          }
        });
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;

    pdf.addImage(imgData, "PNG", imgX, 5, imgWidth * ratio, imgHeight * ratio);

    // 파일 저장
    const fileName = `제품원가견적서_${data.productName || "견적"}_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}
