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
import { Plus, Pencil, Trash2, Search, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ExcelExportButton from "@/components/master/ExcelExportButton";
import { exportMaterialContents } from "@/lib/exports/masterExcel";

type SourceType = "material" | "catalog";
interface ContentRow {
  id: string; sourceType: SourceType; name: string; specification: string | null;
  status: string; component: string | null; amount: number | null; amountMax: number | null;
  unit: string | null; qualifier: string | null; matches: string | null;
  isManual: boolean; note: string | null; updatedAt: string;
  material: { code: string; isActive: boolean; supplier: { name: string } } | null;
  catalog: { supplier: { name: string } } | null;
}
interface Candidate { id: string; name: string; label: string; specification: string | null; }

const UNITS = ["%", "mg/g", "μg/g", "IU/g", "억CFU/g", "CFU/g", "Brix", "유닛/g", "만유닛/g"];
const NONE = "__none__";

/** 50 / 7.8~9 / 1000억CFU/g 이상 */
export function formatContent(r: Pick<ContentRow, "amount" | "amountMax" | "unit" | "qualifier">) {
  if (r.amount == null) return null;
  const range = `${r.amount.toLocaleString("ko-KR")}${r.amountMax != null ? `~${r.amountMax.toLocaleString("ko-KR")}` : ""}`;
  const unit = r.unit === "Brix" ? " Brix" : r.unit ?? "";
  return `${range}${unit}${r.qualifier ? ` ${r.qualifier}` : ""}`;
}

const emptyForm = {
  component: "", amount: "", amountMax: "", unit: "%", qualifier: "", note: "",
};

export default function MaterialContentTable() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [sourceType, setSourceType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  // 등록 시 원료 선택
  const [newSourceType, setNewSourceType] = useState<SourceType>("material");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentRow | null>(null);

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (sourceType) params.set("sourceType", sourceType);
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    fetch(`/api/material-contents?${params}`).then(r => r.json()).then((res) => {
      setItems(res.data || []);
      setTotalCount(res.total || 0);
    });
  }, [sourceType, status, search, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchCandidates = useCallback(() => {
    const params = new URLSearchParams({ sourceType: newSourceType });
    if (candidateSearch) params.set("search", candidateSearch);
    fetch(`/api/material-contents/candidates?${params}`).then(r => r.json()).then((res) => setCandidates(res.data || []));
  }, [newSourceType, candidateSearch]);

  useEffect(() => {
    if (dialogOpen && !editItem) fetchCandidates();
  }, [dialogOpen, editItem, fetchCandidates]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setPicked(null);
    setCandidateSearch("");
    setDialogOpen(true);
  };

  const openEdit = (r: ContentRow) => {
    setEditItem(r);
    setForm({
      component: r.component ?? "", amount: r.amount != null ? String(r.amount) : "",
      amountMax: r.amountMax != null ? String(r.amountMax) : "", unit: r.unit ?? "%",
      qualifier: r.qualifier ?? "", note: r.note ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editItem && !picked) { toast.error("원료를 선택해주세요."); return; }
    if (form.amount && !Number.isFinite(Number(form.amount))) { toast.error("함유량은 숫자로 입력해주세요."); return; }
    const res = await fetch(editItem ? `/api/material-contents/${editItem.id}` : "/api/material-contents", {
      method: editItem ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editItem ? form : { ...form, sourceType: newSourceType, sourceId: picked!.id }),
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

  const handleReextract = async () => {
    if (!editItem) return;
    const res = await fetch(`/api/material-contents/${editItem.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reextract: true }),
    });
    if (res.ok) {
      toast.success("규격에서 다시 읽었습니다.");
      setDialogOpen(false);
      fetchData();
    } else toast.error("다시 읽기에 실패했습니다.");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/material-contents/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("삭제되었습니다."); fetchData(); }
    else toast.error("삭제에 실패했습니다.");
    setDeleteTarget(null);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const setField = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          원료·취급품목의 규격에서 읽어 낸 함유량입니다. 원료를 저장하면 규격에서 자동으로 다시 읽으며,
          직접 수정한 행은 자동 추출이 덮어쓰지 않습니다.
        </p>
        <div className="flex gap-2 shrink-0">
          <ExcelExportButton onExport={() => exportMaterialContents({ sourceType, status, search })} />
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />새로 등록</Button>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <Label className="text-sm whitespace-nowrap">구분:</Label>
        <Select value={sourceType || "all"} onValueChange={(v) => { setSourceType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="material">원료</SelectItem>
            <SelectItem value="catalog">취급품목</SelectItem>
          </SelectContent>
        </Select>
        <Label className="text-sm whitespace-nowrap">상태:</Label>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="추출">함량 있음</SelectItem>
            <SelectItem value="함량없음">함량없음</SelectItem>
            <SelectItem value="규격없음">규격없음</SelectItem>
            <SelectItem value="직접입력">직접입력</SelectItem>
          </SelectContent>
        </Select>
        <Input className="max-w-xs" placeholder="원료명, 지표성분, 규격 검색" value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (setPage(1), fetchData())} />
        <Button variant="outline" onClick={() => { setPage(1); fetchData(); }}><Search className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>원료 함유량 ({totalCount}건)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">No.</TableHead>
                <TableHead>구분</TableHead>
                <TableHead>원료명</TableHead>
                <TableHead>공급사</TableHead>
                <TableHead>지표성분</TableHead>
                <TableHead>함유량</TableHead>
                <TableHead>규격 원문</TableHead>
                <TableHead>비고</TableHead>
                <TableHead className="w-24">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  해당하는 함유량이 없습니다.
                </TableCell></TableRow>
              )}
              {items.map((r, i) => {
                const content = formatContent(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-center text-muted-foreground">{(currentPage - 1) * pageSize + i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline">{r.sourceType === "material" ? "원료" : "취급품목"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.material && <span className="ml-1 text-xs text-muted-foreground">{r.material.code}</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{(r.material ?? r.catalog)?.supplier.name ?? "-"}</TableCell>
                    <TableCell>{r.component || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {content
                        ? <span className="font-medium">{content}</span>
                        : <Badge variant="secondary">{r.status === "규격없음" ? "없음 · 규격 없음" : "없음"}</Badge>}
                      {r.isManual && <Badge variant="default" className="ml-1">직접입력</Badge>}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground" title={r.specification || ""}>
                      {r.specification || "-"}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm" title={r.note || r.matches || ""}>
                      {r.note || (r.matches && r.matches.includes(" | ") ? `외 ${r.matches.split(" | ").length - 1}건 표기` : "-")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="수정" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" title="삭제" onClick={() => setDeleteTarget(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">페이지당</Label>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[20, 50, 100, 200].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "함유량 수정" : "함유량 등록"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {editItem ? (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="font-medium">{editItem.name}</div>
                <div className="text-muted-foreground">규격: {editItem.specification || "없음"}</div>
                {editItem.matches && <div className="text-muted-foreground">찾은 표기: {editItem.matches}</div>}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select value={newSourceType} onValueChange={(v) => { setNewSourceType(v as SourceType); setPicked(null); }}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">원료</SelectItem>
                      <SelectItem value="catalog">취급품목</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="원료명 검색" value={candidateSearch}
                    onChange={e => setCandidateSearch(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">함유량이 아직 없는 원료만 보입니다.</p>
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {candidates.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">함유량이 없는 원료가 없습니다.</div>
                  )}
                  {candidates.map(c => (
                    <button key={c.id} type="button"
                      className={`block w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-accent ${picked?.id === c.id ? "bg-accent" : ""}`}
                      onClick={() => setPicked(c)}>
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{c.label}</span>
                      {c.specification && <div className="text-xs text-muted-foreground truncate">규격: {c.specification}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">지표성분</Label>
              <div className="col-span-3"><Input value={form.component} onChange={e => setField("component", e.target.value)} placeholder="예: 실리마린, 비타민C, 고형분" /></div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">함유량</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input type="number" value={form.amount} onChange={e => setField("amount", e.target.value)} placeholder="비우면 없음" />
                <span className="text-muted-foreground">~</span>
                <Input type="number" value={form.amountMax} onChange={e => setField("amountMax", e.target.value)} placeholder="상한(범위일 때)" />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">단위</Label>
              <div className="col-span-3 flex gap-2">
                <Select value={UNITS.includes(form.unit) ? form.unit : NONE} onValueChange={v => v !== NONE && setField("unit", v)}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="직접 입력" /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    <SelectItem value={NONE}>직접 입력</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={form.unit} onChange={e => setField("unit", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">조건</Label>
              <div className="col-span-3">
                <Select value={form.qualifier || NONE} onValueChange={v => setField("qualifier", v === NONE ? "" : v)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>없음</SelectItem>
                    <SelectItem value="이상">이상</SelectItem>
                    <SelectItem value="이하">이하</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">비고</Label>
              <div className="col-span-3"><Input value={form.note} onChange={e => setField("note", e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <div>
              {editItem && (
                <Button variant="outline" onClick={handleReextract} title="입력값을 버리고 원료 규격에서 다시 읽습니다">
                  <RotateCcw className="h-4 w-4 mr-1" />규격에서 다시 읽기
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
              <Button onClick={handleSave}>저장</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="함유량 삭제"
        description={`"${deleteTarget?.name}"의 함유량 행을 삭제합니다. 원료 자체는 지워지지 않으며, 원료를 다시 저장하거나 추출 스크립트를 돌리면 규격에서 다시 만들어집니다.`}
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
