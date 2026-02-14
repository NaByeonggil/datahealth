"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/ai/ProviderCard";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Provider {
  id: string;
  providerName: string;
  displayName: string;
  baseUrl: string;
  apiKey?: string | null;
  modelName: string;
  priority: number;
  isActive: boolean;
  maxTokens: number;
  temperature: number;
  description?: string | null;
  lastTestedAt?: string | null;
  lastTestResult?: string | null;
}

export default function AiSettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/settings");
      const data = await res.json();
      setProviders(data);
    } catch {
      toast.error("설정 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const handleAdd = async () => {
    try {
      await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerName: `custom_${Date.now()}`,
          displayName: "새 프로바이더",
          baseUrl: "http://localhost:8080/v1",
          modelName: "default",
          priority: providers.length + 1,
        }),
      });
      toast.success("프로바이더 추가됨");
      fetchProviders();
    } catch {
      toast.error("추가 실패");
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI 설정</h2>
          <p className="text-muted-foreground mt-1">
            AI 프로바이더 연결 설정 및 우선순위를 관리합니다.
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />새 프로바이더
        </Button>
      </div>

      <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
        우선순위가 낮은 숫자일수록 먼저 시도됩니다. 실패 시 다음 우선순위로 자동 폴백됩니다.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onUpdate={fetchProviders}
          />
        ))}
      </div>

      {providers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          등록된 AI 프로바이더가 없습니다. 새 프로바이더를 추가해주세요.
        </div>
      )}
    </div>
  );
}
