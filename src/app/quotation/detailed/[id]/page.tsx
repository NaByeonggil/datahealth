"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil, Trash2, FileDown, Printer, LayoutGrid, Sheet } from "lucide-react";
import { toast } from "sonner";
import { DetailedQuotationType } from "@/types/quotation";
import { calculateDetailedQuotation } from "@/lib/quotation/calculateDetailed";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { exportToExcel, exportToPDF } from "@/utils/exportDetailedQuotation";
import QuotationSheetView from "@/components/quotation/detailed/QuotationSheetView";
import QuotationSheetView2 from "@/components/quotation/detailed/QuotationSheetView2";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const fmtDec = (n: number, d = 2) =>
  n.toLocaleString("ko-KR", { maximumFractionDigits: d });

const STATUS_LABEL: Record<string, string> = {
  draft: "작성중",
  confirmed: "확정",
  closed: "종료",
};

export default function DetailedQuotationDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<DetailedQuotationType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [view, setView] = useState<"normal" | "sheet" | "sheet2">("normal");

  // ?view=sheet | sheet2 로 들어오면 해당 엑셀 양식으로 연다 (목록에서 바로 진입)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("view");
    if (q === "sheet" || q === "sheet2") setView(q);
  }, []);

  const changeView = (next: "normal" | "sheet" | "sheet2") => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "normal") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState(null, "", url.toString());
  };

  useEffect(() => {
    fetch(`/api/quotation/detailed/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => toast.error("견적서를 불러오지 못했습니다."));
  }, [id]);

  if (!data) return <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>;

  // 저장 스냅샷이 아니라 항목에서 다시 계산한 값을 보여준다 (폼/출력과 동일한 함수)
  const t = calculateDetailedQuotation(data);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotation/detailed/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("견적서가 삭제되었습니다.");
      router.push("/quotation/detailed");
    } catch {
      toast.error("삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  return (
    <div className={view === "normal" ? "space-y-6 max-w-6xl" : "space-y-6"}>
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push("/quotation/detailed")}>
          <ArrowLeft className="h-4 w-4 mr-1" />목록
        </Button>
        <h2 className="text-xl font-bold">상세견적서</h2>
        <Badge variant={data.status === "confirmed" ? "default" : "secondary"}>
          {STATUS_LABEL[data.status || "draft"]}
        </Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <div className="flex rounded-md border overflow-hidden mr-1">
            <Button variant={view === "normal" ? "default" : "ghost"} size="sm"
              className="rounded-none" onClick={() => changeView("normal")}>
              <LayoutGrid className="h-4 w-4 mr-1" />일반 보기
            </Button>
            <Button variant={view === "sheet" ? "default" : "ghost"} size="sm"
              className="rounded-none" onClick={() => changeView("sheet")}>
              <Sheet className="h-4 w-4 mr-1" />엑셀 양식
            </Button>
            <Button variant={view === "sheet2" ? "default" : "ghost"} size="sm"
              className="rounded-none" onClick={() => changeView("sheet2")}>
              <Sheet className="h-4 w-4 mr-1" />엑셀 양식2
            </Button>
          </div>
          {view !== "normal" && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />인쇄
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => exportToExcel(data)}>
            <FileDown className="h-4 w-4 mr-1" />Excel
          </Button>
          <Button variant="outline" size="sm" onClick={async () => {
            try {
              await exportToPDF(data);
              toast.success("PDF가 다운로드되었습니다.");
            } catch {
              toast.error("PDF 내보내기에 실패했습니다.");
            }
          }}>
            <FileDown className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => router.push(`/quotation/detailed/${id}/edit`)}>
            <Pencil className="h-4 w-4 mr-1" />수정
          </Button>
          <Button variant="outline" size="sm" disabled={deleting}
            onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4 mr-1 text-destructive" />삭제
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="견적서를 삭제할까요?"
        description={`${data.quotationNo} · ${data.productName}\n원료·부자재·공정 내역까지 모두 지워지며 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />

      {view === "sheet" ? (
        <QuotationSheetView data={data} />
      ) : view === "sheet2" ? (
        <QuotationSheetView2 data={data} />
      ) : (
        <>
      <Card>
        <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-muted-foreground">견적번호</p><p className="font-mono font-medium">{data.quotationNo}</p></div>
          <div><p className="text-xs text-muted-foreground">제품명</p><p className="font-medium">{data.productName}</p></div>
          <div><p className="text-xs text-muted-foreground">고객사</p><p>{data.customerName || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">작성일</p><p>{data.createdAt ? new Date(data.createdAt).toLocaleDateString("ko-KR") : "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">제품유형</p><p>{data.productType}</p></div>
          <div><p className="text-xs text-muted-foreground">제형</p><p>{data.formType || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">내용량</p><p>{data.contentAmount ?? "-"} g</p></div>
          <div><p className="text-xs text-muted-foreground">포장단위</p><p>{data.packageUnit} 개/case</p></div>
          <div className="col-span-2 md:col-span-3"><p className="text-xs text-muted-foreground">섭취량</p><p>{data.intakeGuide || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">유효기간</p><p>{data.validUntil ? new Date(data.validUntil).toLocaleDateString("ko-KR") : "-"}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>제조 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-muted-foreground">제조단위</p><p>{fmt(data.productionQty)} 개</p></div>
          <div><p className="text-xs text-muted-foreground">로스율</p><p>{data.lossRate ?? 1.1} 배</p></div>
          <div><p className="text-xs text-muted-foreground">단위중량(CASE)</p><p>{fmtDec(t.unitWeight)} g</p></div>
          <div><p className="text-xs text-muted-foreground">총중량</p><p>{fmtDec(t.totalWeight, 3)} kg</p></div>
          <div><p className="text-xs text-muted-foreground">수율</p><p>{data.yieldRate} %</p></div>
          <div><p className="text-xs text-muted-foreground">이론수량</p><p>{fmt(t.theoreticalQty)} case</p></div>
          <div><p className="text-xs text-muted-foreground">실제수량</p><p className="font-medium">{fmt(t.caseQty)} case</p></div>
          <div><p className="text-xs text-muted-foreground">포장방법</p><p>{data.packagingMethod || "-"}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1. 원료비</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No.</TableHead>
                <TableHead>원료명</TableHead>
                <TableHead className="text-right">배합비율(%)</TableHead>
                <TableHead className="text-right">함량(mg)</TableHead>
                <TableHead className="text-right">투입량(kg)</TableHead>
                <TableHead className="text-right">단가(원/kg)</TableHead>
                <TableHead className="text-right">총합계</TableHead>
                <TableHead>기능성함량</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.materials.map((m, i) => (
                <TableRow key={m.id || i}>
                  <TableCell className="text-center">{i + 1}</TableCell>
                  <TableCell>{m.materialName}</TableCell>
                  <TableCell className="text-right">{fmtDec(m.mixRatio, 4)}</TableCell>
                  <TableCell className="text-right">{fmtDec(m.contentMg, 3)}</TableCell>
                  <TableCell className="text-right">{fmtDec(m.inputKg, 3)}</TableCell>
                  <TableCell className="text-right">{fmt(m.unitPrice)}</TableCell>
                  <TableCell className="text-right">{fmt(m.totalPrice)}</TableCell>
                  <TableCell>{m.functionalContent || "-"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={6} className="text-right">합 계</TableCell>
                <TableCell className="text-right">{fmt(t.materialCost)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDec(t.materialPerCase)}원/case</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. 자재비</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No.</TableHead>
                <TableHead>자재명</TableHead>
                <TableHead>규격</TableHead>
                <TableHead className="text-right">함량(개)</TableHead>
                <TableHead className="text-right">투입량(개)</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.supplies.map((m, i) => (
                <TableRow key={m.id || i}>
                  <TableCell className="text-center">{i + 1}</TableCell>
                  <TableCell>{m.supplyName}</TableCell>
                  <TableCell>{m.specification || "-"}</TableCell>
                  <TableCell className="text-right">{fmt(m.quantity)}</TableCell>
                  <TableCell className="text-right">{fmt(m.inputQty)}</TableCell>
                  <TableCell className="text-right">{fmt(m.unitPrice)}</TableCell>
                  <TableCell className="text-right">{fmt(m.totalPrice)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={6} className="text-right">소 계</TableCell>
                <TableCell className="text-right">{fmt(t.supplyCost)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>3. 직접제조비</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>공정명</TableHead>
                  <TableHead className="text-right">수량(case)</TableHead>
                  <TableHead className="text-right">공정단가</TableHead>
                  <TableHead className="text-right">총공정비</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.processes.map((p, i) => (
                  <TableRow key={p.id || i}>
                    <TableCell>{p.processName}</TableCell>
                    <TableCell className="text-right">{fmt(p.quantity)}</TableCell>
                    <TableCell className="text-right">{fmt(p.unitCost)}</TableCell>
                    <TableCell className="text-right">{fmt(p.totalCost)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={3} className="text-right">소 계</TableCell>
                  <TableCell className="text-right">{fmt(t.processCost)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>4. 간접제조비</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>내용</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.overheads || []).map((o, i) => (
                  <TableRow key={o.id || i}>
                    <TableCell>{o.name}</TableCell>
                    <TableCell className="text-right">{fmt(o.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.note || "-"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell className="text-right">소 계</TableCell>
                  <TableCell className="text-right">{fmt(t.overheadCost)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>종합원가 산출내역</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            실제수량 {fmt(t.caseQty)} case 기준
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>항목</TableHead>
                <TableHead className="text-right">1 case 금액</TableHead>
                <TableHead className="text-right">총액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["1. 원료비", t.materialPerCase, t.materialCost],
                ["2. 자재비", t.supplyPerCase, t.supplyCost],
                ["3. 직접제조비", t.processPerCase, t.processCost],
                ["4. 간접제조비", t.overheadPerCase, t.overheadCost],
              ].map(([label, perCase, total]) => (
                <TableRow key={label as string}>
                  <TableCell>{label}</TableCell>
                  <TableCell className="text-right">{fmtDec(perCase as number)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt(total as number)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>5. 소계 (원가)</TableCell>
                <TableCell className="text-right">{fmtDec(t.costPerCase)}</TableCell>
                <TableCell className="text-right">{fmt(t.totalCostAmount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>6. 기업이윤 ({data.profitRate}%)</TableCell>
                <TableCell className="text-right">{fmtDec(t.profitPerCase)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{fmt(t.totalProfitAmount)}</TableCell>
              </TableRow>
              <TableRow className="font-medium">
                <TableCell>7. 합계 (VAT 별도)</TableCell>
                <TableCell className="text-right">{fmtDec(t.pricePerCaseExVat)}</TableCell>
                <TableCell className="text-right">{fmt(t.totalAmountExVat)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>8. 1case 납품 예상가 (VAT {data.vatRate ?? 10}% 포함)</TableCell>
                <TableCell className="text-right font-medium">{fmt(t.finalUnitPrice)}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  이론가 {fmtDec(t.pricePerCaseIncVat)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 font-bold">
                <TableCell>9. 총납품 예상가 (VAT 포함)</TableCell>
                <TableCell className="text-right">{fmt(t.finalUnitPrice)}</TableCell>
                <TableCell className="text-right text-primary">{fmt(t.totalAmount)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data.note && (
        <Card>
          <CardHeader><CardTitle>비고</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{data.note}</CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
