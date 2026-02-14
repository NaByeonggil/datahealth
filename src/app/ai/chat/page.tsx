"use client";

import { ChatInterface } from "@/components/ai/ChatInterface";

export default function AiChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">AI 견적 채팅</h2>
        <p className="text-muted-foreground mt-1">
          AI와 대화하며 견적을 산출합니다. 원료, 수량, 제형을 입력하면 자동으로 비용을 계산합니다.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
