"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import MaterialSearch from "@/components/quotation/MaterialSearch";
import { ProductTypeType } from "@/types/quotation";
import { ITEM_ROLES } from "@/lib/quotation/quotationNote";
import {
  FormulationTemplateLike,
  TemplateItemLike,
  calcItemAmounts,
  summarizeTemplateItems,
} from "@/lib/quotation/formulationTemplate";

const fmt = (n: number) => Math.round(n || 0).toLocaleString("ko-KR");

/** 편집 중인 원료 행 — 저장 형태(TemplateItemLike)에서 화면에 필요한 것만 */
type EditItem = {
  category: string;
  role: string;
  materialId: string | null;
  materialName: string;
  theoryAmount: number;
  origin: string;
  refUnitPrice: number;
};

const emptyItem = (): EditItem => ({
  category: "일반식품",
  role: "주원료",
  materialId: null,
  materialName: "",
  theoryAmount: 0,
  origin: "",
  refUnitPrice: 0,
});

const toEditItem = (i: TemplateItemLike): EditItem => ({
  category: i.category,
  role: i.role,
  materialId: i.materialId ?? null,
  materialName: i.materialName,
  theoryAmount: i.theoryAmount,
  origin: i.origin ?? "",
  // 마스터에 연결돼 있으면 현재 단가를 보여준다 (저장 시 그 값이 새 기준이 된다)
  refUnitPrice: i.material?.unitPrice ?? i.refUnitPrice,
});

/** 1정당 원료비 — 견적서와 같은 식 */
const unitCost = (items: { theoryAmount: number; refUnitPrice: number }[]) =>
  items.reduce(
    (sum, i) => sum + calcItemAmounts(i.theoryAmount, i.refUnitPrice).materialCost,
    0
  );

export default function FormulationTemplatePage() {
  const [data, setData] = useState<FormulationTemplateLike[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeType[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormulationTemplateLike | null>(null);
  const [form, setForm] = useState({
    name: "", productTypeId: "", productSpec: "", dosage: "",
    subMaterialCostPerUnit: "", note: "",
  });
  const [items, setItems] = useState<EditItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FormulationTemplateLike | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback((q: string) => {
    fetch(`/api/formulation-templates?search=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => setData(Array.isArray(res) ? res : res.data || []))
      .catch(() => toast.error("템플릿을 불러오지 못했습니다."));
  }, []);

  useEffect(() => { fetchData(""); }, [fetchData]);

  useEffect(() => {
    fetch("/api/product-types")
      .then((r) => r.json())
      .then(setProductTypes)
      .catch(() => undefined);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", productTypeId: "", productSpec: "", dosage: "", subMaterialCostPerUnit: "", note: "" });
    setItems([emptyItem()]);
    setDialogOpen(true);
  };

  const openEdit = (row: FormulationTemplateLike) => {
    setEditing(row);
    setForm({
      name: row.name,
      productTypeId: row.productTypeId || "",
      productSpec: row.productSpec || "",
      dosage: row.dosage || "",
      subMaterialCostPerUnit:
        row.subMaterialCostPerUnit === null || row.subMaterialCostPerUnit === undefined
          ? "" : String(row.subMaterialCostPerUnit),
      note: row.note || "",
    });
    setItems(row.items.length ? row.items.map(toEditItem) : [emptyItem()]);
    setDialogOpen(true);
  };

  const patchItem = (idx: number, patch: Partial<EditItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const save = async () => {
    if (!form.name.trim()) { toast.error("템플릿 이름을 입력해주세요."); return; }
    if (items.every((i) => !i.materialName.trim())) {
      toast.error("원료를 최소 1개 입력해주세요."); return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/formulation-templates/${editing.id}` : "/api/formulation-templates",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            productTypeId: form.productTypeId || null,
            subMaterialCostPerUnit: form.subMaterialCostPerUnit === "" ? null : form.subMaterialCostPerUnit,
            items,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "");
      }
      toast.success(editing ? "수정되었습니다." : "등록되었습니다.");
      setDialogOpen(false);
      fetchData(search);
    } catch (e) {
      toast.error((e as Error).message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/formulation-templates/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("삭제되었습니다.");
      setDeleteTarget(null);
      fetchData(search);
    } catch {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">배합 템플릿</h2>
          <p className="text-sm text-muted-foreground">
            되풀이해 쓰는 주원료 조합을 저장해 두고 견적서에서 불러옵니다.
            단가는 저장하지 않고 얹는 순간 원료 마스터에서 다시 읽습니다.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />템플릿 등록</Button>
      </div>

      <div className="flex gap-2 max-w-xl">
        <Input
          placeholder="템플릿명 또는 원료명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData(search)}
        />
        <Button variant="outline" onClick={() => fetchData(search)}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>템플릿 ({data.length}건)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>템플릿명</TableHead>
                <TableHead>제형</TableHead>
                <TableHead>주원료</TableHead>
                <TableHead className="w-20 text-right">원료수</TableHead>
                <TableHead className="w-28 text-right">1정당 원료비</TableHead>
                <TableHead className="w-20 text-right">사용</TableHead>
                <TableHead className="w-24 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    등록된 배합 템플릿이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {data.map((t) => {
                const rows = t.items.map(toEditItem);
                return (
                  <Fragment key={t.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                      <TableCell>
                        {expanded === t.id
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.productType?.name || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {summarizeTemplateItems(t.items) || "-"}
                      </TableCell>
                      <TableCell className="text-right">{t.items.length}종</TableCell>
                      <TableCell className="text-right">{fmt(unitCost(rows))}원</TableCell>
                      <TableCell className="text-right">{t.usageCount}회</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-center">
                          <Button variant="outline" size="sm" title="수정" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" title="삭제" onClick={() => setDeleteTarget(t)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded === t.id && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30">
                          <div className="text-sm space-y-1 py-1">
                            {rows.map((i, idx) => (
                              <div key={idx} className="flex gap-3">
                                <span className="w-6 text-muted-foreground">{idx + 1}.</span>
                                <span className="w-16 text-muted-foreground">{i.role}</span>
                                <span className="flex-1">
                                  {i.materialName}
                                  {!i.materialId && (
                                    <span className="ml-1 text-xs text-muted-foreground">(마스터 미연결)</span>
                                  )}
                                </span>
                                <span className="w-24 text-right">{i.theoryAmount}mg</span>
                                <span className="w-28 text-right">{fmt(i.refUnitPrice)}원/kg</span>
                              </div>
                            ))}
                            {t.note && (
                              <p className="text-xs text-muted-foreground pt-1">메모: {t.note}</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "배합 템플릿 수정" : "배합 템플릿 등록"}</DialogTitle>
            <DialogDescription>
              원료는 마스터에서 골라 연결하세요. 연결된 원료는 견적서에 얹을 때
              그 시점의 마스터 단가로 자동 갱신됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>템플릿 이름 <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 밀크씨슬 1000mg 정제 기본배합" />
            </div>
            <div>
              <Label>기본 제형</Label>
              <Select value={form.productTypeId || "none"}
                onValueChange={(v) => setForm({ ...form, productTypeId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="선택 안 함" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안 함</SelectItem>
                  {productTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>제품규격</Label>
              <Input value={form.productSpec} placeholder="예: 1000mg정제"
                onChange={(e) => setForm({ ...form, productSpec: e.target.value })} />
            </div>
            <div>
              <Label>섭취방법</Label>
              <Input value={form.dosage} placeholder="예: 1일 3회 1정"
                onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
            </div>
            <div>
              <Label>1정당 부원료비 (원)</Label>
              <Input type="number" min={0} value={form.subMaterialCostPerUnit}
                placeholder="비우면 견적서 값 유지"
                onChange={(e) => setForm({ ...form, subMaterialCostPerUnit: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>메모</Label>
              <Textarea rows={2} value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium">구성 원료</p>
                <p className="text-xs text-muted-foreground">
                  1정당 원료비 {fmt(unitCost(items))}원 (현재 단가 기준)
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}>
                <Plus className="h-4 w-4 mr-1" />행 추가
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No.</TableHead>
                    <TableHead className="w-28">구분</TableHead>
                    <TableHead className="w-28">주/부원료</TableHead>
                    <TableHead>원료명</TableHead>
                    <TableHead className="w-28">이론량(mg)</TableHead>
                    <TableHead className="w-32">Kg당단가</TableHead>
                    <TableHead className="w-24">원산지</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell>
                        <Select value={item.category}
                          onValueChange={(v) => patchItem(idx, { category: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="건기식">건기식</SelectItem>
                            <SelectItem value="일반식품">일반식품</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={item.role} onValueChange={(v) => patchItem(idx, { role: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ITEM_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <MaterialSearch
                          value={item.materialName}
                          onManualChange={(name) =>
                            patchItem(idx, { materialName: name, materialId: null })}
                          onSelect={(mat) =>
                            patchItem(idx, {
                              materialName: mat.name,
                              materialId: mat.id,
                              refUnitPrice: mat.unitPrice,
                              origin: mat.origin ?? "",
                            })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8" type="number" value={item.theoryAmount || ""}
                          onChange={(e) => patchItem(idx, { theoryAmount: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8" type="number" value={item.refUnitPrice || ""}
                          disabled={Boolean(item.materialId)}
                          title={item.materialId ? "마스터 연결 원료는 마스터 단가를 씁니다" : undefined}
                          onChange={(e) => patchItem(idx, { refUnitPrice: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8" value={item.origin}
                          onChange={(e) => patchItem(idx, { origin: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>취소</Button>
            <Button disabled={saving} onClick={save}>{saving ? "저장 중..." : "저장"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="배합 템플릿을 삭제할까요?"
        description={deleteTarget ? `${deleteTarget.name}\n이미 작성된 견적서는 영향을 받지 않습니다.` : undefined}
        confirmLabel="삭제"
        destructive
        loading={deleting}
        onConfirm={remove}
      />
    </div>
  );
}
