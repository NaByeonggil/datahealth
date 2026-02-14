import { create } from "zustand";
import type { BoardInquiryType } from "@/types/ai";

interface AiBoardState {
  inquiries: BoardInquiryType[];
  loading: boolean;
  monitorActive: boolean;
  monitorInterval: ReturnType<typeof setInterval> | null;

  fetchInquiries: (filters?: { status?: string; inquiryType?: string }) => Promise<void>;
  createInquiry: (data: { title: string; content: string; authorName: string; authorEmail?: string; authorPhone?: string }) => Promise<void>;
  processInquiry: (id: string) => Promise<void>;
  updateInquiry: (id: string, data: Record<string, unknown>) => Promise<void>;
  startMonitor: () => void;
  stopMonitor: () => void;
}

export const useAiBoardStore = create<AiBoardState>((set, get) => ({
  inquiries: [],
  loading: false,
  monitorActive: false,
  monitorInterval: null,

  fetchInquiries: async (filters) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.inquiryType) params.set("inquiryType", filters.inquiryType);
      const res = await fetch(`/api/ai/board?${params}`);
      const data = await res.json();
      set({ inquiries: data });
    } finally {
      set({ loading: false });
    }
  },

  createInquiry: async (data) => {
    await fetch("/api/ai/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    get().fetchInquiries();
  },

  processInquiry: async (id: string) => {
    await fetch(`/api/ai/board/${id}/process`, { method: "POST" });
    get().fetchInquiries();
  },

  updateInquiry: async (id: string, data: Record<string, unknown>) => {
    await fetch(`/api/ai/board/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    get().fetchInquiries();
  },

  startMonitor: () => {
    const interval = setInterval(async () => {
      try {
        await fetch("/api/ai/board/monitor", { method: "POST" });
        get().fetchInquiries();
      } catch { /* ignore */ }
    }, 30000); // 30초 폴링
    set({ monitorActive: true, monitorInterval: interval });
  },

  stopMonitor: () => {
    const { monitorInterval } = get();
    if (monitorInterval) clearInterval(monitorInterval);
    set({ monitorActive: false, monitorInterval: null });
  },
}));
