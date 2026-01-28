"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

const TABLE_LABELS: Record<string, string> = {
  material: "원료", supply: "자재", process: "공정", customer: "고객사", productType: "제품유형",
};

interface HistoryItem {
  id: string; fileName: string; fileType: string; targetTable: string;
  totalRows: number; successCount: number; errorCount: number; warningCount: number;
  status: string; errorLog: string | null; createdBy: string | null; createdAt: string;
  template: { name: string } | null;
}

export default function ImportHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filterTable, setFilterTable] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [detailLog, setDetailLog] = useState<string | null>(null);

  const fetchData = () => {
    const params = new URLSearchParams();
    if (filterTable) params.set("targetTable", filterTable);
    if (filterStatus) params.set("status", filterStatus);
    fetch(`/api/import/history?${params}`).then(r => r.json()).then(setHistory);
  };

  useEffect(() => { fetchData(); }, [filterTable, filterStatus]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge variant="default">성공</Badge>;
      case "partial": return <Badge variant="secondary">일부</Badge>;
      case "failed": return <Badge variant="destructive">실패</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">임포트 이력</h2>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">대상:</span>
          <Select value={filterTable || "all"} onValueChange={(v) => setFilterTable(v === "all" ? "" : v)}>
            <SelectTrigger className="w-28"><SelectValue placeholder="전체" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {Object.entries(TABLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">상태:</span>
          <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-28"><SelectValue placeholder="전체" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="success">성공</SelectItem>
              <SelectItem value="partial">일부</SelectItem>
              <SelectItem value="failed">실패</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>이력 목록</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>파일명</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>템플릿</TableHead>
                <TableHead className="text-right">결과</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-16">로그</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">임포트 이력이 없습니다.</TableCell></TableRow>
              )}
              {history.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="text-sm">{new Date(h.createdAt).toLocaleString("ko-KR")}</TableCell>
                  <TableCell className="font-medium">{h.fileName}</TableCell>
                  <TableCell><Badge variant="outline">{TABLE_LABELS[h.targetTable] || h.targetTable}</Badge></TableCell>
                  <TableCell className="text-sm">{h.template?.name || "-"}</TableCell>
                  <TableCell className="text-right text-sm">{h.successCount}/{h.totalRows}건</TableCell>
                  <TableCell>{statusBadge(h.status)}</TableCell>
                  <TableCell>
                    {h.errorLog && (
                      <Button variant="ghost" size="sm" onClick={() => setDetailLog(h.errorLog)}>
                        <ClipboardList className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>오류/경고 상세 로그</DialogTitle></DialogHeader>
          <pre className="text-xs bg-muted p-4 rounded whitespace-pre-wrap">{detailLog && JSON.stringify(JSON.parse(detailLog), null, 2)}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
