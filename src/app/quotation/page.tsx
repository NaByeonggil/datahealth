"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Sheet, Plus, Pencil, Trash2, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { buildSimpleQuotationExport } from "@/lib/exports/buildSimpleQuotationExport";
import { exportSimpleQuotationPdf } from "@/lib/exports/simpleQuotationPdf";
import { exportSimpleQuotationExcel } from "@/lib/exports/simpleQuotationExcel";
import { exportToExcel, exportToPDF } from "@/utils/exportDetailedQuotation";
import { DetailedQuotationType } from "@/types/quotation";

type QuotationKind = "simple" | "detailed";

interface QuotationRow {
  id: string;
  quotationNo: string;
  productName: string;
  customerName: string | null;
  type: QuotationKind;
  typeLabel: string;
  productType: string;
  totalAmount: number;
  createdAt: string;
}

export default function AllQuotationList() {
  const router = useRouter();
  const [data, setData] = useState<QuotationRow[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [total, setTotal] = useState(0);
  /** 내보내기 진행 중인 행 — 중복 클릭 방지 */
  const [exporting, setExporting] = useState<string | null>(null);
  /** 삭제 확인 대상 */
  const [deleteTarget, setDeleteTarget] = useState<QuotationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(
    (s?: string, t?: string) => {
      const q = s !== undefined ? s : search;
      const filter = t !== undefined ? t : typeFilter;

      Promise.all([
        filter !== "detailed"
          ? fetch(`/api/quotation/simple?search=${encodeURIComponent(q)}&limit=100`).then((r) => r.json())
          : Promise.resolve({ data: [] }),
        filter !== "simple"
          ? fetch(`/api/quotation/detailed?search=${encodeURIComponent(q)}&limit=100`).then((r) => r.json())
          : Promise.resolve({ data: [] }),
      ])
        .then(([simpleRes, detailedRes]) => {
          const simpleRows: QuotationRow[] = (simpleRes.data || []).map(
            (q: Record<string, unknown>) => ({
              id: q.id as string,
              quotationNo: q.quotationNo as string,
              productName: q.productName as string,
              customerName: (q.customerName as string) ?? null,
              type: "simple" as const,
              typeLabel: "일반",
              // 제품이 여러 개면 제형을 모아 보여준다
              productType: ((q.products as { productType?: { name?: string } }[]) || [])
                .map((p) => p.productType?.name)
                .filter((v, i, a) => v && a.indexOf(v) === i)
                .join(" / "),
              totalAmount: (q.totalAmount as number) || 0,
              createdAt: q.createdAt as string,
            })
          );
          const detailedRows: QuotationRow[] = (detailedRes.data || []).map(
            (q: Record<string, unknown>) => ({
              id: q.id as string,
              quotationNo: q.quotationNo as string,
              productName: q.productName as string,
              customerName: (q.customerName as string) ?? null,
              type: "detailed" as const,
              typeLabel: "상세",
              productType: (q.productType as string) || "",
              totalAmount: (q.totalAmount as number) || 0,
              createdAt: q.createdAt as string,
            })
          );
          const merged = [...simpleRows, ...detailedRows].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setData(merged);
          setTotal(merged.length);
        })
        .catch(() => toast.error("견적서를 불러오지 못했습니다."));
    },
    [search, typeFilter]
  );

  useEffect(() => {
    fetchData(undefined, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const detailHref = (row: QuotationRow) => `/quotation/${row.type}/${row.id}`;
  const editHref = (row: QuotationRow) => `/quotation/${row.type}/${row.id}/edit`;

  /** 목록에는 요약만 있어 원본을 다시 받아 내보낸다 */
  const handleExport = async (row: QuotationRow, kind: "pdf" | "excel") => {
    const key = `${row.type}-${row.id}`;
    setExporting(key);
    try {
      if (row.type === "simple") {
        const [res, coRes] = await Promise.all([
          fetch(`/api/quotation/simple/${row.id}`),
          fetch("/api/settings/company"),
        ]);
        if (!res.ok) throw new Error();
        const full = await res.json();
        const company = coRes.ok ? await coRes.json() : undefined;
        const { data: exportData } = buildSimpleQuotationExport(full, company);
        if (kind === "pdf") exportSimpleQuotationPdf(exportData);
        else exportSimpleQuotationExcel(exportData);
      } else {
        const res = await fetch(`/api/quotation/detailed/${row.id}`);
        if (!res.ok) throw new Error();
        const full: DetailedQuotationType = await res.json();
        if (kind === "pdf") await exportToPDF(full);
        else exportToExcel(full);
      }
    } catch {
      toast.error(kind === "pdf" ? "PDF 내보내기에 실패했습니다." : "Excel 내보내기에 실패했습니다.");
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotation/${deleteTarget.type}/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(`${deleteTarget.quotationNo} 견적서를 삭제했습니다.`);
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold">전체 견적서</h2>
        <div className="flex gap-2">
          <Link href="/quotation/simple/new">
            <Button variant="outline"><Plus className="h-4 w-4 mr-1" />일반견적서</Button>
          </Link>
          <Link href="/quotation/detailed/new">
            <Button><Plus className="h-4 w-4 mr-1" />상세견적서</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 max-w-2xl">
        <Input
          placeholder="제품명, 고객사, 견적번호 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData()}
        />
        <Button variant="outline" onClick={() => fetchData()}>
          <Search className="h-4 w-4" />
        </Button>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="simple">일반</SelectItem>
            <SelectItem value="detailed">상세</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>견적서 ({total}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">유형</TableHead>
                <TableHead>견적번호</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead>고객사</TableHead>
                <TableHead>제품유형</TableHead>
                <TableHead className="text-right">총금액</TableHead>
                <TableHead>작성일</TableHead>
                <TableHead className="text-center">출력</TableHead>
                <TableHead className="w-24 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    등록된 견적서가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {data.map((q) => {
                const key = `${q.type}-${q.id}`;
                return (
                  <TableRow
                    key={key}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(detailHref(q))}
                  >
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          q.type === "simple"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {q.typeLabel}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{q.quotationNo}</TableCell>
                    <TableCell className="font-medium">{q.productName}</TableCell>
                    <TableCell>{q.customerName || "-"}</TableCell>
                    <TableCell>{q.productType || "-"}</TableCell>
                    <TableCell className="text-right">
                      {q.totalAmount ? `${Math.round(q.totalAmount).toLocaleString()}원` : "-"}
                    </TableCell>
                    <TableCell>{new Date(q.createdAt).toLocaleDateString("ko-KR")}</TableCell>

                    {/* 행 클릭(상세 이동)과 겹치지 않게 이벤트를 막는다 */}
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-center flex-wrap">
                        <Button variant="outline" size="sm" disabled={exporting === key}
                          onClick={() => handleExport(q, "pdf")}>
                          {exporting === key
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <FileDown className="h-3.5 w-3.5 mr-1" />}
                          PDF
                        </Button>
                        <Button variant="outline" size="sm" disabled={exporting === key}
                          onClick={() => handleExport(q, "excel")}>
                          <FileDown className="h-3.5 w-3.5 mr-1" />Excel
                        </Button>
                        {q.type === "detailed" && (
                          <>
                            <Button variant="outline" size="sm" title="엑셀 양식으로 보기"
                              onClick={() => router.push(`/quotation/detailed/${q.id}?view=sheet`)}>
                              <Sheet className="h-3.5 w-3.5 mr-1" />양식
                            </Button>
                            <Button variant="outline" size="sm" title="엑셀 양식2 (원본 시트 그대로)"
                              onClick={() => router.push(`/quotation/detailed/${q.id}?view=sheet2`)}>
                              <Sheet className="h-3.5 w-3.5 mr-1" />양식2
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-center">
                        <Button variant="outline" size="sm" title="수정"
                          onClick={() => router.push(editHref(q))}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" title="삭제"
                          onClick={() => setDeleteTarget(q)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="견적서를 삭제할까요?"
        description={
          deleteTarget
            ? `${deleteTarget.quotationNo} · ${deleteTarget.productName}\n배합·포장옵션 등 하위 내용까지 모두 지워지며 되돌릴 수 없습니다.`
            : undefined
        }
        confirmLabel="삭제"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
