"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 되돌릴 수 없는 작업이면 빨간 버튼으로 보여준다 */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * 삭제처럼 되돌릴 수 없는 작업을 한 번 더 확인받는 공용 다이얼로그.
 * 브라우저 confirm() 대신 쓴다(모달이 페이지 스크립트를 멈추지 않게).
 */
export default function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = "확인", cancelLabel = "취소",
  destructive = false, loading = false, onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="whitespace-pre-line">{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "처리 중..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
