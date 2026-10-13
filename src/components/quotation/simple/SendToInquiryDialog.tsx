"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import type { QuotationData } from "@/lib/exports/simpleQuotationPdf";
import { renderSimpleQuotationPdf } from "@/lib/exports/simpleQuotationPdfBlob";

const DEFAULT_MESSAGE = "안녕하세요. 문의하신 내용에 대한 견적서를 첨부드립니다.\n확인 후 궁금하신 점은 이 게시글에 답글로 남겨주세요.";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  quotationNo: string;
  /** 이미 보낸 적이 있으면 그 시각 */
  sentAt?: string | null;
  exportData: QuotationData;
  onSent: (sentAt: string) => void;
}

/**
 * 견적서 PDF 를 홈페이지 견적문의의 답글로 보낸다.
 * 보내는 즉시 고객이 게시판에서 볼 수 있으므로, 무엇이 나가는지 여기서 확인받는다.
 */
export default function SendToInquiryDialog({
  open, onOpenChange, quotationId, quotationNo, sentAt, exportData, onSent,
}: Props) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const pdf = await renderSimpleQuotationPdf(exportData);
      const form = new FormData();
      form.set("file", new File([pdf], `견적서_${quotationNo}.pdf`, { type: "application/pdf" }));
      form.set("message", message);
      form.set("notifyCustomer", String(notifyCustomer));

      const res = await fetch(`/api/quotation/simple/${quotationId}/send-to-inquiry`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "보내지 못했습니다.");

      toast.success("홈페이지 문의에 견적서를 보냈습니다.");
      onSent(data.sentToInquiryAt);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "보내지 못했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>홈페이지 문의에 견적서 보내기</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            견적서 <b className="text-foreground">{quotationNo}</b> PDF 가 아래 내용과 함께 문의의 답글로 등록됩니다.
            등록 즉시 고객이 견적문의 게시판에서 볼 수 있고, 문의 상태는 「견적발송」으로 바뀝니다.
          </p>
          {sentAt && (
            <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
              {new Date(sentAt).toLocaleString("ko-KR")} 에 이미 보냈습니다. 다시 보내면 답글이 하나 더 달립니다.
            </p>
          )}
          <div>
            <Label htmlFor="inquiry-message">답글 내용</Label>
            <Textarea id="inquiry-message" rows={4} maxLength={2000}
              value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)} />
            고객에게 메일로 알림 (이메일을 남긴 경우에만 발송됩니다)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>취소</Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            {sending ? "보내는 중..." : "보내기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
