"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const fmt = (n: number) => Math.round(n || 0).toLocaleString("ko-KR");
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("ko-KR") : "-");

interface PriceRow {
  id: string;
  price: number;
  effectiveDate: string;
  endDate: string | null;
  changedBy: string | null;
  changeReason: string | null;
}

function HistoryBody({ materialId }: { materialId: string }) {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [unit, setUnit] = useState("kg");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/materials/${materialId}/price-history`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => {
        setRows(res.history || []);
        setUnit(res.material?.unit || "kg");
      })
      .catch(() => toast.error("단가 이력을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [materialId]);

  return (
    <>
      {loading && <p className="text-sm text-muted-foreground py-4 text-center">불러오는 중...</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          기록된 단가 이력이 없습니다.
        </p>
      )}

      {!loading && rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">적용 시작</TableHead>
                <TableHead className="w-28">적용 종료</TableHead>
                <TableHead className="text-right">단가(원/{unit})</TableHead>
                <TableHead className="w-24 text-right">변동</TableHead>
                <TableHead>사유 / 기록자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => {
                // 최신순이라 바로 다음 행이 직전 단가다
                const prev = rows[i + 1];
                const diff = prev ? r.price - prev.price : null;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.effectiveDate)}</TableCell>
                    <TableCell>
                      {r.endDate ? fmtDate(r.endDate) : <Badge>현재</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.price)}</TableCell>
                    <TableCell
                      className={`text-right ${diff === null ? "" : diff > 0 ? "text-red-600" : diff < 0 ? "text-blue-600" : ""}`}
                    >
                      {diff === null ? "-" : diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${fmt(diff)}`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.changeReason || "-"}
                      {r.changedBy && (
                        <span className="block text-xs text-muted-foreground">{r.changedBy}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
      )}
    </>
  );
}

/** 원료 단가가 언제 얼마에서 얼마로 바뀌었는지. 현재 단가는 endDate 가 빈 행이다. */
export default function MaterialPriceHistoryDialog({
  materialId, materialName, onOpenChange,
}: {
  materialId: string | null;
  materialName?: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(materialId)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>단가 이력{materialName ? ` — ${materialName}` : ""}</DialogTitle>
          <DialogDescription>
            최신순입니다. 이미 발행된 견적서 금액은 이 이력과 무관하게 발행 시점 값 그대로 유지됩니다.
          </DialogDescription>
        </DialogHeader>

        {/* 열 때마다 새로 마운트해 직전 원료의 이력이 잠깐 비치지 않게 한다 */}
        {materialId && <HistoryBody materialId={materialId} />}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
