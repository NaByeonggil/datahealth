"use client";

import { DetailedQuotationType } from "@/types/quotation";
import { calculateDetailedQuotation } from "@/lib/quotation/calculateDetailed";

const fmt = (n: number) => Math.round(n || 0).toLocaleString("ko-KR");
const fmtDec = (n: number, d = 2) =>
  (n || 0).toLocaleString("ko-KR", { maximumFractionDigits: d });

/**
 * 원본 엑셀(배합비 견적서) 양식을 그대로 재현한 인쇄용 뷰.
 * 금액은 상세견적서와 동일한 계산 모듈에서 나온다.
 */
export default function QuotationSheetView({ data }: { data: DetailedQuotationType }) {
  const t = calculateDetailedQuotation(data);
  const materials = data.materials || [];
  const supplies = data.supplies || [];
  const processes = data.processes || [];
  const overheads = data.overheads || [];
  const sideRows = Math.max(processes.length, overheads.length, 5);

  return (
    <>
      <style>{`
        #quotation-sheet {
          background: #ffffff;
          color: #111111;
          padding: 24px;
          border-radius: 8px;
          overflow-x: auto;
        }
        #quotation-sheet table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          table-layout: fixed;
          font-family: "Noto Sans KR", -apple-system, sans-serif;
        }
        #quotation-sheet td, #quotation-sheet th {
          border: 1px solid #000000;
          padding: 4px 6px;
          vertical-align: middle;
          word-break: break-word;
        }
        #quotation-sheet .sheet-title {
          background: #fef3c7;
          font-size: 20px;
          font-weight: 700;
          text-align: center;
          padding: 10px;
          letter-spacing: 6px;
        }
        #quotation-sheet .hd-yellow { background: #fef3c7; font-weight: 700; }
        #quotation-sheet .hd-orange { background: #fed7aa; font-weight: 700; text-align: center; }
        #quotation-sheet .sec { background: #fef3c7; font-weight: 700; }
        #quotation-sheet .sum { background: #f3f4f6; font-weight: 700; }
        #quotation-sheet .final { background: #fde68a; font-weight: 700; }
        #quotation-sheet .r { text-align: right; }
        #quotation-sheet .c { text-align: center; }
        #quotation-sheet .spacer td { border: none; height: 12px; }
        @media print {
          body * { visibility: hidden !important; }
          #quotation-sheet, #quotation-sheet * { visibility: visible !important; }
          #quotation-sheet {
            position: absolute; left: 0; top: 0; width: 100%;
            padding: 0; border: none;
          }
          #quotation-sheet table { font-size: 10px; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      <div id="quotation-sheet">
        <table>
          <tbody>
            <tr>
              <td colSpan={10} className="sheet-title">배 합 비 견 적 서</td>
            </tr>

            <tr>
              <td className="hd-yellow c">제 품 명</td>
              <td colSpan={3}>{data.productName}</td>
              <td className="hd-yellow c">내 용 량</td>
              <td className="c">{data.contentAmount ?? "-"} g</td>
              <td className="hd-yellow c">포장단위</td>
              <td className="c">{data.packageUnit}</td>
              <td className="hd-yellow c">견적번호</td>
              <td className="c">{data.quotationNo}</td>
            </tr>
            <tr>
              <td className="hd-yellow c">유 형</td>
              <td>{data.productType}</td>
              <td className="hd-yellow c">제 형</td>
              <td>{data.formType || "-"}</td>
              <td className="hd-yellow c">섭 취 량</td>
              <td colSpan={3}>{data.intakeGuide || "-"}</td>
              <td className="hd-yellow c">고객사</td>
              <td className="c">{data.customerName || "-"}</td>
            </tr>

            <tr>
              <td className="hd-yellow c">제조단위</td>
              <td className="hd-yellow c">단위중량(CASE)</td>
              <td className="hd-yellow c">총중량(kg)</td>
              <td className="hd-yellow c">로스율</td>
              <td className="hd-yellow c">수 율</td>
              <td className="hd-yellow c">이론수량</td>
              <td className="hd-yellow c">실제수량</td>
              <td className="hd-yellow c" colSpan={3}>포장방법</td>
            </tr>
            <tr>
              <td className="c">{fmt(data.productionQty)}</td>
              <td className="c">{fmtDec(t.unitWeight)} g</td>
              <td className="c">{fmtDec(t.totalWeight, 3)}</td>
              <td className="c">{data.lossRate ?? 1.1}</td>
              <td className="c">{data.yieldRate} %</td>
              <td className="c">{fmt(t.theoreticalQty)}</td>
              <td className="c">{fmt(t.caseQty)}</td>
              <td className="c" colSpan={3}>{data.packagingMethod || "-"}</td>
            </tr>

            <tr className="spacer"><td colSpan={10} /></tr>

            <tr><td colSpan={10} className="sec">1. 원료비 (성분 및 배합비율)</td></tr>
            <tr>
              <td className="hd-orange">No.</td>
              <td className="hd-orange" colSpan={2}>원 료 명</td>
              <td className="hd-orange">배합비율(%)</td>
              <td className="hd-orange">함량(mg)</td>
              <td className="hd-orange">투입량(kg)</td>
              <td className="hd-orange">단 가</td>
              <td className="hd-orange">총합계</td>
              <td className="hd-orange" colSpan={2}>기능성함량</td>
            </tr>
            {materials.map((m, i) => (
              <tr key={m.id || i}>
                <td className="c">{i + 1}</td>
                <td colSpan={2}>{m.materialName}</td>
                <td className="r">{fmtDec(m.mixRatio, 4)}</td>
                <td className="r">{fmtDec(m.contentMg, 3)}</td>
                <td className="r">{fmtDec(m.inputKg, 3)}</td>
                <td className="r">{fmt(m.unitPrice)}</td>
                <td className="r">{fmt(m.totalPrice)}</td>
                <td colSpan={2}>{m.functionalContent || ""}</td>
              </tr>
            ))}
            <tr className="sum">
              <td colSpan={3} className="c">합 계</td>
              <td className="r">
                {fmtDec(materials.reduce((s, m) => s + m.mixRatio, 0), 4)}
              </td>
              <td className="r">
                {fmtDec(materials.reduce((s, m) => s + m.contentMg, 0), 2)}
              </td>
              <td className="r">
                {fmtDec(materials.reduce((s, m) => s + m.inputKg, 0), 3)}
              </td>
              <td />
              <td className="r">{fmt(t.materialCost)}</td>
              <td colSpan={2} className="r">{fmtDec(t.materialPerCase)} 원/case</td>
            </tr>

            <tr className="spacer"><td colSpan={10} /></tr>

            <tr><td colSpan={10} className="sec">2. 자재비</td></tr>
            <tr>
              <td className="hd-orange">No.</td>
              <td className="hd-orange" colSpan={2}>자 재 명</td>
              <td className="hd-orange">규 격</td>
              <td className="hd-orange">함량(개)</td>
              <td className="hd-orange">투입량(개)</td>
              <td className="hd-orange">단 가</td>
              <td className="hd-orange">금 액</td>
              <td className="hd-orange" colSpan={2}>비 고</td>
            </tr>
            {supplies.map((m, i) => (
              <tr key={m.id || i}>
                <td className="c">{i + 1}</td>
                <td colSpan={2}>{m.supplyName}</td>
                <td className="c">{m.specification || ""}</td>
                <td className="r">{m.quantity ? fmt(m.quantity) : ""}</td>
                <td className="r">{m.inputQty ? fmt(m.inputQty) : ""}</td>
                <td className="r">{m.unitPrice ? fmt(m.unitPrice) : ""}</td>
                <td className="r">{m.totalPrice ? fmt(m.totalPrice) : ""}</td>
                <td colSpan={2}>{m.note || ""}</td>
              </tr>
            ))}
            <tr className="sum">
              <td colSpan={7} className="c">소 계</td>
              <td className="r">{fmt(t.supplyCost)}</td>
              <td colSpan={2} className="r">{fmtDec(t.supplyPerCase)} 원/case</td>
            </tr>

            <tr className="spacer"><td colSpan={10} /></tr>

            <tr>
              <td colSpan={5} className="sec">3. 직접제조비</td>
              <td colSpan={5} className="sec">4. 간접제조비</td>
            </tr>
            <tr>
              <td className="hd-orange" colSpan={2}>작 업 공 정 명</td>
              <td className="hd-orange">수량(case)</td>
              <td className="hd-orange">공정단가</td>
              <td className="hd-orange">총공정비</td>
              <td className="hd-orange" colSpan={2}>내 용</td>
              <td className="hd-orange">금 액</td>
              <td className="hd-orange" colSpan={2}>비 고</td>
            </tr>
            {Array.from({ length: sideRows }).map((_, i) => {
              const p = processes[i];
              const o = overheads[i];
              return (
                <tr key={i}>
                  <td colSpan={2}>{p?.processName || ""}</td>
                  <td className="r">{p?.quantity ? fmt(p.quantity) : ""}</td>
                  <td className="r">{p?.unitCost ? fmt(p.unitCost) : ""}</td>
                  <td className="r">{p?.totalCost ? fmt(p.totalCost) : ""}</td>
                  <td colSpan={2}>{o?.name || ""}</td>
                  <td className="r">{o?.amount ? fmt(o.amount) : ""}</td>
                  <td colSpan={2}>{o?.note || ""}</td>
                </tr>
              );
            })}
            <tr className="sum">
              <td colSpan={4} className="c">소 계</td>
              <td className="r">{fmt(t.processCost)}</td>
              <td colSpan={2} className="c">소 계</td>
              <td className="r">{fmt(t.overheadCost)}</td>
              <td colSpan={2} />
            </tr>

            <tr className="spacer"><td colSpan={10} /></tr>

            <tr>
              <td colSpan={10} className="sec">
                종합원가 산출내역 (실제수량 {fmt(t.caseQty)} case 기준)
              </td>
            </tr>
            <tr>
              <td className="hd-orange" colSpan={4}>내 용</td>
              <td className="hd-orange" colSpan={3}>1 case 금액</td>
              <td className="hd-orange" colSpan={3}>총 액</td>
            </tr>
            {[
              ["1. 원료비", t.materialPerCase, t.materialCost],
              ["2. 자재비", t.supplyPerCase, t.supplyCost],
              ["3. 직접제조비", t.processPerCase, t.processCost],
              ["4. 간접제조비", t.overheadPerCase, t.overheadCost],
            ].map(([label, perCase, total]) => (
              <tr key={label as string}>
                <td colSpan={4}>{label}</td>
                <td colSpan={3} className="r">{fmtDec(perCase as number)}</td>
                <td colSpan={3} className="r">{fmt(total as number)}</td>
              </tr>
            ))}
            <tr className="sum">
              <td colSpan={4}>5. 소계 (원가)</td>
              <td colSpan={3} className="r">{fmtDec(t.costPerCase)}</td>
              <td colSpan={3} className="r">{fmt(t.totalCostAmount)}</td>
            </tr>
            <tr>
              <td colSpan={4}>6. 기업이윤 ({data.profitRate}%)</td>
              <td colSpan={3} className="r">{fmtDec(t.profitPerCase)}</td>
              <td colSpan={3} className="r">{fmt(t.totalProfitAmount)}</td>
            </tr>
            <tr className="hd-yellow">
              <td colSpan={4}>7. 합 계 (VAT 별도)</td>
              <td colSpan={3} className="r">{fmtDec(t.pricePerCaseExVat)}</td>
              <td colSpan={3} className="r">{fmt(t.totalAmountExVat)}</td>
            </tr>
            <tr>
              <td colSpan={4}>8. 1case 납품 예상가 (VAT {data.vatRate ?? 10}% 포함)</td>
              <td colSpan={3} className="r">{fmt(t.finalUnitPrice)}</td>
              <td colSpan={3} className="r">이론가 {fmtDec(t.pricePerCaseIncVat)}</td>
            </tr>
            <tr className="final">
              <td colSpan={4}>9. 총납품 예상가 (VAT 포함)</td>
              <td colSpan={3} className="r">{fmt(t.finalUnitPrice)}</td>
              <td colSpan={3} className="r">{fmt(t.totalAmount)}</td>
            </tr>

            {data.note ? (
              <>
                <tr className="spacer"><td colSpan={10} /></tr>
                <tr><td colSpan={10} className="sec">비 고</td></tr>
                <tr><td colSpan={10} style={{ whiteSpace: "pre-wrap" }}>{data.note}</td></tr>
              </>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: 12, fontSize: 10, color: "#666", textAlign: "right" }}>
          출력일: {new Date().toLocaleDateString("ko-KR")}
        </div>
      </div>
    </>
  );
}
