"use client";

import { DetailedQuotationType } from "@/types/quotation";
import { calculateDetailedQuotation } from "@/lib/quotation/calculateDetailed";

const fmt = (n: number) => Math.round(n || 0).toLocaleString("ko-KR");
const fmtDec = (n: number, d = 2) =>
  n ? n.toLocaleString("ko-KR", { maximumFractionDigits: d }) : "";

/** 원료 표는 원본 시트처럼 최소 14행을 유지한다 (9~22행) */
const MATERIAL_ROWS = 14;
const SUPPLY_ROWS = 6;
const PROCESS_ROWS = 5;
/** 종합원가 산출내역 고정 9행 (43~51행) */
const SUMMARY_ROWS = 9;

/**
 * 엑셀 양식2 — whang 상세견적.xlsx 원본 시트를 셀 단위로 그대로 복제한 뷰.
 * 열 너비·병합·배색(제목 초록 / 제형 보라 / 입력셀 주황 / 섹션 연파랑 / 종합원가 노랑)까지
 * 원본과 동일하게 맞췄다. 금액은 상세견적서와 같은 계산 모듈에서 나온다.
 */
export default function QuotationSheetView2({ data }: { data: DetailedQuotationType }) {
  const t = calculateDetailedQuotation(data);
  const materials = data.materials || [];
  const supplies = data.supplies || [];
  const processes = data.processes || [];
  const overheads = data.overheads || [];

  const materialRows = Math.max(materials.length, MATERIAL_ROWS);
  const supplyRows = Math.max(supplies.length + 2, SUPPLY_ROWS);
  const processRows = Math.max(processes.length, PROCESS_ROWS);
  // 좌측 간접비 항목 + 소계 1행, 우측 종합원가 9행 중 큰 쪽에 맞춘다
  const bottomRows = Math.max(overheads.length + 1, SUMMARY_ROWS);
  const summaryStart = bottomRows - SUMMARY_ROWS;

  /** 우측 종합원가 산출내역 (원본 43~51행) */
  const summary: [string, string][] = [
    ["원료비", fmtDec(t.materialPerCase, 3)],
    ["자재비", fmtDec(t.supplyPerCase, 3)],
    ["직접제조비", fmtDec(t.processPerCase, 3)],
    ["간접제조비", fmtDec(t.overheadPerCase, 3)],
    ["소계(원가)", fmtDec(t.costPerCase, 3)],
    [`기업이윤(%)${data.profitRate ?? 0}`, fmtDec(t.profitPerCase, 3)],
    ["합 계(별도)", fmtDec(t.pricePerCaseExVat, 3)],
    ["1case 납품 예상가(VAT포함)", fmt(t.finalUnitPrice)],
    ["총납품 예상가(VAT포함)", fmt(t.totalAmount)],
  ];

  return (
    <>
      <style>{`
        #quotation-sheet { background:#fff; color:#000; padding:20px; border-radius:8px; overflow-x:auto; }
        #quotation-sheet table {
          width:100%; border-collapse:collapse; table-layout:fixed;
          font-family:"Noto Sans KR",-apple-system,sans-serif; font-size:11px;
        }
        #quotation-sheet td {
          border:1px solid #000; padding:3px 5px; height:22px;
          vertical-align:middle; word-break:break-word;
        }
        #quotation-sheet .t     { background:#00B050; color:#fff; font-size:19px; font-weight:700;
                                  text-align:center; letter-spacing:8px; height:38px; }
        #quotation-sheet .form  { background:#7030A0; color:#fff; font-weight:700; text-align:center; }
        #quotation-sheet .in    { background:#FFC000; }
        #quotation-sheet .sec   { background:#CCECFF; font-weight:700; }
        #quotation-sheet .yel   { background:#FFFF00; }
        #quotation-sheet .lbl   { font-weight:700; text-align:center; letter-spacing:2px; }
        #quotation-sheet .hd    { font-weight:700; text-align:center; }
        #quotation-sheet .r     { text-align:right; }
        #quotation-sheet .c     { text-align:center; }
        @media print {
          body * { visibility:hidden !important; }
          #quotation-sheet, #quotation-sheet * { visibility:visible !important; }
          #quotation-sheet { position:absolute; left:0; top:0; width:100%; padding:0; }
          #quotation-sheet table { font-size:9px; }
          #quotation-sheet td { height:auto; padding:2px 3px; }
          @page { size:A4 portrait; margin:8mm; }
          #quotation-sheet .t, #quotation-sheet .form, #quotation-sheet .in,
          #quotation-sheet .sec, #quotation-sheet .yel {
            -webkit-print-color-adjust:exact; print-color-adjust:exact;
          }
        }
      `}</style>

      <div id="quotation-sheet">
        <table>
          <colgroup>
            {[191, 132, 131, 153, 109, 117, 150, 90, 91].map((w, i) => (
              <col key={i} style={{ width: `${(w / 1164) * 100}%` }} />
            ))}
          </colgroup>
          <tbody>
            {/* 1행 제목 / 2행 제형 */}
            <tr><td colSpan={9} className="t">배 합 비 견 적 서</td></tr>
            <tr>
              <td className="form">{data.formType || "-"}</td>
              <td colSpan={8} style={{ border: "none" }} />
            </tr>

            {/* 3~4행 제품 정보 */}
            <tr>
              <td className="lbl">제 품 명</td>
              <td colSpan={3} className="in">{data.productName}</td>
              <td className="lbl">내 용 량</td>
              <td className="in c">{data.contentAmount ?? ""}</td>
              <td className="lbl">포장단위</td>
              <td colSpan={2} className="in c">{data.packageUnit || ""}</td>
            </tr>
            <tr>
              <td className="lbl">유       형</td>
              <td className="in">{data.productType}</td>
              <td className="lbl">제형</td>
              <td className="in">{data.formType || ""}</td>
              <td className="lbl">섭  취  량</td>
              <td colSpan={4} className="in">{data.intakeGuide || ""}</td>
            </tr>

            {/* 5~6행 제조 정보 */}
            <tr>
              <td className="hd">제조단위</td>
              <td className="hd">단위중량(CASE)</td>
              <td className="hd">총중량(kg)</td>
              <td className="hd">이론수량</td>
              <td className="hd">수  율</td>
              <td className="hd">실제수량</td>
              <td className="hd">분  량</td>
              <td colSpan={2} className="hd">포장방법</td>
            </tr>
            <tr>
              <td className="c">{fmt(data.productionQty)}</td>
              <td className="c">{fmtDec(t.unitWeight, 2)}</td>
              <td className="c">{fmtDec(t.totalWeight, 3)}</td>
              <td className="c">{fmt(t.theoreticalQty)}</td>
              <td className="in c">{data.yieldRate ? `${data.yieldRate}%` : ""}</td>
              <td className="in c">{fmt(t.caseQty)}</td>
              <td className="c" />
              <td colSpan={2} className="in c">{data.packagingMethod || ""}</td>
            </tr>

            {/* 7행 원료비 섹션 */}
            <tr><td colSpan={9} className="sec">1. 원료비(성분및배합비율)</td></tr>
            <tr>
              <td colSpan={2} className="hd">원료명</td>
              <td className="hd">배합비율(%)</td>
              <td className="hd">함량(mg)</td>
              <td className="hd">투입량(kg)</td>
              <td className="hd">단    가</td>
              <td className="hd">총합계</td>
              <td className="hd">기능성함량</td>
              <td className="hd">비고</td>
            </tr>
            {Array.from({ length: materialRows }).map((_, i) => {
              const m = materials[i];
              return (
                <tr key={`mat-${i}`}>
                  <td>{m?.materialName || ""}</td>
                  <td className="c">{m?.specification || ""}</td>
                  <td className="r">{m ? fmtDec(m.mixRatio, 4) : ""}</td>
                  <td className="r">{m ? fmtDec(m.contentMg, 3) : ""}</td>
                  <td className="r">{m ? fmtDec(m.inputKg, 3) : ""}</td>
                  <td className="r">{m ? fmt(m.unitPrice) : ""}</td>
                  <td className="r">{m ? fmt(m.totalPrice) : ""}</td>
                  <td className={i === materialRows - 1 ? "in c" : "c"}>
                    {i === materialRows - 1 ? "1case" : m?.functionalContent || ""}
                  </td>
                  <td>{m?.note || ""}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={2} className="lbl">합 계</td>
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
              <td className="in r">{fmtDec(t.materialPerCase, 3)}</td>
              <td />
            </tr>

            {/* 24행 자재비 섹션 */}
            <tr><td colSpan={9} className="sec">2. 자재비</td></tr>
            <tr>
              <td colSpan={2} className="hd">자    재   명</td>
              <td className="hd">규격</td>
              <td className="hd">함량(개)</td>
              <td className="hd">투입량(개)</td>
              <td className="hd">단    가</td>
              <td colSpan={2} className="hd">금액</td>
              <td className="hd">비고</td>
            </tr>
            {Array.from({ length: supplyRows }).map((_, i) => {
              const s = supplies[i];
              const isDongpan = i === supplyRows - 1;
              return (
                <tr key={`sup-${i}`}>
                  <td colSpan={2}>{isDongpan && !s ? "동판비" : s?.supplyName || ""}</td>
                  <td className="c">{s?.specification || ""}</td>
                  <td className="r">{s?.quantity ? fmt(s.quantity) : ""}</td>
                  <td className="r">{s?.inputQty ? fmt(s.inputQty) : ""}</td>
                  <td className={s ? "in r" : "r"}>{s?.unitPrice ? fmt(s.unitPrice) : ""}</td>
                  <td colSpan={2} className="r">{s?.totalPrice ? fmt(s.totalPrice) : ""}</td>
                  <td className="c">{isDongpan && !s ? "별도" : s?.note || ""}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={2} className="lbl">소  계</td>
              <td colSpan={4} />
              <td colSpan={2} className="r">{fmt(t.supplyCost)}</td>
              <td />
            </tr>

            {/* 33행 직접제조비 섹션 */}
            <tr><td colSpan={9} className="sec">3. 직접제조비</td></tr>
            <tr>
              <td colSpan={4} className="hd">작 업 공 정 명</td>
              <td className="hd">수량(case)</td>
              <td className="hd">공정단가</td>
              <td className="hd">1Box금액</td>
              <td className="hd" />
              <td className="hd">총공정비</td>
            </tr>
            {Array.from({ length: processRows }).map((_, i) => {
              const p = processes[i];
              return (
                <tr key={`prc-${i}`}>
                  <td colSpan={4}>{p?.processName || ""}</td>
                  <td className="r">{p?.quantity ? fmt(p.quantity) : ""}</td>
                  <td className={p ? "in r" : "r"}>{p?.unitCost ? fmt(p.unitCost) : ""}</td>
                  <td className="r">{p?.totalCost ? fmt(p.totalCost) : ""}</td>
                  <td />
                  <td className="r">{p?.note || ""}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={4} className="lbl">소   계</td>
              <td colSpan={2} />
              <td className="r">{fmt(t.processCost)}</td>
              <td colSpan={2} />
            </tr>

            {/* 41행 간접제조비 + 종합원가산출내역 */}
            <tr>
              <td colSpan={3} className="hd" style={{ textAlign: "left" }}>4. 간접제조비</td>
              <td colSpan={6} className="yel hd">종합원가산출내역</td>
            </tr>
            <tr>
              <td colSpan={2} className="hd">내    용</td>
              <td className="hd">금액</td>
              <td colSpan={3} className="yel hd">내용</td>
              <td colSpan={3} className="yel hd">금액</td>
            </tr>
            {Array.from({ length: bottomRows }).map((_, i) => {
              const isLast = i === bottomRows - 1;
              const o = overheads[i];
              const sm = i >= summaryStart ? summary[i - summaryStart] : null;
              return (
                <tr key={`btm-${i}`}>
                  {isLast ? (
                    <>
                      <td colSpan={2} className="lbl">소 계</td>
                      <td className="r">{fmt(t.overheadCost)}</td>
                    </>
                  ) : (
                    <>
                      <td colSpan={2} style={{ fontSize: o?.note ? 9 : undefined }}>
                        {o ? (o.note ? `${o.name} (${o.note})` : o.name) : ""}
                      </td>
                      <td className="r">{o?.amount ? fmt(o.amount) : ""}</td>
                    </>
                  )}
                  <td colSpan={3} className="yel">{sm ? sm[0] : ""}</td>
                  <td colSpan={3} className="yel r">{sm ? sm[1] : ""}</td>
                </tr>
              );
            })}

            {data.note ? (
              <tr>
                <td colSpan={9} style={{ whiteSpace: "pre-wrap" }}>비고 : {data.note}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
