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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface SetItem {
  id?: string;
  name: string;
  spec?: string | null;
  unitPrice: number;
  qtyPerUnit: number;
  isFreeIssue: boolean;
  note?: string | null;
}

interface PackagingSet {
  id: string;
  code: string;
  name: string;
  formName?: string | null;
  capacity?: number | null;
  capacityUnit?: string | null;
  vendorName?: string | null;
  effectiveDate: string;
  isCurrent: boolean;
  sourceFile?: string | null;
  note?: string | null;
  items: SetItem[];
}

const fmt = (n: number) => Math.round(n || 0).toLocaleString("ko-KR");

/** 사급 항목은 고객이 제공하므로 원가에서 뺀다 */
export const setTotal = (items: SetItem[]) =>
  items.reduce((sum, i) => sum + (i.isFreeIssue ? 0 : i.unitPrice * (i.qtyPerUnit || 1)), 0);

const emptyItem = (): SetItem => ({
  name: "",
  spec: "",
  unitPrice: 0,
  qtyPerUnit: 1,
  isFreeIssue: false,
  note: "",
});

export default function PackagingSetPage() {
  const [data, setData] = useState<PackagingSet[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PackagingSet | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [items, setItems] = useState<SetItem[]>([]);

  const fetchData = useCallback(() => {
    fetch(`/api/packaging/sets?search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((res) => setData(Array.isArray(res) ? res : res.data || []));
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", formName: "", capacity: "", capacityUnit: "ml", vendorName: "", note: "" });
    setItems([emptyItem()]);
    setDialogOpen(true);
  };

  const openEdit = (row: PackagingSet) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      formName: row.formName || "",
      capacity: row.capacity ? String(row.capacity) : "",
      capacityUnit: row.capacityUnit || "ml",
      vendorName: row.vendorName || "",
      note: row.note || "",
    });
    setItems(row.items.length ? row.items.map((i) => ({ ...i })) : [emptyItem()]);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("세트코드와 세트명을 입력해주세요.");
      return;
    }
    const payload = { ...form, items };
    const res = await fetch(
      editing ? `/api/packaging/sets/${editing.id}` : "/api/packaging/sets",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      toast.error("저장에 실패했습니다.");
      return;
    }
    toast.success(editing ? "수정되었습니다." : "등록되었습니다.");
    setDialogOpen(false);
    fetchData();
  };

  const remove = async (row: PackagingSet) => {
    const res = await fetch(`/api/packaging/sets/${row.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("삭제에 실패했습니다.");
    toast.success("삭제되었습니다.");
    fetchData();
  };

  const updateItem = (idx: number, patch: Partial<SetItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">부자재 세트</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />세트 등록</Button>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input placeholder="세트명, 코드, 제형, 업체 검색" value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <Button variant="outline" onClick={fetchData}><Search className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>세트 목록 ({data.length}건)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>세트코드</TableHead>
                <TableHead>세트명</TableHead>
                <TableHead>제형/유형</TableHead>
                <TableHead>업체</TableHead>
                <TableHead className="text-center">구성</TableHead>
                <TableHead className="text-right">세트 단가</TableHead>
                <TableHead>기준일</TableHead>
                <TableHead>출처</TableHead>
                <TableHead className="w-24 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    등록된 세트가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row) => (
                <>
                  <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    <TableCell>
                      {expanded === row.id
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.formName || "-"}</TableCell>
                    <TableCell>{row.vendorName || "-"}</TableCell>
                    <TableCell className="text-center">{row.items.length}개</TableCell>
                    <TableCell className="text-right font-medium">{fmt(setTotal(row.items))}원</TableCell>
                    <TableCell>{new Date(row.effectiveDate).toLocaleDateString("ko-KR")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.sourceFile || "-"}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(row)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded === row.id && (
                    <TableRow key={`${row.id}-items`}>
                      <TableCell colSpan={10} className="bg-muted/30">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>구성 자재</TableHead>
                              <TableHead>규격</TableHead>
                              <TableHead className="text-right">단가</TableHead>
                              <TableHead className="text-right">수량</TableHead>
                              <TableHead className="text-right">금액</TableHead>
                              <TableHead>비고</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {row.items.map((it, i) => (
                              <TableRow key={it.id || i}>
                                <TableCell>
                                  {it.name}
                                  {it.isFreeIssue && <Badge variant="secondary" className="ml-2">사급</Badge>}
                                </TableCell>
                                <TableCell>{it.spec || "-"}</TableCell>
                                <TableCell className="text-right">{fmt(it.unitPrice)}</TableCell>
                                <TableCell className="text-right">{it.qtyPerUnit}</TableCell>
                                <TableCell className="text-right">
                                  {it.isFreeIssue ? "-" : fmt(it.unitPrice * (it.qtyPerUnit || 1))}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{it.note || ""}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-medium">
                              <TableCell colSpan={4} className="text-right">세트 합계 (사급 제외)</TableCell>
                              <TableCell className="text-right">{fmt(setTotal(row.items))}원</TableCell>
                              <TableCell />
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "세트 수정" : "세트 등록"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              ["code", "세트코드 *"],
              ["name", "세트명 *"],
              ["formName", "제형/유형"],
              ["capacity", "용량"],
              ["capacityUnit", "용량 단위"],
              ["vendorName", "업체명"],
            ].map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input value={form[key] || ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="col-span-2 md:col-span-3">
              <Label>비고</Label>
              <Input value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <Label>구성 자재</Label>
              <Button variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}>
                <Plus className="h-4 w-4 mr-1" />행 추가
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>자재명</TableHead>
                  <TableHead className="w-32">규격</TableHead>
                  <TableHead className="w-24">단가</TableHead>
                  <TableHead className="w-20">수량</TableHead>
                  <TableHead className="w-16 text-center">사급</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input className="h-8" value={it.name}
                        onChange={(e) => updateItem(i, { name: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" value={it.spec || ""}
                        onChange={(e) => updateItem(i, { spec: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-right" type="number" value={it.unitPrice || ""}
                        onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-right" type="number" value={it.qtyPerUnit || ""}
                        onChange={(e) => updateItem(i, { qtyPerUnit: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <input type="checkbox" checked={it.isFreeIssue}
                        onChange={(e) => updateItem(i, { isFreeIssue: e.target.checked })} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm"
                        onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={4} className="text-right">세트 합계 (사급 제외)</TableCell>
                  <TableCell colSpan={2} className="text-right">{fmt(setTotal(items))}원</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={save}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
