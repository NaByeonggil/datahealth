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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Columns3, ChevronsLeftRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";

interface Supplier { id: string; code: string; name: string; }
interface Material {
  id: string; code: string; name: string; category: string; unit: string;
  unitPrice: number; supplierId: string; isActive: boolean;
  origin: string | null; specification: string | null;
  minOrderQty: number | null; isFunctional: boolean;
  certifications: string | null; note: string | null;
  updatedBy: string | null;
  createdAt: string; updatedAt: string;
  supplier: { name: string };
}

export default function MaterialPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Material | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetch("/api/suppliers?all=true").then(r => r.json()).then((res) =>
      setSuppliers(Array.isArray(res) ? res : res.data || [])
    );
  }, []);

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (filterSupplier) params.set("supplierId", filterSupplier);
    if (search) params.set("search", search);
    fetch(`/api/materials?${params}`).then(r => r.json()).then((res) => {
      setMaterials(res.data || []);
      setTotalCount(res.total || 0);
    });
  }, [filterSupplier, search, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setForm({
      code: "", name: "", category: "일반식품", unit: "kg", unitPrice: 0,
      supplierId: "", origin: "", specification: "", minOrderQty: "",
      isFunctional: false, certifications: "", note: "", updatedBy: "관리자", isActive: true,
    });
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: Material) => {
    setForm({ ...item, minOrderQty: item.minOrderQty ?? "" });
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.supplierId) {
      toast.error("필수 항목을 입력해주세요."); return;
    }
    const payload = {
      ...form,
      minOrderQty: form.minOrderQty ? Number(form.minOrderQty) : null,
      unitPrice: Number(form.unitPrice) || 0,
    };
    const method = editItem ? "PUT" : "POST";
    const url = editItem ? `/api/materials/${editItem.id}` : "/api/materials";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editItem ? "수정되었습니다." : "등록되었습니다.");
      setDialogOpen(false);
      fetchData();
    } else {
      const err = await res.json();
      toast.error(err.error || "저장에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("삭제되었습니다."); fetchData(); }
    else { const err = await res.json(); toast.error(err.error || "삭제에 실패했습니다."); }
    setDeleteConfirm(null);
  };

  const fmt = (n: number) => n.toLocaleString("ko-KR");
  const colSpanCount = (expanded ? 16 : 9) + 1; // +1 for row number

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">원료 관리</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <Columns3 className="h-4 w-4 mr-1" /> : <ChevronsLeftRight className="h-4 w-4 mr-1" />}
            {expanded ? "기본 보기" : "확장 보기"}
          </Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />새로 등록</Button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Label className="text-sm whitespace-nowrap">공급사:</Label>
        <Select value={filterSupplier || "all"} onValueChange={(v) => { setFilterSupplier(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="전체" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="max-w-xs" placeholder="원료명, 코드 검색" value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchData()} />
        <Button variant="outline" onClick={() => { setPage(1); fetchData(); }}><Search className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>원료 목록 ({totalCount}건)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">No.</TableHead>
                <TableHead>원료코드</TableHead>
                <TableHead>원료명</TableHead>
                <TableHead>공급사</TableHead>
                <TableHead>단위</TableHead>
                <TableHead className="text-right">단가(원)</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>분류</TableHead>
                <TableHead>원산지</TableHead>
                {expanded && (
                  <>
                    <TableHead>규격</TableHead>
                    <TableHead className="text-right">최소주문량</TableHead>
                    <TableHead>기능성</TableHead>
                    <TableHead>인증</TableHead>
                    <TableHead>비고</TableHead>
                    <TableHead>기록자</TableHead>
                    <TableHead>마지막 업데이트</TableHead>
                  </>
                )}
                <TableHead className="w-24">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.length === 0 && (
                <TableRow><TableCell colSpan={colSpanCount} className="text-center text-muted-foreground py-8">등록된 원료가 없습니다.</TableCell></TableRow>
              )}
              {materials.map((m, idx) => (
                <TableRow key={m.id}>
                  <TableCell className="text-center text-muted-foreground text-sm">{(page - 1) * pageSize + idx + 1}</TableCell>
                  <TableCell>{m.code}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.supplier.name}</TableCell>
                  <TableCell>{m.unit}</TableCell>
                  <TableCell className="text-right">{fmt(m.unitPrice)}</TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? "default" : "secondary"}>{m.isActive ? "사용" : "미사용"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.category || "-"}</Badge>
                  </TableCell>
                  <TableCell>{m.origin || "-"}</TableCell>
                  {expanded && (
                    <>
                      <TableCell className="max-w-[200px] truncate" title={m.specification || ""}>{m.specification || "-"}</TableCell>
                      <TableCell className="text-right">{m.minOrderQty != null ? fmt(m.minOrderQty) : "-"}</TableCell>
                      <TableCell>
                        {m.isFunctional ? <Badge variant="default">Y</Badge> : <span className="text-muted-foreground">N</span>}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={m.certifications || ""}>{m.certifications || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={m.note || ""}>{m.note || "-"}</TableCell>
                      <TableCell>{m.updatedBy || "-"}</TableCell>
                      <TableCell className="text-sm">{new Date(m.updatedAt).toLocaleDateString("ko-KR")}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>페이지당</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
              <span>건 | 전체 {totalCount}건</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-accent" onClick={() => setPage(1)} disabled={currentPage <= 1}>
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-accent" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm font-medium">{currentPage} / {totalPages}</span>
              <button type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-accent" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-accent" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages}>
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 등록/수정 다이얼로그 - 전체 필드 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "원료 수정" : "원료 등록"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">원료코드 *</Label>
              <div className="col-span-3"><Input value={String(form.code || "")} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">원료명 *</Label>
              <div className="col-span-3"><Input value={String(form.name || "")} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">공급사 *</Label>
              <div className="col-span-3">
                <Select value={String(form.supplierId || "__none__")} onValueChange={v => setForm({ ...form, supplierId: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="공급사 선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">선택</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">분류</Label>
              <div className="col-span-3">
                <Select value={String(form.category || "일반식품")} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="일반식품">일반식품</SelectItem>
                    <SelectItem value="건기식">건기식</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">단위</Label>
              <div className="col-span-3"><Input value={String(form.unit || "")} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">단가(원)</Label>
              <div className="col-span-3"><Input type="number" value={String(form.unitPrice ?? 0)} onChange={e => setForm({ ...form, unitPrice: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">원산지</Label>
              <div className="col-span-3"><Input value={String(form.origin || "")} onChange={e => setForm({ ...form, origin: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">규격</Label>
              <div className="col-span-3"><Input value={String(form.specification || "")} onChange={e => setForm({ ...form, specification: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">최소주문량</Label>
              <div className="col-span-3"><Input type="number" value={String(form.minOrderQty || "")} onChange={e => setForm({ ...form, minOrderQty: e.target.value })} placeholder="미지정" /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">기능성 여부</Label>
              <div className="col-span-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.isFunctional} onChange={e => setForm({ ...form, isFunctional: e.target.checked })} />
                  <span className="text-sm">{form.isFunctional ? "기능성 원료" : "일반 원료"}</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">인증사항</Label>
              <div className="col-span-3"><Input value={String(form.certifications || "")} onChange={e => setForm({ ...form, certifications: e.target.value })} placeholder="HACCP, ISO 등" /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">비고</Label>
              <div className="col-span-3">
                <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={String(form.note || "")}
                  onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">기록자</Label>
              <div className="col-span-3"><Input value={String(form.updatedBy || "")} onChange={e => setForm({ ...form, updatedBy: e.target.value })} placeholder="관리자" /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">상태</Label>
              <div className="col-span-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  <span className="text-sm">{form.isActive ? "사용" : "미사용"}</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>삭제 확인</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>취소</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
