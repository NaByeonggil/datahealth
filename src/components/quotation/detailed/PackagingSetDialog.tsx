"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

export interface PackagingSetItemRow {
  id: string;
  name: string;
  spec?: string | null;
  unitPrice: number;
  qtyPerUnit: number;
  isFreeIssue: boolean;
  note?: string | null;
}

export interface PackagingSetRow {
  id: string;
  code: string;
  name: string;
  formName?: string | null;
  vendorName?: string | null;
  sourceFile?: string | null;
  items: PackagingSetItemRow[];
}

const fmt = (n: number) => Math.round(n || 0).toLocaleString("ko-KR");
export const packagingSetTotal = (items: PackagingSetItemRow[]) =>
  items.reduce((sum, i) => sum + (i.isFreeIssue ? 0 : i.unitPrice * (i.qtyPerUnit || 1)), 0);

export default function PackagingSetDialog({
  open,
  onOpenChange,
  defaultSearch,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSearch?: string;
  onApply: (set: PackagingSetRow) => void;
}) {
  const [search, setSearch] = useState(defaultSearch || "");
  const [sets, setSets] = useState<PackagingSetRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchSets = useCallback(() => {
    fetch(`/api/packaging/sets?search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((res) => setSets(Array.isArray(res) ? res : res.data || []));
  }, [search]);

  useEffect(() => {
    if (open) fetchSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>부자재 세트 불러오기</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input placeholder="세트명, 제형, 업체 검색" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchSets()} />
          <Button variant="outline" onClick={fetchSets}><Search className="h-4 w-4" /></Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>세트명</TableHead>
              <TableHead>제형/유형</TableHead>
              <TableHead>업체</TableHead>
              <TableHead className="text-center">구성</TableHead>
              <TableHead className="text-right">세트 단가</TableHead>
              <TableHead className="w-20 text-center">적용</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  등록된 세트가 없습니다.
                </TableCell>
              </TableRow>
            )}
            {sets.map((s) => (
              <>
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.formName || "-"}</TableCell>
                  <TableCell>{s.vendorName || "-"}</TableCell>
                  <TableCell className="text-center">{s.items.length}개</TableCell>
                  <TableCell className="text-right font-medium">{fmt(packagingSetTotal(s.items))}원</TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" onClick={() => { onApply(s); onOpenChange(false); }}>적용</Button>
                  </TableCell>
                </TableRow>
                {expanded === s.id && (
                  <TableRow key={`${s.id}-detail`}>
                    <TableCell colSpan={6} className="bg-muted/30 text-sm">
                      {s.items.map((i) => (
                        <span key={i.id} className="inline-block mr-3">
                          {i.name} {fmt(i.unitPrice)}원
                          {i.isFreeIssue && <Badge variant="secondary" className="ml-1">사급</Badge>}
                        </span>
                      ))}
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
