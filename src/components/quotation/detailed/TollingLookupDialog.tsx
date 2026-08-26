"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

export interface TollingRateRow {
  id: string;
  vendorName: string;
  formName: string;
  specLabel?: string | null;
  qtyMin: number;
  qtyMax?: number | null;
  unitCost: number;
  costBasis: string;
  supplyMode: string;
  includesProfit: boolean;
  isNegotiable: boolean;
  effectiveDate: string;
  sourceFile?: string | null;
  note?: string | null;
}

export interface TollingExtraRow {
  id: string;
  name: string;
  vendorName?: string | null;
  formName?: string | null;
  calcType: string;
  amount: number;
  condition?: string | null;
}

interface Candidate {
  rate: TollingRateRow;
  belowMoq: boolean;
  specMismatch: boolean;
  reasons: string[];
}

const fmt = (n: number) => Math.round(n || 0).toLocaleString("ko-KR");
const BASIS: Record<string, string> = {
  per_unit: "개", per_case: "case", per_bottle: "병", per_tablet: "정",
};
const MODE: Record<string, string> = { bulk: "벌크", semi: "반제품", finished: "완제품" };

export default function TollingLookupDialog({
  open,
  onOpenChange,
  defaultFormName,
  defaultQuantity,
  defaultSpecValue,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultFormName: string;
  defaultQuantity: number;
  defaultSpecValue?: number;
  onApply: (rate: TollingRateRow, extras: TollingExtraRow[]) => void;
}) {
  const [formName, setFormName] = useState(defaultFormName);
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [extras, setExtras] = useState<TollingExtraRow[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const search = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ formName, quantity: String(quantity) });
    if (defaultSpecValue) qs.set("specValue", String(defaultSpecValue));
    fetch(`/api/tolling/resolve?${qs}`)
      .then((r) => r.json())
      .then((res) => {
        setCandidates(res.candidates || []);
        setExtras(res.extras || []);
      })
      .finally(() => setLoading(false));
  }, [formName, quantity, defaultSpecValue]);

  useEffect(() => {
    if (!open) return;
    setFormName(defaultFormName);
    setQuantity(defaultQuantity);
    setChecked(new Set());
  }, [open, defaultFormName, defaultQuantity]);

  useEffect(() => {
    if (open) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>임가공비 조회</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Label>제형/유형</Label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()} placeholder="액상스틱, 20ml 바이알 ..." />
          </div>
          <div className="w-40">
            <Label>수량</Label>
            <Input type="number" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && search()} />
          </div>
          <Button variant="outline" onClick={search}>
            <Search className="h-4 w-4 mr-1" />조회
          </Button>
          <p className="text-xs text-muted-foreground ml-auto">
            업체마다 단가가 다르므로 후보를 모두 보여줍니다. 적용할 단가를 고르세요.
          </p>
        </div>

        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>업체</TableHead>
              <TableHead>제형/유형</TableHead>
              <TableHead>규격</TableHead>
              <TableHead className="text-right">수량구간</TableHead>
              <TableHead className="text-right">단가</TableHead>
              <TableHead>납품</TableHead>
              <TableHead className="w-24">기준일</TableHead>
              <TableHead className="w-20 text-center sticky right-0 bg-background shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">적용</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && candidates.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  조건에 맞는 단가가 없습니다. 제형 이름을 바꿔 조회해보세요.
                </TableCell>
              </TableRow>
            )}
            {candidates.map((c) => (
              <TableRow key={c.rate.id} className={c.belowMoq ? "bg-amber-50" : ""}>
                <TableCell className="font-medium">{c.rate.vendorName}</TableCell>
                <TableCell>{c.rate.formName}</TableCell>
                <TableCell className="text-xs">{c.rate.specLabel || "-"}</TableCell>
                <TableCell className="text-right text-xs">
                  {fmt(c.rate.qtyMin)} ~ {c.rate.qtyMax ? fmt(c.rate.qtyMax) : "이상"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {fmt(c.rate.unitCost)}원/{BASIS[c.rate.costBasis] || "개"}
                </TableCell>
                <TableCell className="text-xs">
                  {MODE[c.rate.supplyMode] || c.rate.supplyMode}
                  {c.rate.includesProfit && <Badge variant="secondary" className="ml-1">이윤포함</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground" title={c.rate.sourceFile || ""}>
                  {new Date(c.rate.effectiveDate).toLocaleDateString("ko-KR")}
                </TableCell>
                <TableCell className="text-center sticky right-0 bg-background shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                  <Button size="sm" onClick={() => {
                    onApply(c.rate, extras.filter((e) => checked.has(e.id)));
                    onOpenChange(false);
                  }}>
                    적용
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {candidates.some((c) => c.belowMoq) && (
          <p className="text-xs text-amber-700">
            ⚠ 노란 행은 해당 단가의 최소수량(MOQ)에 미달합니다. 할증 또는 협의가 필요할 수 있습니다.
          </p>
        )}

        {extras.length > 0 && (
          <div className="border-t pt-3">
            <Label className="mb-2 block">함께 적용할 추가 공정비</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {extras.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1">
                  <input type="checkbox" checked={checked.has(e.id)} onChange={() => toggle(e.id)} />
                  <span className="flex-1">
                    {e.name}
                    {e.vendorName ? ` (${e.vendorName})` : ""}
                    {e.formName ? <span className="text-muted-foreground"> · {e.formName}</span> : null}
                  </span>
                  <span className="text-muted-foreground">
                    {e.calcType === "percent" ? `${e.amount}%` : `${fmt(e.amount)}원`}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
