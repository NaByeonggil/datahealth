"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface Supplier { id: string; code: string; name: string; }
interface CatalogItem {
  id: string; name: string; category: string | null; origin: string | null;
  specification: string | null; packingUnit: number | null;
  refCode: string | null; note: string | null; sourceFile: string | null;
  supplier: { name: string };
  material: { id: string; code: string; unitPrice: number } | null;
}

export default function MaterialCatalogTable({ suppliers }: { suppliers: Supplier[] }) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (filterSupplier) params.set("supplierId", filterSupplier);
    if (search) params.set("search", search);
    fetch(`/api/material-catalog?${params}`).then(r => r.json()).then((res) => {
      setItems(res.data || []);
      setTotalCount(res.total || 0);
    });
  }, [filterSupplier, search, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        거래처가 &quot;취급 가능&quot;하다고 제시한 품목입니다. 단가가 없어 견적 원가계산에는 사용되지 않으며,
        단가를 확보하면 원료로 승격됩니다.
      </p>

      <div className="flex gap-2 items-center">
        <Label className="text-sm whitespace-nowrap">공급사:</Label>
        <Select value={filterSupplier || "all"} onValueChange={(v) => { setFilterSupplier(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="전체" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="max-w-xs" placeholder="품목명, 구분, 규격 검색" value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (setPage(1), fetchData())} />
        <Button variant="outline" onClick={() => { setPage(1); fetchData(); }}><Search className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>취급품목 ({totalCount}건)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">No.</TableHead>
                <TableHead>공급사</TableHead>
                <TableHead>품목명</TableHead>
                <TableHead>구분</TableHead>
                <TableHead>원산지</TableHead>
                <TableHead>규격/함량</TableHead>
                <TableHead className="text-right">포장단위</TableHead>
                <TableHead>고시번호</TableHead>
                <TableHead>원료 연결</TableHead>
                <TableHead>출처</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  등록된 취급품목이 없습니다.
                </TableCell></TableRow>
              )}
              {items.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-center text-muted-foreground">
                    {(currentPage - 1) * pageSize + i + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{c.supplier.name}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.category || "-"}</Badge></TableCell>
                  <TableCell>{c.origin || "-"}</TableCell>
                  <TableCell className="max-w-[220px] truncate" title={c.specification || ""}>
                    {c.specification || "-"}
                  </TableCell>
                  <TableCell className="text-right">{c.packingUnit != null ? `${c.packingUnit}kg` : "-"}</TableCell>
                  <TableCell>{c.refCode || "-"}</TableCell>
                  <TableCell>
                    {c.material
                      ? <Badge variant="default">{c.material.code} · {c.material.unitPrice.toLocaleString("ko-KR")}원</Badge>
                      : <Badge variant="secondary">단가 미확보</Badge>}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground" title={c.sourceFile || ""}>
                    {c.sourceFile || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">페이지당</Label>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[20, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm px-2">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
