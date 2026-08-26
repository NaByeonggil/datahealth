"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, FileDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buildSimpleQuotationExport } from "@/lib/exports/buildSimpleQuotationExport";
import { exportSimpleQuotationPdf } from "@/lib/exports/simpleQuotationPdf";
import { exportSimpleQuotationExcel } from "@/lib/exports/simpleQuotationExcel";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface QuotationRow {
  id: string;
  quotationNo: string;
  productName: string;
  customerName: string | null;
  totalAmount: number;
  /** 제품이 여러 개면 제형을 모아 한 줄로 */
  productTypes: string;
  createdAt: string;
}

/** API 응답 → 목록 행 */
interface ApiRow {
  id: string;
  quotationNo: string;
  productName: string;
  customerName: string | null;
  totalAmount: number;
  products?: { productType?: { name?: string } | null }[];
  createdAt: string;
}

export default function SimpleQuotationList() {
  const router = useRouter();
  const [data, setData] = useState<QuotationRow[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  /** 내보내기 진행 중인 행 id — 중복 클릭 방지 */
  const [exporting, setExporting] = useState<string | null>(null);
  /** 삭제 확인 대상 */
  const [deleteTarget, setDeleteTarget] = useState<QuotationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 목록에는 요약 정보만 있어 원본을 다시 받아 조립한다
  const handleExport = async (id: string, kind: "pdf" | "excel") => {
    setExporting(id);
    try {
      const [res, coRes] = await Promise.all([
        fetch(`/api/quotation/simple/${id}`),
        fetch("/api/settings/company"),
      ]);
      if (!res.ok) throw new Error("불러오기 실패");
      const full = await res.json();
      const company = coRes.ok ? await coRes.json() : undefined;
      const { data: exportData } = buildSimpleQuotationExport(full, company);
      if (kind === "pdf") exportSimpleQuotationPdf(exportData);
      else exportSimpleQuotationExcel(exportData);
    } catch {
      toast.error(kind === "pdf" ? "PDF 내보내기에 실패했습니다." : "Excel 내보내기에 실패했습니다.");
    } finally {
      setExporting(null);
    }
  };

  const fetchData = (s?: string) => {
    const q = s !== undefined ? s : search;
    fetch(`/api/quotation/simple?search=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((res) => {
        setData(
          (res.data as ApiRow[]).map((q) => ({
            id: q.id,
            quotationNo: q.quotationNo,
            productName: q.productName,
            customerName: q.customerName,
            totalAmount: q.totalAmount,
            productTypes: (q.products ?? [])
              .map((p) => p.productType?.name)
              .filter((v, i, a) => v && a.indexOf(v) === i)
              .join(" / "),
            createdAt: q.createdAt,
          }))
        );
        setTotal(res.total);
      });
  };

  useEffect(() => { fetchData(""); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotation/simple/${deleteTarget.id}`, { method: "DELETE" });
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">일반견적서 목록</h2>
        <Link href="/quotation/simple/new">
          <Button><Plus className="h-4 w-4 mr-2" />새 견적서 작성</Button>
        </Link>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input placeholder="제품명, 고객사, 견적번호 검색" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData()} />
        <Button variant="outline" onClick={() => fetchData()}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>견적서 ({total}건)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>견적번호</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead>고객사</TableHead>
                <TableHead>제품유형</TableHead>
                <TableHead className="text-right">총금액</TableHead>
                <TableHead>작성일</TableHead>
                <TableHead className="w-40 text-center">출력</TableHead>
                <TableHead className="w-24 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    등록된 견적서가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {data.map((q) => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/quotation/simple/${q.id}`)}>
                  <TableCell className="font-mono text-sm">{q.quotationNo}</TableCell>
                  <TableCell className="font-medium">{q.productName}</TableCell>
                  <TableCell>{q.customerName || "-"}</TableCell>
                  <TableCell>{q.productTypes || "-"}</TableCell>
                  {/* 포장 옵션 택일 견적서는 합계를 내지 않아 0으로 저장된다 */}
                  <TableCell className="text-right">
                    {q.totalAmount ? `${Math.round(q.totalAmount).toLocaleString()}원` : "-"}
                  </TableCell>
                  <TableCell>{new Date(q.createdAt).toLocaleDateString("ko-KR")}</TableCell>
                  {/* 행 클릭(상세 이동)과 겹치지 않게 이벤트를 막는다 */}
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={exporting === q.id}
                        onClick={() => handleExport(q.id, "pdf")}
                      >
                        {exporting === q.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <FileDown className="h-3.5 w-3.5 mr-1" />}
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={exporting === q.id}
                        onClick={() => handleExport(q.id, "excel")}
                      >
                        <FileDown className="h-3.5 w-3.5 mr-1" />Excel
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-center">
                      <Button variant="outline" size="sm" title="수정"
                        onClick={() => router.push(`/quotation/simple/${q.id}/edit`)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" title="삭제"
                        onClick={() => setDeleteTarget(q)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
            ? `${deleteTarget.quotationNo} · ${deleteTarget.productName}\n배합·포장옵션까지 모두 지워지며 되돌릴 수 없습니다.`
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
