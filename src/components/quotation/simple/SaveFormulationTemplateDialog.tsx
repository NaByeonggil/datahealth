"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { QuotationProductState } from "@/store/quotationStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 템플릿으로 굳힐 제품 (배합 + 제형·규격 기본값) */
  product: QuotationProductState | null;
  /** 이름 기본값으로 쓸 견적서 제목 */
  fallbackName?: string;
}

/**
 * 지금 화면의 배합을 배합 템플릿으로 저장한다.
 * 단가는 넘기되 "참고 단가"로만 쓰인다 — 다음에 얹을 때는 마스터의 현재 단가를 읽는다.
 */
export default function SaveFormulationTemplateDialog({
  open, onOpenChange, product, fallbackName,
}: Props) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(product?.name?.trim() || fallbackName || "");
    setNote("");
  }, [open, product, fallbackName]);

  const items = (product?.items ?? []).filter((i) => i.materialName.trim());

  const handleSave = async () => {
    if (!name.trim()) { toast.error("템플릿 이름을 입력해주세요."); return; }
    if (items.length === 0) { toast.error("저장할 원료가 없습니다."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/formulation-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          productTypeId: product?.productTypeId || null,
          productSpec: product?.productSpec || null,
          dosage: product?.dosage || null,
          subMaterialCostPerUnit: product?.subMaterialCostPerUnit ?? null,
          note: note.trim() || null,
          items: items.map((i) => ({
            category: i.category,
            role: i.role,
            materialId: i.materialId ?? null,
            materialName: i.materialName,
            theoryAmount: i.theoryAmount,
            origin: i.origin ?? null,
            // 저장 시점 단가 — 마스터에 없는 원료의 대체값이자 단가 변동 비교 기준
            refUnitPrice: i.kgUnitPrice,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "");
      }
      toast.success("배합 템플릿으로 저장했습니다.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>배합을 템플릿으로 저장</DialogTitle>
          <DialogDescription>
            원료 {items.length}종과 제형·규격·섭취방법을 함께 저장합니다.
            단가는 참고용으로만 남고, 다음에 불러올 때는 원료 마스터의 그때 단가를 씁니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>템플릿 이름 <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="예: 밀크씨슬 1000mg 정제 기본배합" />
          </div>
          <div>
            <Label>메모</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="어떤 경우에 쓰는 배합인지 적어두면 검색에 걸립니다." />
          </div>
          <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-32 overflow-y-auto">
            {items.length === 0
              ? "저장할 원료가 없습니다."
              : items.map((i, idx) => (
                  <p key={idx}>
                    {idx + 1}. [{i.role}] {i.materialName} — {i.theoryAmount}mg
                  </p>
                ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={saving || items.length === 0} onClick={handleSave}>
            {saving ? "저장 중..." : "템플릿 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
