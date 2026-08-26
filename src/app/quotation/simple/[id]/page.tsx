"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FileDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CompanyInfoType } from "@/lib/company/supplier";
import {
  buildQuotationNote, FOOD_TYPES, NoteTemplateLike,
} from "@/lib/quotation/quotationNote";
import {
  buildSimpleQuotationExport, SavedQuotation,
} from "@/lib/exports/buildSimpleQuotationExport";
import { exportSimpleQuotationPdf } from "@/lib/exports/simpleQuotationPdf";
import { exportSimpleQuotationExcel } from "@/lib/exports/simpleQuotationExcel";
import ConfirmDialog from "@/components/common/ConfirmDialog";

/** API 응답 — 화면 표시에 필요한 항목만 추린 형태 */
interface Quotation extends SavedQuotation {
  id: string;
  createdAt: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

export default function SimpleQuotationDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<Quotation | null>(null);
  const [company, setCompany] = useState<CompanyInfoType | undefined>();
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplateLike[]>([]);
  const [savingFoodType, setSavingFoodType] = useState(false);
  /** 특기사항 편집 상태 — null 이면 편집 중이 아니다 */
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  /** 삭제 확인 다이얼로그 */
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotation/simple/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("견적서가 삭제되었습니다.");
      router.push("/quotation/simple");
    } catch {
      toast.error("삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetch(`/api/quotation/simple/${id}`).then((r) => r.json()).then(setData);
    fetch("/api/settings/company")
      .then((r) => (r.ok ? r.json() : undefined)).then(setCompany).catch(() => undefined);
    fetch("/api/settings/quotation-notes?activeOnly=1")
      .then((r) => (r.ok ? r.json() : [])).then(setNoteTemplates).catch(() => undefined);
  }, [id]);

  /** 특기사항 조립에 쓸 제품 정보 */
  const noteProducts = (d: Quotation) =>
    (d.products ?? []).map((p) => ({
      name: p.name, formCode: p.productType?.formCode,
      typeName: p.productType?.name, items: p.items,
    }));

  /**
   * 식품유형 변경 — 특기사항이 아직 자동 생성된 그대로면 새 조건에 맞춰 같이 고친다.
   * 손으로 고친 문구는 건드리지 않는다.
   */
  const changeFoodType = async (next: string) => {
    if (!data) return;
    setSavingFoodType(true);
    try {
      const prevAuto = buildQuotationNote(noteTemplates, { foodType: data.foodType, products: noteProducts(data) });
      const nextAuto = buildQuotationNote(noteTemplates, { foodType: next, products: noteProducts(data) });
      const keepNote = (data.note ?? "").trim() !== prevAuto.trim();
      const res = await fetch(`/api/quotation/simple/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keepNote ? { foodType: next } : { foodType: next, note: nextAuto }),
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
      toast.success(
        keepNote
          ? "식품유형을 변경했습니다. (특기사항은 직접 수정하신 내용이라 유지했습니다)"
          : "식품유형과 특기사항을 변경했습니다."
      );
    } catch {
      toast.error("변경에 실패했습니다.");
    } finally {
      setSavingFoodType(false);
    }
  };

  const saveNote = async (next: string) => {
    setSavingNote(true);
    try {
      const res = await fetch(`/api/quotation/simple/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: next }),
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setNoteDraft(null);
      toast.success("특기사항을 저장했습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSavingNote(false);
    }
  };

  if (!data) return <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>;

  const { data: exportData, calc } = buildSimpleQuotationExport(data, company);
  const products = data.products ?? [];

  const handleExportPdf = () => {
    try { exportSimpleQuotationPdf(exportData); }
    catch { toast.error("PDF 내보내기에 실패했습니다."); }
  };
  const handleExportExcel = () => {
    try { exportSimpleQuotationExcel(exportData); }
    catch { toast.error("Excel 내보내기에 실패했습니다."); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/quotation/simple")}>
          <ArrowLeft className="h-4 w-4 mr-1" />목록
        </Button>
        <h2 className="text-xl font-bold flex-1">일반견적서 상세</h2>
        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <FileDown className="h-4 w-4 mr-1" />PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel}>
          <FileDown className="h-4 w-4 mr-1" />Excel
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => router.push(`/quotation/simple/${id}/edit`)}>
          <Pencil className="h-4 w-4 mr-1" />수정
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4 mr-1 text-destructive" />삭제
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="견적서를 삭제할까요?"
        description={`${data.quotationNo} · ${data.productName}\n배합·포장옵션까지 모두 지워지며 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />

      {/* 기본 정보 */}
      <Card>
        <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">견적번호</p>
            <p className="font-mono">{data.quotationNo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">견적서 제목</p>
            <p>{data.productName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">고객사</p>
            <p>{data.customerName || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">작성일</p>
            <p>{new Date(data.createdAt).toLocaleDateString("ko-KR")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">식품유형</p>
            <Select value={data.foodType || "건강기능식품"} disabled={savingFoodType}
              onValueChange={changeFoodType}>
              <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FOOD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              바꾸면 특기사항 문구도 함께 갱신됩니다
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 제품마다 배합 + 포장옵션 */}
      {products.map((p, pi) => {
        const pc = calc.products[pi];
        return (
          <Card key={pi} className="border-primary/30">
            <CardHeader>
              <CardTitle>
                제품 {pi + 1} · {p.name}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {p.productType?.name}
                  {p.productSpec ? ` · ${p.productSpec}` : ""}
                  {p.dosage ? ` · ${p.dosage}` : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <p className="text-xs font-medium mb-2">원료 목록</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No.</TableHead>
                      <TableHead className="w-24">구분</TableHead>
                      <TableHead className="w-24">주/부원료</TableHead>
                      <TableHead>원료명</TableHead>
                      <TableHead className="w-28 text-right">이론량(mg)</TableHead>
                      <TableHead className="w-28 text-right">Kg당단가(원)</TableHead>
                      <TableHead className="w-24 text-right">원료비(원)</TableHead>
                      <TableHead className="w-24">원산지</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(p.items ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        원료가 없습니다.
                      </TableCell></TableRow>
                    )}
                    {(p.items ?? []).map((it, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-center">{i + 1}</TableCell>
                        <TableCell>{it.category}</TableCell>
                        <TableCell>{it.role || "주원료"}</TableCell>
                        <TableCell className="font-medium">{it.materialName}</TableCell>
                        <TableCell className="text-right">{it.theoryAmount}</TableCell>
                        <TableCell className="text-right">{fmt(it.kgUnitPrice)}</TableCell>
                        <TableCell className="text-right">{fmt(it.materialCost)}</TableCell>
                        <TableCell>{it.origin || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 bg-gray-50 rounded-md">
                  <p className="text-xs text-muted-foreground">1정당 원료비</p>
                  <p className="font-bold">{fmt(pc?.materialCostPerUnit ?? 0)}원</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-md">
                  <p className="text-xs text-muted-foreground">부원료비</p>
                  <p className="font-bold">{fmt(pc?.subMaterialCostPerUnit ?? 0)}원</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-md">
                  <p className="text-xs text-muted-foreground">공임비</p>
                  <p className="font-bold">{fmt(pc?.processingCostPerUnit ?? 0)}원</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-md">
                  <p className="text-xs text-muted-foreground">1정당 합계</p>
                  <p className="font-bold text-blue-700">{fmt(pc?.perUnitCost ?? 0)}원</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <p className="text-xs font-medium mb-2">포장 옵션</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No.</TableHead>
                      <TableHead>옵션</TableHead>
                      <TableHead className="text-right">포장단위</TableHead>
                      <TableHead className="text-right">병+박스</TableHead>
                      <TableHead className="text-right">세트수</TableHead>
                      <TableHead>단위</TableHead>
                      <TableHead className="text-right">제조원가</TableHead>
                      <TableHead className="text-right">1박스원가</TableHead>
                      <TableHead className="text-right">공급가액</TableHead>
                      <TableHead className="text-right">세액 (10%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pc?.lines ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                        포장 옵션이 없습니다.
                      </TableCell></TableRow>
                    )}
                    {(pc?.lines ?? []).map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{l.no}</TableCell>
                        <TableCell className="font-medium">{l.packagingMethod || l.displayLabel}</TableCell>
                        <TableCell className="text-right">{l.packageUnit}</TableCell>
                        <TableCell className="text-right">{fmt(l.bottleBoxCost)}원</TableCell>
                        <TableCell className="text-right">{fmt(l.setCount)}</TableCell>
                        <TableCell>{l.unit || "박스"}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(l.manufacturingCost)}원</TableCell>
                        <TableCell className="text-right">{fmt(l.subtotal)}원</TableCell>
                        <TableCell className="text-right font-medium">{fmt(l.supplyAmount)}원</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(l.vatAmount)}원</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* 견적 총액 */}
      <Card>
        <CardHeader><CardTitle>견적 총액</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {calc.lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-sm font-medium">{l.no} · {l.productName} {l.displayLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    1박스원가 {fmt(l.subtotal)}원 x {fmt(l.setCount)}{l.unit || "박스"}
                  </p>
                </div>
                <p className="text-lg font-bold">{fmt(l.supplyAmount)}원</p>
              </div>
            ))}
          </div>
          {data.sumOptions ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-muted-foreground">총원가</p>
                <p className="text-lg font-bold">{fmt(calc.totalCost)}원</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-muted-foreground">세액 (10%)</p>
                <p className="text-lg font-bold">{fmt(calc.vatAmount)}원</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-md">
                <p className="text-xs text-muted-foreground">공급가액 (부가세 별도)</p>
                <p className="text-xl font-bold text-primary">{fmt(calc.supplyAmount)}원</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md">
              포장 옵션 중 <strong>택일</strong>하는 견적이라 합계를 내지 않습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 특기사항 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>특기사항</CardTitle>
            <div className="flex gap-2">
              {noteDraft === null ? (
                <Button variant="outline" size="sm" onClick={() => setNoteDraft(data.note ?? "")}>
                  수정
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm"
                    disabled={savingNote || noteTemplates.length === 0}
                    onClick={() =>
                      setNoteDraft(buildQuotationNote(noteTemplates, {
                        foodType: data.foodType, products: noteProducts(data),
                      }))
                    }>
                    기본 문구 다시 넣기
                  </Button>
                  <Button variant="ghost" size="sm" disabled={savingNote}
                    onClick={() => setNoteDraft(null)}>취소</Button>
                  <Button size="sm" disabled={savingNote} onClick={() => saveNote(noteDraft)}>저장</Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {noteDraft === null ? (
            <p className="whitespace-pre-wrap text-sm">
              {data.note || <span className="text-muted-foreground">내용이 없습니다.</span>}
            </p>
          ) : (
            <>
              <Textarea rows={8} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-2">
                <strong>기본 문구 다시 넣기</strong>를 누르면 현재 식품유형({data.foodType || "-"})과
                제형에 맞는 문구로 바뀝니다. 기존 내용은 대체됩니다.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
