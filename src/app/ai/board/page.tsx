"use client";

import { useEffect, useState } from "react";
import { useAiBoardStore } from "@/store/aiBoardStore";
import { InquiryCard } from "@/components/ai/InquiryCard";
import { BoardMonitorToggle } from "@/components/ai/BoardMonitorToggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "pending", label: "대기중" },
  { value: "ai_processing", label: "AI 처리중" },
  { value: "ai_completed", label: "AI 완료" },
  { value: "human_review", label: "검토 필요" },
  { value: "responded", label: "답변 완료" },
  { value: "closed", label: "종료" },
];

const TYPE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "quotation", label: "견적" },
  { value: "product", label: "제품" },
  { value: "simple", label: "단순" },
  { value: "urgent", label: "긴급" },
];

export default function BoardPage() {
  const { inquiries, loading, fetchInquiries } = useAiBoardStore();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetchInquiries({ status: statusFilter || undefined, inquiryType: typeFilter || undefined });
  }, [fetchInquiries, statusFilter, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">문의 게시판</h2>
          <p className="text-muted-foreground mt-1">고객 문의를 AI가 자동 분류하고 답변합니다.</p>
        </div>
        <div className="flex gap-2">
          <BoardMonitorToggle />
          <Link href="/ai/board/new">
            <Button><Plus className="h-4 w-4 mr-1" />새 문의</Button>
          </Link>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-1">
          <span className="text-sm text-muted-foreground self-center mr-1">상태:</span>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-2 py-1 rounded text-xs ${statusFilter === opt.value ? "bg-primary text-primary-foreground" : "bg-gray-100 hover:bg-gray-200"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <span className="text-sm text-muted-foreground self-center mr-1">유형:</span>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-2 py-1 rounded text-xs ${typeFilter === opt.value ? "bg-primary text-primary-foreground" : "bg-gray-100 hover:bg-gray-200"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">로딩 중...</p>
      ) : inquiries.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">문의가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  );
}
