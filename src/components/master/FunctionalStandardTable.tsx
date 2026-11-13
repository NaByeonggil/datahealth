"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Plus, Pencil, Trash2, Search, ListChecks, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ExcelExportButton from "@/components/master/ExcelExportButton";
import { formatContent } from "@/components/master/MaterialContentTable";
import { exportFunctionalStandards } from "@/lib/exports/masterExcel";
import { formatDaily } from "@/lib/materials/functionalDaily";

export interface Standard {
  id: string; code: string | null; group: string; name: string; component: string | null;
  keywords: string; excludes: string | null; note: string | null;
  dailyMin: number | null; dailyMax: number | null; dailyUnit: string | null; dailyBasis: string | null;
  quoteMin: number | null; dailyVerified: boolean; dailyNote: string | null;
  counts: { material: number; catalog: number };
}
interface Row {
  key: string; sourceType: "material" | "catalog"; name: string; materialCode: string | null;
  supplier: string | null; category: string | null; unitPrice: number | null; unit: string | null;
  specification: string | null; refCode: string | null; standardIds: string[];
  content: {
    status: string; component: string | null; amount: number | null; amountMax: number | null;
    unit: string | null; qualifier: string | null; isManual: boolean;
  } | null;
}

const emptyForm = {
  code: "", group: "기능성원료", name: "", component: "", keywords: "", excludes: "", note: "",
  dailyMin: "", dailyMax: "", dailyUnit: "", dailyBasis: "성분", quoteMin: "", dailyVerified: "false", dailyNote: "",
};
const numStr = (v: number | null) => (v == null ? "" : String(v));
const label = (s: Pick<Standard, "code" | "name">) => (s.code ? `${s.code} ${s.name}` : s.name);

export default function FunctionalStandardTable() {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [standardId, setStandardId] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const [manageOpen, setManageOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Standard | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Standard | null>(null);

  const byId = useMemo(() => new Map(standards.map((s) => [s.id, s])), [standards]);

  const fetchStandards = useCallback(() => {
    fetch("/api/functional-standards").then(r => r.json()).then((res) => setStandards(res.data || []));
  }, []);

  const fetchData = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (standardId) params.set("standardId", standardId);
    if (sourceType) params.set("sourceType", sourceType);
    if (search) params.set("search", search);
    fetch(`/api/functional-standards/materials?${params}`).then(r => r.json()).then((res) => {
      setItems(res.data || []);
      setTotalCount(res.total || 0);
    });
  }, [standardId, sourceType, search, page, pageSize]);

  useEffect(() => { fetchStandards(); }, [fetchStandards]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setEditOpen(true); };
  const openEdit = (s: Standard) => {
    setEditItem(s);
    setForm({
      code: s.code ?? "", group: s.group, name: s.name, component: s.component ?? "",
      keywords: s.keywords, excludes: s.excludes ?? "", note: s.note ?? "",
      dailyMin: numStr(s.dailyMin), dailyMax: numStr(s.dailyMax), dailyUnit: s.dailyUnit ?? "",
      dailyBasis: s.dailyBasis ?? "성분", quoteMin: numStr(s.quoteMin),
      dailyVerified: String(s.dailyVerified), dailyNote: s.dailyNote ?? "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    const res = await fetch(editItem ? `/api/functional-standards/${editItem.id}` : "/api/functional-standards", {
      method: editItem ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(editItem ? "수정되었습니다." : "등록되었습니다.");
      setEditOpen(false);
      fetchStandards();
      fetchData();
    } else {
      const err = await res.json();
      toast.error(err.error || "저장에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/functional-standards/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("삭제되었습니다.");
      if (standardId === deleteTarget.id) setStandardId("");
      fetchStandards();
      fetchData();
    } else toast.error("삭제에 실패했습니다.");
    setDeleteTarget(null);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const selected = standardId ? byId.get(standardId) : null;
  const setField = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          건강기능식품 공전(고시형) 원료에 해당하는 원료·취급품목을 모았습니다. 원료명을 공전 원료의
          매칭 키워드로 맞춰 묶으며, 키워드는 <b>공전 원료 관리</b>에서 고칠 수 있습니다.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setManageOpen(true)}><ListChecks className="h-4 w-4 mr-1" />공전 원료 관리</Button>
          <ExcelExportButton onExport={() => exportFunctionalStandards({ standardId, sourceType, search })} />
        </div>
      </div>

      {/* 모바일: 검색창 한 줄 + 선택 상자 두 칸 / PC: 한 줄 */}
      <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:flex-wrap">
        <div className="relative col-span-2 md:order-last md:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="원료명·공급사·규격 검색" value={search} className="pl-8"
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Label className="hidden md:inline text-sm whitespace-nowrap">공전 원료:</Label>
        <Select value={standardId || "all"} onValueChange={(v) => { setStandardId(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-full min-w-0 md:w-72"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-96">
            <SelectItem value="all">전체 공전 원료</SelectItem>
            {standards.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {label(s)} ({s.counts.material + s.counts.catalog})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="hidden md:inline text-sm whitespace-nowrap ml-2">구분:</Label>
        <Select value={sourceType || "all"} onValueChange={(v) => { setSourceType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-full min-w-0 md:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 구분</SelectItem>
            <SelectItem value="material">원료 (단가 확보)</SelectItem>
            <SelectItem value="catalog">취급품목 (단가 미확보)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
          <span><span className="text-muted-foreground">공전 번호</span> {selected.code || "-"}</span>
          <span><span className="text-muted-foreground">구분</span> {selected.group}</span>
          <span><span className="text-muted-foreground">기능(지표)성분</span> {selected.component || "-"}</span>
          <span>
            <span className="text-muted-foreground">1일 섭취량</span> {formatDaily(selected) ?? "미등록"}
            {formatDaily(selected) && !selected.dailyVerified && <Badge variant="outline" className="ml-1">초안</Badge>}
          </span>
          <span><span className="text-muted-foreground">단가 확보</span> {selected.counts.material}건</span>
          <span><span className="text-muted-foreground">단가 미확보</span> {selected.counts.catalog}건</span>
          <span className="text-muted-foreground">키워드: {selected.keywords}{selected.excludes ? ` / 제외: ${selected.excludes}` : ""}</span>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>건기식 공전 원료 ({totalCount}건)</CardTitle></CardHeader>
        <CardContent>
          {/* 모바일: 원료 하나당 카드 한 장 */}
          <div className="md:hidden space-y-2">
            {items.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">해당하는 원료가 없습니다.</p>
            )}
            {items.map((r) => {
              const content = r.content ? formatContent(r.content) : null;
              const stds = r.standardIds.map(id => byId.get(id)).filter((s): s is Standard => !!s);
              return (
                <div key={r.key} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium break-keep">{r.name}</div>
                    {r.sourceType === "material"
                      ? <Badge variant="default" className="shrink-0">확보</Badge>
                      : <Badge variant="secondary" className="shrink-0">미확보</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stds.map(label).join(", ") || "-"}
                    {r.supplier && <> · {r.supplier}</>}
                  </div>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>
                      {content
                        ? <span className="font-medium">{r.content?.component ? `${r.content.component} ` : ""}{content}</span>
                        : <span className="text-muted-foreground">함유량 없음</span>}
                    </span>
                    <span className="whitespace-nowrap font-medium">
                      {r.unitPrice != null ? `${r.unitPrice.toLocaleString("ko-KR")}원${r.unit ? `/${r.unit}` : ""}` : "-"}
                    </span>
                  </div>
                  {r.specification && (
                    <p className="text-xs text-muted-foreground line-clamp-2 break-all">규격: {r.specification}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">No.</TableHead>
                <TableHead>공전 원료</TableHead>
                <TableHead>단가</TableHead>
                <TableHead>원료명</TableHead>
                <TableHead>공급사</TableHead>
                <TableHead className="text-right">단가(원)</TableHead>
                <TableHead>함유량</TableHead>
                <TableHead>규격</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  해당하는 원료가 없습니다.
                </TableCell></TableRow>
              )}
              {items.map((r, i) => {
                const content = r.content ? formatContent(r.content) : null;
                return (
                  <TableRow key={r.key}>
                    <TableCell className="text-center text-muted-foreground">{(currentPage - 1) * pageSize + i + 1}</TableCell>
                    <TableCell className="text-sm">
                      {r.standardIds.map(id => byId.get(id)).filter(Boolean).map(s => (
                        <div key={s!.id} className="whitespace-nowrap">
                          {s!.code && <span className="text-muted-foreground mr-1">{s!.code}</span>}{s!.name}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.sourceType === "material"
                        ? <Badge variant="default">확보</Badge>
                        : <Badge variant="secondary">미확보</Badge>}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.materialCode && <span className="ml-1 text-xs text-muted-foreground">{r.materialCode}</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.supplier ?? "-"}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {r.unitPrice != null ? `${r.unitPrice.toLocaleString("ko-KR")}${r.unit ? `/${r.unit}` : ""}` : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {content
                        ? <span className="font-medium">{r.content?.component ? `${r.content.component} ` : ""}{content}</span>
                        : <span className="text-muted-foreground">없음</span>}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground" title={r.specification || ""}>
                      {r.specification || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>

          <div className="flex items-center justify-between gap-2 pt-4">
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

      {/* 공전 원료 기준표 관리 */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>공전 원료 관리 ({standards.length}종)</DialogTitle></DialogHeader>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              원료명에 매칭 키워드가 들어 있고 제외 키워드가 없으면 그 공전 원료로 묶습니다 (띄어쓰기·대소문자 무시).
            </p>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />추가</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">번호</TableHead>
                <TableHead>공전 원료</TableHead>
                <TableHead>기능(지표)성분</TableHead>
                <TableHead className="whitespace-nowrap">1일 섭취량</TableHead>
                <TableHead>매칭 키워드</TableHead>
                <TableHead className="text-right whitespace-nowrap">확보/미확보</TableHead>
                <TableHead className="w-24">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standards.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground">{s.code || "-"}</TableCell>
                  <TableCell className="font-medium">
                    {s.name}
                    <span className="ml-1 text-xs text-muted-foreground">{s.group}</span>
                  </TableCell>
                  <TableCell className="text-sm">{s.component || "-"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDaily(s) ?? <span className="text-muted-foreground">-</span>}
                    {formatDaily(s) && (s.dailyVerified
                      ? <Badge variant="secondary" className="ml-1">확인</Badge>
                      : <Badge variant="outline" className="ml-1">초안</Badge>)}
                    {s.quoteMin != null && <div className="text-xs text-muted-foreground">견적 기준 {s.quoteMin} {s.dailyUnit}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                    {s.keywords}{s.excludes && <span className="text-destructive"> / 제외: {s.excludes}</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{s.counts.material} / {s.counts.catalog}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" title="수정" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" title="삭제" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "공전 원료 수정" : "공전 원료 추가"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>공전 번호</Label>
              <Input value={form.code} placeholder="예: 2-2" onChange={e => setField("code", e.target.value)} />
            </div>
            <div>
              <Label>구분</Label>
              <Select value={form.group} onValueChange={v => setField("group", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="영양성분">영양성분</SelectItem>
                  <SelectItem value="기능성원료">기능성원료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>공전 원료명 *</Label>
              <Input value={form.name} onChange={e => setField("name", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>기능(지표)성분</Label>
              <Input value={form.component} onChange={e => setField("component", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>매칭 키워드 * <span className="text-xs text-muted-foreground">쉼표로 구분</span></Label>
              <Input value={form.keywords} placeholder="예: 홍삼,redginseng" onChange={e => setField("keywords", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>제외 키워드 <span className="text-xs text-muted-foreground">이 말이 들어간 원료는 빼기</span></Label>
              <Input value={form.excludes} onChange={e => setField("excludes", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>비고</Label>
              <Input value={form.note} onChange={e => setField("note", e.target.value)} />
            </div>

            <div className="col-span-2 border-t pt-3 text-sm font-medium">
              1일 섭취량 기준 <span className="text-xs font-normal text-muted-foreground">AI 견적에서 최소 투입량 계산에 씁니다</span>
            </div>
            <div>
              <Label>하한</Label>
              <Input inputMode="decimal" value={form.dailyMin} onChange={e => setField("dailyMin", e.target.value)} />
            </div>
            <div>
              <Label>상한</Label>
              <Input inputMode="decimal" value={form.dailyMax} onChange={e => setField("dailyMax", e.target.value)} />
            </div>
            <div>
              <Label>단위</Label>
              <Input list="daily-units" value={form.dailyUnit} placeholder="mg / μg / g / 억CFU" onChange={e => setField("dailyUnit", e.target.value)} />
              <datalist id="daily-units">
                {["mg", "μg", "g", "억CFU", "μg RAE", "mg α-TE", "mg NE", "μg DFE"].map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
            <div>
              <Label>기준</Label>
              <Select value={form.dailyBasis} onValueChange={v => setField("dailyBasis", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="성분">지표성분 함량</SelectItem>
                  <SelectItem value="원료">원료 자체 중량</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>회사 견적 기준량 <span className="text-xs text-muted-foreground">비우면 하한</span></Label>
              <Input inputMode="decimal" value={form.quoteMin} onChange={e => setField("quoteMin", e.target.value)} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={form.dailyVerified === "true"}
                  onChange={e => setField("dailyVerified", String(e.target.checked))} />
                공전 원문과 대조 완료
              </label>
            </div>
            <div className="col-span-2">
              <Label>근거 메모</Label>
              <Input value={form.dailyNote} placeholder="기능성별 차이, 출처 등" onChange={e => setField("dailyNote", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="공전 원료 삭제"
        description={deleteTarget ? `"${label(deleteTarget)}"을(를) 기준표에서 삭제합니다. 원료 데이터는 지워지지 않습니다.` : ""}
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
