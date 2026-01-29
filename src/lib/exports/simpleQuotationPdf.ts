interface QuotationItem {
  category: string;
  materialName: string;
  theoryAmount: number;
  actualAmount: number;
  kgUnitPrice: number;
  materialCost: number;
  origin?: string | null;
}

interface QuotationData {
  quotationNo: string;
  productName: string;
  customerName: string;
  packageUnit: number;
  bottleBoxCost: number;
  setCount: number;
  processingCostPerUnit: number;
  note: string;
  items: QuotationItem[];
  totalMaterialCost: number;
  processingCost: number;
  subtotal: number;
  totalAmount: number;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportSimpleQuotationPdf(data: QuotationData) {
  const itemRows = data.items
    .map(
      (item, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="c">${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.materialName)}</td>
      <td class="r">${item.theoryAmount}</td>
      <td class="r">${item.actualAmount ? item.actualAmount.toFixed(4) : ""}</td>
      <td class="r">${item.kgUnitPrice ? fmt(item.kgUnitPrice) : ""}</td>
      <td class="r">${item.materialCost ? fmt(item.materialCost) : ""}</td>
      <td class="c">${escapeHtml(item.origin || "")}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>견적서 - ${escapeHtml(data.productName)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif; font-size: 11px; color: #000; }
  h1 { text-align: center; font-size: 20px; margin-bottom: 18px; letter-spacing: 8px; }
  h3 { font-size: 12px; margin: 14px 0 5px; border-bottom: 1px solid #333; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td { border: 1px solid #aaa; padding: 4px 6px; font-size: 10px; }
  th { background: #e8e8e8; font-weight: bold; text-align: center; }
  .label { background: #f5f5f5; font-weight: bold; width: 18%; }
  .val { width: 32%; }
  .r { text-align: right; }
  .c { text-align: center; }
  .highlight { background: #dceefb; }
  .total-row td { font-weight: bold; font-size: 12px; }
  .note { border: 1px solid #aaa; padding: 8px; white-space: pre-wrap; min-height: 30px; margin-top: 4px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>

<h1>견 적 서</h1>

<table>
  <tr>
    <td class="label">견적번호</td><td class="val">${escapeHtml(data.quotationNo || "-")}</td>
    <td class="label">제품명</td><td class="val">${escapeHtml(data.productName)}</td>
  </tr>
  <tr>
    <td class="label">고객사명</td><td class="val">${escapeHtml(data.customerName || "-")}</td>
    <td class="label">포장단위</td><td class="val">${fmt(data.packageUnit)}</td>
  </tr>
  <tr>
    <td class="label">병+박스 비용</td><td class="val">${fmt(data.bottleBoxCost)}원</td>
    <td class="label">세트수</td><td class="val">${data.setCount}</td>
  </tr>
</table>

<h3>원료 목록</h3>
<table>
  <tr>
    <th style="width:5%">No</th>
    <th style="width:9%">구분</th>
    <th style="width:22%">원료명</th>
    <th style="width:11%">이론량(mg)</th>
    <th style="width:12%">실투여량(g)</th>
    <th style="width:13%">Kg당단가(원)</th>
    <th style="width:13%">원료비(원)</th>
    <th style="width:10%">원산지</th>
  </tr>
  ${itemRows}
</table>

<h3>가격 계산</h3>
<table>
  <tr>
    <td class="label">원료비 합계</td><td class="val r">${fmt(data.totalMaterialCost)}원</td>
    <td class="label">가공비</td><td class="val r">${fmt(data.processingCost)}원</td>
  </tr>
  <tr>
    <td class="label">병+박스</td><td class="val r">${fmt(data.bottleBoxCost)}원</td>
    <td class="label">합계</td><td class="val r" style="font-weight:bold">${fmt(data.subtotal)}원</td>
  </tr>
  <tr class="total-row">
    <td class="highlight" colspan="3">세트합계 (x${data.setCount})</td>
    <td class="highlight r" style="font-size:13px">${fmt(data.totalAmount)}원</td>
  </tr>
</table>

${data.note ? `<h3>비고</h3><div class="note">${escapeHtml(data.note)}</div>` : ""}

<script>
  window.onafterprint = function() { window.close(); };
  window.print();
</script>
</body></html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("팝업이 차단되었습니다. 팝업 차단을 해제해 주세요.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}
