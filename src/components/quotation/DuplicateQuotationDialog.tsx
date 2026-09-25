"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface DuplicateTarget {
  id: string;
  type: "simple" | "detailed";
  quotationNo: string;
  productName: string;
  customerName?: string | null;
}

interface Props {
  target: DuplicateTarget | null;
  onOpenChange: (open: boolean) => void;
  /** 복제 후 이동할 곳. 기본은 새 견적서 수정 화면 */
  gotoEdit?: boolean;
}

/**
 * 견적서 복제 — 수신처만 바꿔 다시 내보내는 흐름을 한 화면에서 끝낸다.
 *
 * 배합·포장옵션·단가는 원본 그대로 복사된다. 여기서는 받는 쪽 정보만 손보고,
 * 저장 후 수정 화면으로 넘어가 필요하면 부원료를 고친다.
 */
export default function DuplicateQuotationDialog({ target, onOpenChange, gotoEdit = true }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    productName: "", customerName: "", customerContact: "", customerPhone: "", customerFax: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setForm({
      productName: target.productName,
      customerName: target.customerName || "",
      customerContact: "",
      customerPhone: "",
      customerFax: "",
    });
  }, [target]);

  const isSimple = target?.type === "simple";

  const handleDuplicate = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/quotation/${target.type}/${target.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSimple
            ? {
                productName: form.productName,
                customerName: form.customerName || null,
                // 비워 보낸 수신 정보는 "원본 유지"가 아니라 "비움"으로 다룬다
                customerContact: form.customerContact || null,
                customerPhone: form.customerPhone || null,
                customerFax: form.customerFax || null,
              }
            : {
                productName: form.productName,
                customerName: form.customerName || null,
              }
        ),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "");
      }
      const created = await res.json();
      toast.success(`${created.quotationNo} 로 복제했습니다.`);
      onOpenChange(false);
      router.push(
        gotoEdit
          ? `/quotation/${target.type}/${created.id}/edit`
          : `/quotation/${target.type}/${created.id}`
      );
    } catch (e) {
      toast.error((e as Error).message || "복제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>견적서 복제</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.quotationNo} 를 그대로 복사합니다. 배합·포장옵션·단가는 원본과 같고, 견적번호는 새로 발행됩니다.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>{isSimple ? "견적서 제목" : "제품명"}</Label>
            <Input value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </div>
          <div>
            <Label>고객사명</Label>
            <Input value={form.customerName} placeholder="받는 곳"
              onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          </div>
          {isSimple && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>수신 담당자</Label>
                <Input value={form.customerContact} placeholder="예: 김현우님"
                  onChange={(e) => setForm({ ...form, customerContact: e.target.value })} />
              </div>
              <div>
                <Label>전화</Label>
                <Input value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              </div>
              <div>
                <Label>FAX</Label>
                <Input value={form.customerFax}
                  onChange={(e) => setForm({ ...form, customerFax: e.target.value })} />
              </div>
            </div>
          )}
          {isSimple && (
            <p className="text-xs text-muted-foreground">
              수신 정보를 비워두면 복제본에서도 비어 있습니다. 나머지 조건(납기·결제·특기사항)은 원본을 따릅니다.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>취소</Button>
          <Button disabled={saving} onClick={handleDuplicate}>
            {saving ? "복제 중..." : "복제하고 수정하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
