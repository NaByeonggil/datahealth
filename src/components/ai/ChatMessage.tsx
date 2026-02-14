"use client";

import type { AiChatMessageType } from "@/types/ai";
import { FunctionCallCard } from "./FunctionCallCard";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: AiChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === "function") {
    return (
      <div className="px-4 py-1">
        <FunctionCallCard
          functionName={message.functionName ?? "unknown"}
          args={message.functionArgs}
          result={message.functionResult}
        />
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 px-4 py-3 ${isUser ? "" : "bg-gray-50"}`}>
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isUser ? "bg-blue-100" : "bg-purple-100"}`}>
        {isUser ? <User className="h-4 w-4 text-blue-700" /> : <Bot className="h-4 w-4 text-purple-700" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {isUser ? "사용자" : "AI 어시스턴트"}
        </p>
        <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    </div>
  );
}
