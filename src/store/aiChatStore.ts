import { create } from "zustand";
import type { AiChatSessionType, AiChatMessageType, FunctionCallLog } from "@/types/ai";

interface AiChatState {
  sessions: AiChatSessionType[];
  currentSessionId: string | null;
  messages: AiChatMessageType[];
  loading: boolean;
  sending: boolean;

  fetchSessions: () => Promise<void>;
  createSession: () => Promise<string>;
  selectSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (message: string) => Promise<{ functionCalls: FunctionCallLog[] } | null>;
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  loading: false,
  sending: false,

  fetchSessions: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/ai/chat/sessions");
      const data = await res.json();
      set({ sessions: data });
    } finally {
      set({ loading: false });
    }
  },

  createSession: async () => {
    const res = await fetch("/api/ai/chat/sessions", { method: "POST" });
    const session = await res.json();
    set((state) => ({ sessions: [session, ...state.sessions], currentSessionId: session.id, messages: [] }));
    return session.id;
  },

  selectSession: async (id: string) => {
    set({ loading: true, currentSessionId: id });
    try {
      const res = await fetch(`/api/ai/chat/sessions/${id}`);
      const data = await res.json();
      set({ messages: data.messages ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  deleteSession: async (id: string) => {
    await fetch(`/api/ai/chat/sessions/${id}`, { method: "DELETE" });
    const state = get();
    const remaining = state.sessions.filter((s) => s.id !== id);
    set({
      sessions: remaining,
      currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
      messages: state.currentSessionId === id ? [] : state.messages,
    });
  },

  sendMessage: async (message: string) => {
    const state = get();
    let sessionId = state.currentSessionId;

    if (!sessionId) {
      sessionId = await get().createSession();
    }

    // 낙관적 UI 업데이트: 사용자 메시지 즉시 표시
    const tempUserMsg: AiChatMessageType = {
      id: `temp_${Date.now()}`,
      sessionId: sessionId!,
      role: "user",
      content: message,
      tokenCount: 0,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, tempUserMsg], sending: true }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });
      const data = await res.json();

      // 메시지 업데이트 (임시 → 실제)
      set((state) => {
        const filtered = state.messages.filter((m) => m.id !== tempUserMsg.id);
        const newMessages = [
          ...filtered,
          data.userMessage,
          ...(data.functionMessages ?? []),
          data.assistantMessage,
        ];
        return { messages: newMessages };
      });

      // 세션 목록 새로고침 (제목 업데이트)
      get().fetchSessions();

      return { functionCalls: data.functionCalls ?? [] };
    } catch {
      set({ sending: false });
      return null;
    } finally {
      set({ sending: false });
    }
  },
}));
