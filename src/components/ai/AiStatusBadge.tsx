"use client";

import { Badge } from "@/components/ui/badge";

interface AiStatusBadgeProps {
  lastTestResult?: string | null;
  isActive: boolean;
}

export function AiStatusBadge({ lastTestResult, isActive }: AiStatusBadgeProps) {
  if (!isActive) {
    return <Badge variant="secondary">비활성</Badge>;
  }
  if (!lastTestResult) {
    return <Badge variant="outline">미테스트</Badge>;
  }
  if (lastTestResult === "success") {
    return <Badge className="bg-green-100 text-green-800 border-green-200">연결됨</Badge>;
  }
  return <Badge variant="destructive">연결 실패</Badge>;
}
