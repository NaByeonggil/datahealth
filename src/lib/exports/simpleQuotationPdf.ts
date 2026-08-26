/**
 * 일반견적서 → 고객 발송용 견적서 PDF (인쇄 창)
 *
 * 사내 표준 견적서 양식(밀크씨슬 견적서)을 그대로 재현한다.
 *   상단  제목 / 수신측 블록(좌) · 공급자 블록(우)
 *   중단  제품사양 / 품목 표(단가·공급가액·세액)
 *   하단  합계 / 특기사항 — 주원료·부원료 표기는 특기사항 본문에 포함되어 있다
 *   하단  합계 / 특기사항
 *
 * 금액은 calculateSimple.ts 에서 나온 값을 그대로 받는다(재계산하지 않는다).
 */
import { DEFAULT_COMPANY_INFO, CompanyInfoType } from "@/lib/company/supplier";

interface QuotationItem {
  category: string;
  materialName: string;
  theoryAmount: number;
  actualAmount: number;
  kgUnitPrice: number;
  materialCost: number;
  origin?: string | null;
}

/** 계산된 포장 옵션 한 줄 */
interface QuotationLine {
  no: string;
  displayLabel: string;
  packageUnit: number;
  setCount: number;
  unit?: string | null;
  packagingMethod?: string | null;
  sellingUnitPrice: number;
  supplyAmount: number;
  vatAmount: number;
  /** 어느 제품의 옵션인지 — 품목 칸에 찍는다 */
  productName?: string;
}

interface QuotationData {
  quotationNo: string;
  productName: string;
  customerName: string;
  customerContact?: string;
  customerPhone?: string;
  customerFax?: string;
  validDays?: number;
  deliveryTerms?: string;
  paymentTerms?: string;
  foodType?: string;
  /** 제품이 여러 개면 " / " 로 이어 붙인 값 */
  productNames?: string;
  productTypeNames?: string;
  productSpecs?: string;
  dosages?: string;
  packagingMethods?: string;
  note: string;
  lines: QuotationLine[];
  supplyAmount: number;
  vatAmount: number;
  totalCost: number;
  /** false = 옵션 택일이라 합계를 내지 않는다 */
  sumOptions?: boolean;
  /** 공급자(자사) 정보 — 없으면 기본값 */
  company?: CompanyInfoType;
  /** 견적 일자 — 없으면 오늘 */
  quotationDate?: string;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 값이 없으면 빈칸으로 둔다(양식상 손으로 채우는 칸이 많다) */
const v = (s?: string | null) => escapeHtml(s || "");

export function exportSimpleQuotationPdf(data: QuotationData) {
  const today =
    data.quotationDate || new Date().toISOString().slice(0, 10);
  const co = data.company ?? DEFAULT_COMPANY_INFO;

  const lines = data.lines ?? [];
  const filler = Math.max(0, 7 - lines.length);
  const itemRows =
    lines
      .map(
        (ln) => `
    <tr>
      <td class="c">${escapeHtml(ln.no)}</td>
      <td>${v(ln.productName) || v(data.productName)}</td>
      <td class="c sm">${v(ln.packagingMethod) || escapeHtml(ln.displayLabel)}</td>
      <td class="r">${fmt(ln.setCount)}</td>
      <td class="c">${v(ln.unit) || "박스"}</td>
      <td class="r">${fmt(ln.sellingUnitPrice)}</td>
      <td class="r">${fmt(ln.supplyAmount)}</td>
      <td class="r">${fmt(ln.vatAmount)}</td>
      <td class="sm"></td>
    </tr>`
      )
      .join("") +
    Array.from({ length: filler })
      .map(
        () =>
          `<tr><td class="c">&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
      )
      .join("");

  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>견적서 - ${v(data.productName)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Malgun Gothic","맑은 고딕",AppleGothic,sans-serif; font-size: 11px; color:#000; margin:0; }
  h1 { text-align:center; font-size:26px; letter-spacing:12px; margin:6px 0 16px; text-decoration:underline; }
  table { border-collapse: collapse; width:100%; }
  td, th { border:1px solid #000; padding:3px 5px; vertical-align:middle; }
  .hd { background:#d9d9d9; font-weight:bold; text-align:center; white-space:nowrap; }
  .c { text-align:center; } .r { text-align:right; } .sm { font-size:10px; }
  .noborder, .noborder td { border:none; }
  .vert { writing-mode: vertical-rl; text-align:center; letter-spacing:6px; font-weight:bold; width:22px; }
  .lead { margin:6px 0 4px; font-size:11px; }
  .sec { background:#d9d9d9; font-weight:bold; padding:4px 6px; border:1px solid #000; border-bottom:none; }
  .box { border:1px solid #000; padding:8px 10px; white-space:pre-wrap; min-height:90px; font-size:11px; }
  .top { display:flex; gap:6px; align-items:stretch; }
  .top > div:first-child { width:41%; }
  .top > div:last-child  { width:59%; }
</style></head><body>

<h1>견 적 서</h1>

<div class="top">
  <!-- 수신측 -->
  <div>
    <table>
      <tr>
        <td class="c" style="font-weight:bold">${v(data.customerName)}</td>
        <td class="c" style="width:56px">귀하</td>
      </tr>
    </table>
    <table style="border-top:none">
      <tr><td class="hd" style="width:88px">견적 일자</td><td>${escapeHtml(today)}</td></tr>
      <tr><td class="hd">수　　신</td><td>${v(data.customerContact)}</td></tr>
      <tr><td class="hd">전　　화</td><td>${v(data.customerPhone)}</td></tr>
      <tr><td class="hd">F A X</td><td>${v(data.customerFax)}</td></tr>
      <tr><td class="hd">견적 번호</td><td>${v(data.quotationNo)}</td></tr>
      <tr><td class="hd">유효 기간</td><td>견적일로부터 ${data.validDays ?? 30}일간</td></tr>
      <tr><td class="hd">납기 일자</td><td>${v(data.deliveryTerms)}</td></tr>
      <tr><td class="hd">결제 조건</td><td>${v(data.paymentTerms)}</td></tr>
    </table>
  </div>
  <!-- 공급자 -->
  <div>
    <table style="height:100%">
      <tr>
        <td class="vert" rowspan="6">공급자</td>
        <td class="hd" style="width:70px">상　　호</td><td>${escapeHtml(co.companyName)}</td>
        <td class="hd" style="width:60px">대표자</td><td style="width:110px">${escapeHtml(co.ceo)}</td>
      </tr>
      <tr>
        <td class="hd">사업자번호</td><td>${escapeHtml(co.bizNo)}</td>
        <td class="hd">F A X</td><td>${escapeHtml(co.fax)}</td>
      </tr>
      <tr>
        <td class="hd">담당자</td><td>${escapeHtml(co.manager)}</td>
        <td class="hd">전　　화</td><td>${escapeHtml(co.tel)}</td>
      </tr>
      <tr><td class="hd">이메일</td><td colspan="3">${escapeHtml(co.email)}</td></tr>
      <tr><td class="hd">주　　소</td><td colspan="3">${escapeHtml(co.address)}</td></tr>
      <tr>
        <td class="hd">업　　태</td><td>${escapeHtml(co.bizType)}</td>
        <td class="hd">종　　목</td><td>${escapeHtml(co.bizItem)}</td>
      </tr>
    </table>
  </div>
</div>

<p class="lead">아래와 같이 견적합니다.</p>

<table>
  <tr>
    <td class="hd" style="width:90px" rowspan="6">제품사양</td>
    <td class="hd" style="width:80px">제품명</td><td>${v(data.productNames) || v(data.productName)}</td>
  </tr>
  <tr><td class="hd">제품유형</td><td>${v(data.foodType)}</td></tr>
  <tr><td class="hd">제품제형</td><td>${v(data.productTypeNames)}</td></tr>
  <tr><td class="hd">제품규격</td><td>${v(data.productSpecs)}</td></tr>
  <tr><td class="hd">섭취방법</td><td>${v(data.dosages)}</td></tr>
  <tr><td class="hd">포장방법</td><td>${v(data.packagingMethods)}</td></tr>
</table>

<table style="margin-top:10px">
  <tr>
    <th class="hd" style="width:34px">No.</th>
    <th class="hd">품목</th>
    <th class="hd" style="width:86px">규격</th>
    <th class="hd" style="width:54px">수량</th>
    <th class="hd" style="width:44px">단위</th>
    <th class="hd" style="width:66px">단가(원)</th>
    <th class="hd" style="width:84px">공급가액</th>
    <th class="hd" style="width:74px">세액</th>
    <th class="hd" style="width:96px">주원료함량</th>
  </tr>
  ${itemRows}
  ${data.sumOptions
    ? `<tr>
    <td class="hd" colspan="6">합　계</td>
    <td class="r" style="font-weight:bold">${fmt(data.supplyAmount)}</td>
    <td class="r" style="font-weight:bold">${fmt(data.vatAmount)}</td>
    <td></td>
  </tr>`
    : `<tr>
    <td class="hd" colspan="9" style="text-align:left;padding-left:8px">
      ※ 위 포장 옵션 중 택일하여 발주하시면 됩니다.
    </td>
  </tr>`}
</table>

<div style="margin-top:14px">
  <div class="sec">특 기 사 항</div>
  <div class="box">${escapeHtml(data.note || "")}</div>
</div>

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
