"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Bot, Loader2, Send } from "lucide-react";
import Link from "next/link";
import type { BoardInquiryType, ExtractedInquiryData } from "@/types/ai";

const STATUS_LABELS: Record<string, string> = {
  pending: "대기중", ai_processing: "AI 처리중", ai_completed: "AI 완료",
  human_review: "검토 필요", responded: "답변 완료", closed: "종료",
};

const TYPE_LABELS: Record<string, string> = {
  quotation: "견적 문의", product: "제품 문의", simple: "단순 문의", spam: "스팸", urgent: "긴급 문의",
};

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [inquiry, setInquiry] = useState<BoardInquiryType | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [processing, setProcessing] = useState(false);
  const [responding, setResponding] = useState(false);

  const fetchInquiry = async () => {
    const res = await fetch(`/api/ai/board/${id}`);
    const data = await res.json();
    setInquiry(data);
    setAdminResponse(data.adminResponse ?? "");
  };

  useEffect(() => { fetchInquiry(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await fetch(`/api/ai/board/${id}/process`, { method: "POST" });
      toast.success("AI 처리 완료");
      fetchInquiry();
    } catch {
      toast.error("처리 실패");
    } finally {
      setProcessing(false);
    }
  };

  const handleAdminResponse = async () => {
    if (!adminResponse.trim()) return;
    setResponding(true);
    try {
      await fetch(`/api/ai/board/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminResponse }),
      });
      toast.success("답변 등록 완료");
      fetchInquiry();
    } catch {
      toast.error("답변 등록 실패");
    } finally {
      setResponding(false);
    }
  };

  if (!inquiry) return <div className="text-center py-8 text-muted-foreground">로딩 중...</div>;

  let extractedData: ExtractedInquiryData | null = null;
  try { extractedData = inquiry.extractedData ? JSON.parse(inquiry.extractedData) : null; } catch { /* ignore */ }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link href="/ai/board" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />목록으로
      </Link>

      {/* 문의 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{inquiry.title}</CardTitle>
            <div className="flex gap-2">
              <Badge>{STATUS_LABELS[inquiry.status] ?? inquiry.status}</Badge>
              {inquiry.inquiryType && <Badge variant="outline">{TYPE_LABELS[inquiry.inquiryType] ?? inquiry.inquiryType}</Badge>}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {inquiry.authorName} · {inquiry.authorEmail ?? ""} · {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
          </div>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm">{inquiry.content}</div>
        </CardContent>
      </Card>

      {/* AI 분류 결과 */}
      {inquiry.inquiryType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4" />AI 분류 결과
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">유형:</span> {TYPE_LABELS[inquiry.inquiryType] ?? inquiry.inquiryType}</div>
              <div><span className="text-muted-foreground">우선순위:</span> {inquiry.priority}</div>
              <div><span className="text-muted-foreground">신뢰도:</span> {inquiry.confidence != null ? `${Math.round(inquiry.confidence * 100)}%` : "-"}</div>
            </div>

            {extractedData && (
              <>
                <Separator />
                <div className="text-sm space-y-2">
                  <p className="font-medium">추출된 정보:</p>
                  {extractedData.materials && extractedData.materials.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">원료:</span>{" "}
                      {extractedData.materials.map((m, i) => (
                        <Badge key={i} variant="outline" className="mr-1">{m.name} {m.quantity ?? ""}</Badge>
                      ))}
                    </div>
                  )}
                  {extractedData.productType && <div><span className="text-muted-foreground">제형:</span> {extractedData.productType}</div>}
                  {extractedData.productionQty && <div><span className="text-muted-foreground">생산수량:</span> {extractedData.productionQty.toLocaleString()}개</div>}
                  {extractedData.missingInfo && extractedData.missingInfo.length > 0 && (
                    <div className="text-orange-600">
                      <span className="font-medium">누락 정보:</span> {extractedData.missingInfo.join(", ")}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI 답변 */}
      {inquiry.aiResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4" />AI 생성 답변
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm bg-blue-50 p-4 rounded-lg">{inquiry.aiResponse}</div>
          </CardContent>
        </Card>
      )}

      {/* 관리자 응답 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">관리자 응답</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={adminResponse}
            onChange={(e) => setAdminResponse(e.target.value)}
            placeholder="관리자 답변을 입력하세요..."
            rows={4}
          />
          <div className="flex gap-2">
            {inquiry.status === "pending" && (
              <Button variant="outline" onClick={handleProcess} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Bot className="h-4 w-4 mr-1" />}
                AI 처리 실행
              </Button>
            )}
            <Button onClick={handleAdminResponse} disabled={responding || !adminResponse.trim()}>
              {responding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              답변 등록
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
