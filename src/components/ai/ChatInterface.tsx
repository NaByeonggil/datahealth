"use client";

import { useEffect, useRef, useState } from "react";
import { useAiChatStore } from "@/store/aiChatStore";
import { ChatMessage } from "./ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, MessageSquare, Send, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatInterface() {
  const {
    sessions, currentSessionId, messages, loading, sending,
    fetchSessions, createSession, selectSession, deleteSession, sendMessage,
  } = useAiChatStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] border rounded-lg overflow-hidden bg-white">
      {/* 좌측: 세션 목록 */}
      <div className="w-64 border-r flex flex-col shrink-0">
        <div className="p-3 border-b">
          <Button size="sm" className="w-full" onClick={createSession}>
            <Plus className="h-4 w-4 mr-1" />새 대화
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 group",
                currentSessionId === session.id && "bg-blue-50 border-r-2 border-blue-500"
              )}
              onClick={() => selectSession(session.id)}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{session.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">대화 없음</p>
          )}
        </div>
      </div>

      {/* 우측: 채팅 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentSessionId ? (
          <>
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Bot className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">AI 견적 어시스턴트</p>
                  <p className="text-sm mt-1">견적에 대해 질문해보세요</p>
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="bg-gray-100 rounded-lg px-3 py-2">&ldquo;루테인 50kg, 비타민C 30kg으로 정제 2만개 견적 부탁해&rdquo;</p>
                    <p className="bg-gray-100 rounded-lg px-3 py-2">&ldquo;경질캅셀 가공비가 얼마인가요?&rdquo;</p>
                    <p className="bg-gray-100 rounded-lg px-3 py-2">&ldquo;원료 목록에서 비타민 검색해줘&rdquo;</p>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {sending && (
                <div className="flex gap-3 px-4 py-3 bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-purple-700 animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">AI 어시스턴트</p>
                    <p className="text-sm text-muted-foreground">응답 생성 중...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="견적 관련 질문을 입력하세요..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={sending || !input.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Bot className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>대화를 선택하거나 새 대화를 시작하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
