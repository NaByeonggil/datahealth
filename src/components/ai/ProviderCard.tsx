"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiStatusBadge } from "./AiStatusBadge";
import { Loader2, TestTube, Save, Trash2 } from "lucide-react";
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

interface ProviderCardProps {
  provider: Provider;
  onUpdate: () => void;
}

export function ProviderCard({ provider, onUpdate }: ProviderCardProps) {
  const [form, setForm] = useState({ ...provider });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/ai/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: provider.id }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`연결 성공 (${result.latencyMs}ms)`);
      } else {
        toast.error(`연결 실패: ${result.message}`);
      }
      onUpdate();
    } catch {
      toast.error("테스트 중 오류 발생");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/ai/settings/${provider.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success("저장 완료");
      onUpdate();
    } catch {
      toast.error("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 프로바이더를 삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/ai/settings/${provider.id}`, { method: "DELETE" });
      toast.success("삭제 완료");
      onUpdate();
    } catch {
      toast.error("삭제 실패");
    }
  };

  return (
    <Card className={!form.isActive ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {form.displayName}
            <span className="text-xs text-muted-foreground font-normal">
              우선순위: {form.priority}
            </span>
          </CardTitle>
          <AiStatusBadge lastTestResult={provider.lastTestResult} isActive={form.isActive} />
        </div>
        {form.description && (
          <p className="text-sm text-muted-foreground">{form.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Base URL</Label>
            <Input
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">모델명</Label>
            <Input
              value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">API Key</Label>
            <Input
              type="password"
              value={form.apiKey ?? ""}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="선택사항"
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">우선순위 (낮을수록 우선)</Label>
            <Input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Max Tokens</Label>
            <Input
              type="number"
              value={form.maxTokens}
              onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 2048 })}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Temperature</Label>
            <Input
              type="number"
              step="0.1"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) || 0.7 })}
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded"
            />
            활성화
          </label>
          {provider.lastTestedAt && (
            <span className="text-xs text-muted-foreground ml-auto">
              마지막 테스트: {new Date(provider.lastTestedAt).toLocaleString("ko-KR")}
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <TestTube className="h-4 w-4 mr-1" />}
            연결 테스트
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            저장
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete} className="ml-auto">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
