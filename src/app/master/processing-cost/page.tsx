"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ProductType {
  id: string; code: string; name: string; processingCost: number;
}
interface CostHistory {
  id: string; cost: number; effectiveDate: string;
  changeReason: string | null; changedBy: string | null; isCurrent: boolean;
  productType: { name: string };
}

export default function ProcessingCostPage() {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [history, setHistory] = useState<CostHistory[]>([]);
  const [filterType, setFilterType] = useState("");
  const [newCosts, setNewCosts] = useState<Record<string, { cost: string; reason: string }>>({});

  useEffect(() => {
    fetch("/api/product-types?all=true").then(r => r.json()).then(setTypes);
    fetchHistory();
  }, []);

  const fetchHistory = (typeId?: string) => {
    const url = typeId ? `/api/processing-costs?productTypeId=${typeId}` : "/api/processing-costs";
    fetch(url).then(r => r.json()).then(setHistory);
  };

  const handleApply = async (typeId: string) => {
    const entry = newCosts[typeId];
    if (!entry?.cost) { toast.error("변경 가공비를 입력해주세요."); return; }
    const res = await fetch("/api/processing-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productTypeId: typeId,
        cost: Number(entry.cost),
        changeReason: entry.reason || null,
        changedBy: "홍길동",
      }),
    });
    if (res.ok) {
      toast.success("가공비가 변경되었습니다.");
      fetch("/api/product-types?all=true").then(r => r.json()).then(setTypes);
      fetchHistory(filterType || undefined);
      setNewCosts(prev => ({ ...prev, [typeId]: { cost: "", reason: "" } }));
    }
  };

  const fmt = (n: number) => n.toLocaleString("ko-KR");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">가공비 관리</h2>

      <Card>
        <CardHeader><CardTitle>현재 가공비 설정</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제품유형</TableHead>
                <TableHead className="text-right">현재 가공비</TableHead>
                <TableHead className="w-32">변경 가공비</TableHead>
                <TableHead className="w-40">변경 사유</TableHead>
                <TableHead className="w-24">적용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-right">{fmt(t.processingCost)}원</TableCell>
                  <TableCell>
                    <Input className="h-8" type="number" placeholder="새 단가"
                      value={newCosts[t.id]?.cost || ""}
                      onChange={(e) => setNewCosts(prev => ({
                        ...prev, [t.id]: { ...prev[t.id], cost: e.target.value, reason: prev[t.id]?.reason || "" }
                      }))} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8" placeholder="사유"
                      value={newCosts[t.id]?.reason || ""}
                      onChange={(e) => setNewCosts(prev => ({
                        ...prev, [t.id]: { ...prev[t.id], cost: prev[t.id]?.cost || "", reason: e.target.value }
                      }))} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => handleApply(t.id)}>적용</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>가공비 변경 이력</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">제품유형:</Label>
              <Select value={filterType || "all"} onValueChange={(v) => { const val = v === "all" ? "" : v; setFilterType(val); fetchHistory(val || undefined); }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="전체" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>변경일시</TableHead>
                <TableHead>제품유형</TableHead>
                <TableHead className="text-right">가공비</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>변경자</TableHead>
                <TableHead>사유</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">변경 이력이 없습니다.</TableCell></TableRow>
              )}
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-sm">{new Date(h.effectiveDate).toLocaleString("ko-KR")}</TableCell>
                  <TableCell>{h.productType.name}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(h.cost)}원</TableCell>
                  <TableCell>
                    <Badge variant={h.isCurrent ? "default" : "secondary"}>
                      {h.isCurrent ? "현재" : "이전"}
                    </Badge>
                  </TableCell>
                  <TableCell>{h.changedBy || "-"}</TableCell>
                  <TableCell>{h.changeReason || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
