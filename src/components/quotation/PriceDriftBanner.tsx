"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("ko-KR") : "-";

interface DriftRow {
  location: string;
  materialName: string;
  quotedPrice: number;
  currentPrice: number;
  diff: number;
  diffRate: number | null;
  changedAt: string | null;
  changedBy: string | null;
  changeReason: string | null;
  matchedBy: "id" | "name";
  quotedCost: number;
  currentCost: number;
}

interface DriftReport {
  quotationNo: string;
  issuedAt: string;
  totalItems: number;
  matchedItems: number;
  unmatchedNames: string[];
  changed: DriftRow[];
  quotedCost: number;
  currentCost: number;
}

/**
 * "이 견적 이후 원료 단가가 변동됨" 안내.
 *
 * 견적서 금액은 발행 시점 스냅샷이라 여기서 아무것도 고치지 않는다.
 * 재견적할 때 어디를 다시 봐야 하는지만 짚어준다.
 */
export default function PriceDriftBanner({
  type, quotationId,
}: {
  type: "simple" | "detailed";
  quotationId: string;
}) {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const check = useCallback(() => {
    fetch(`/api/quotation/${type}/${quotationId}/price-check`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [type, quotationId]);

  useEffect(() => { check(); }, [check]);

  const recheck = () => { setLoading(true); check(); };

  if (loading && !report) return null;
  if (!report) return null;

  const changed = report.changed;
  const costDiff = report.currentCost - report.quotedCost;

  // 변동 없음 — 조용히 한 줄만 (재견적 판단에는 "확인했고 그대로다"도 정보다)
  if (changed.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        발행 이후 원료 단가 변동 없음
        {report.unmatchedNames.length > 0 && (
          <span>· 마스터에서 찾지 못한 원료 {report.unmatchedNames.length}건은 확인하지 못했습니다</span>
        )}
        <Button variant="ghost" size="sm" className="ml-auto" disabled={loading} onClick={recheck}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-amber-300 bg-amber-50 rounded-md">
      <div className="flex items-start gap-2 p-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-900">
            이 견적 이후 원료 단가가 변동됐습니다 — {changed.length}건
          </p>
          <p className="text-sm text-amber-800 mt-0.5">
            지금 단가로 다시 계산하면 원료비가{" "}
            <strong>{fmt(report.quotedCost)}원 → {fmt(report.currentCost)}원</strong>
            {costDiff !== 0 && (
              <> ({costDiff > 0 ? "+" : ""}{fmt(costDiff)}원)</>
            )}
            입니다. 견적서에 찍힌 금액은 발행 시점 그대로 두었습니다.
          </p>
          {report.unmatchedNames.length > 0 && (
            <p className="text-xs text-amber-700 mt-1">
              마스터에서 찾지 못한 원료 {report.unmatchedNames.length}건은 확인하지 못했습니다:{" "}
              {report.unmatchedNames.slice(0, 3).join(", ")}
              {report.unmatchedNames.length > 3 ? " 외" : ""}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" disabled={loading} onClick={recheck} title="다시 확인">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
          {open ? "접기" : "자세히"}
        </Button>
      </div>

      {open && (
        <div className="border-t border-amber-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>원료명</TableHead>
                <TableHead className="w-28">위치</TableHead>
                <TableHead className="w-28 text-right">견적 단가</TableHead>
                <TableHead className="w-28 text-right">현재 단가</TableHead>
                <TableHead className="w-24 text-right">변동</TableHead>
                <TableHead className="w-28 text-right">금액 영향</TableHead>
                <TableHead className="w-32">변경 시점</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changed.map((r, i) => {
                const up = r.diff > 0;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {r.materialName}
                      {r.matchedBy === "name" && (
                        <span className="ml-1 text-xs text-muted-foreground">(이름 대조)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.location}</TableCell>
                    <TableCell className="text-right">{fmt(r.quotedPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.currentPrice)}</TableCell>
                    <TableCell className={`text-right ${up ? "text-red-600" : "text-blue-600"}`}>
                      {up ? "+" : ""}{fmt(r.diff)}
                      {r.diffRate !== null && (
                        <span className="block text-xs">({up ? "+" : ""}{r.diffRate}%)</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right ${up ? "text-red-600" : "text-blue-600"}`}>
                      {up ? "+" : ""}{fmt(r.currentCost - r.quotedCost)}원
                    </TableCell>
                    <TableCell className="text-xs">
                      {fmtDate(r.changedAt)}
                      {r.changedBy && (
                        <span className="block text-muted-foreground">{r.changedBy}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
