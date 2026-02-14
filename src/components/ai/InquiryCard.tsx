"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { BoardInquiryType } from "@/types/ai";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "대기중", variant: "outline" },
  ai_processing: { label: "AI 처리중", variant: "secondary" },
  ai_completed: { label: "AI 완료", variant: "default" },
  human_review: { label: "검토 필요", variant: "destructive" },
  responded: { label: "답변 완료", variant: "default" },
  closed: { label: "종료", variant: "secondary" },
};

const TYPE_LABELS: Record<string, string> = {
  quotation: "견적",
  product: "제품",
  simple: "단순",
  spam: "스팸",
  urgent: "긴급",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-500",
  normal: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600 font-bold",
};

interface InquiryCardProps {
  inquiry: BoardInquiryType;
}

export function InquiryCard({ inquiry }: InquiryCardProps) {
  const statusInfo = STATUS_LABELS[inquiry.status] ?? { label: inquiry.status, variant: "outline" as const };

  return (
    <Link href={`/ai/board/${inquiry.id}`}>
      <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              {inquiry.inquiryType && (
                <Badge variant="outline">{TYPE_LABELS[inquiry.inquiryType] ?? inquiry.inquiryType}</Badge>
              )}
              <span className={`text-xs ${PRIORITY_COLORS[inquiry.priority] ?? ""}`}>
                {inquiry.priority === "urgent" ? "긴급" : inquiry.priority === "high" ? "높음" : ""}
              </span>
            </div>
            <h3 className="font-medium text-sm truncate">{inquiry.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{inquiry.content}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">{inquiry.authorName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(inquiry.createdAt).toLocaleDateString("ko-KR")}
            </p>
            {inquiry.confidence != null && (
              <p className="text-xs mt-1">
                신뢰도: <span className={inquiry.confidence >= 0.7 ? "text-green-600" : "text-orange-600"}>
                  {Math.round(inquiry.confidence * 100)}%
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
