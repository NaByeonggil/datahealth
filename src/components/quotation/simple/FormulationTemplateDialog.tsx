"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  FormulationTemplateLike,
  ResolvedTemplateItem,
  resolveTemplateItems,
  summarizeTemplateItems,
} from "@/lib/quotation/formulationTemplate";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 적용 — 고른 템플릿과 현재 단가로 환산한 배합 행을 넘긴다 */
  onApply: (template: FormulationTemplateLike, resolved: ResolvedTemplateItem[]) => void;
}

/**
 * 배합 템플릿 고르기.
 * 검색어는 템플릿명과 구성 원료명을 함께 훑으므로 "밀크씨슬" 처럼
 * 주원료로 과거 배합을 찾아 들어올 수 있다.
 */
export default function FormulationTemplateDialog({ open, onOpenChange, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>배합 템플릿 불러오기</DialogTitle>
          <DialogDescription>
            템플릿을 고르면 이 제품의 배합이 통째로 바뀝니다. 단가는 원료 마스터에서
            지금 값을 다시 읽어옵니다.
          </DialogDescription>
        </DialogHeader>
        {/* 열 때마다 새로 마운트해 검색어·선택을 초기화한다 */}
        {open && <PickerBody onOpenChange={onOpenChange} onApply={onApply} />}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({ onOpenChange, onApply }: Omit<Props, "open">) {
  const [search, setSearch] = useState("");
  const [list, setList] = useState<FormulationTemplateLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FormulationTemplateLike | null>(null);

  const fetchList = useCallback((q: string) => {
    fetch(`/api/formulation-templates?activeOnly=1&search=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res: FormulationTemplateLike[]) => setList(Array.isArray(res) ? res : []))
      .catch(() => toast.error("템플릿을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  /** 다시 검색 — 첫 조회는 loading 이 이미 true 라 여기서만 켠다 */
  const runSearch = (q: string) => { setLoading(true); fetchList(q); };

  useEffect(() => { fetchList(""); }, [fetchList]);

  const resolved = selected ? resolveTemplateItems(selected.items) : [];
  const changedCount = resolved.filter((r) => r.priceChanged).length;
  const manualCount = resolved.filter((r) => !r.fromMaster).length;
  const inactiveCount = resolved.filter((r) => r.materialInactive).length;
  const unitMaterialCost = resolved.reduce((sum, r) => sum + r.item.materialCost, 0);

  return (
    <>
      <div className="flex gap-2">
        <Input
          placeholder="템플릿명 또는 원료명으로 검색 (예: 밀크씨슬)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch(search)}
        />
        <Button variant="outline" onClick={() => runSearch(search)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <div className="border rounded-md max-h-56 overflow-y-auto">
        {list.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            템플릿이 없습니다. 견적서의 배합을 &ldquo;템플릿으로 저장&rdquo;하면 여기에 쌓입니다.
          </p>
        )}
        {list.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t)}
            className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-accent ${
              selected?.id === t.id ? "bg-accent" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-sm">{t.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {t.productType?.name ? `${t.productType.name} · ` : ""}
                원료 {t.items.length}종
                {t.usageCount > 0 ? ` · ${t.usageCount}회 사용` : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summarizeTemplateItems(t.items) || "-"}
            </p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{selected.name} — 적용될 배합</p>
            <p className="text-sm">
              1정당 원료비{" "}
              <span className="font-bold text-blue-700">{fmt(unitMaterialCost)}원</span>
            </p>
          </div>

          {(changedCount > 0 || manualCount > 0 || inactiveCount > 0) && (
            <div className="flex items-start gap-2 text-xs bg-amber-50 text-amber-900 rounded-md p-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {changedCount > 0 && (
                  <p>{changedCount}개 원료의 마스터 단가가 템플릿 저장 시점과 달라졌습니다. 현재 단가로 적용됩니다.</p>
                )}
                {manualCount > 0 && (
                  <p>{manualCount}개 원료는 마스터에 연결되어 있지 않아 템플릿에 적어둔 참고 단가를 씁니다.</p>
                )}
                {inactiveCount > 0 && (
                  <p>{inactiveCount}개 원료가 마스터에서 미사용 처리됐습니다. 단가를 확인해주세요.</p>
                )}
              </div>
            </div>
          )}

          <div className="border rounded-md overflow-x-auto max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">No.</TableHead>
                  <TableHead className="w-20">주/부</TableHead>
                  <TableHead>원료명</TableHead>
                  <TableHead className="w-24 text-right">이론량(mg)</TableHead>
                  <TableHead className="w-32 text-right">Kg당단가</TableHead>
                  <TableHead className="w-24 text-right">원료비</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolved.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center">{i + 1}</TableCell>
                    <TableCell className="text-xs">{r.item.role}</TableCell>
                    <TableCell className="text-sm">
                      {r.item.materialName}
                      {!r.fromMaster && (
                        <span className="ml-1 text-xs text-muted-foreground">(수기)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{r.item.theoryAmount}</TableCell>
                    <TableCell className="text-right">
                      {fmt(r.item.kgUnitPrice)}
                      {r.priceChanged && (
                        <span className="block text-xs text-amber-700">
                          저장 시 {fmt(r.refUnitPrice)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{fmt(r.item.materialCost)}원</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
        <Button
          disabled={!selected || resolved.length === 0}
          onClick={() => selected && onApply(selected, resolved)}
        >
          이 배합 적용
        </Button>
      </DialogFooter>
    </>
  );
}
