"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  /** 관리자가 초기화해 준 상태면 현재 비밀번호를 묻지 않는다 */
  const [forced, setForced] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setForced(Boolean(u?.mustChangePassword)))
      .catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) { setError("새 비밀번호가 서로 다릅니다."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "변경에 실패했습니다."); setBusy(false); return; }
      toast.success("비밀번호를 변경했습니다.");
      window.location.href = "/";
    } catch {
      setError("서버에 연결하지 못했습니다.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent>
          {forced && (
            <p className="text-sm bg-amber-50 text-amber-900 rounded-md px-3 py-2 mb-4">
              관리자가 비밀번호를 초기화했습니다. 새 비밀번호를 정해주세요.
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            {!forced && (
              <div>
                <Label>현재 비밀번호</Label>
                <Input type="password" autoComplete="current-password"
                  value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
            )}
            <div>
              <Label>새 비밀번호</Label>
              <Input type="password" autoComplete="new-password"
                value={next} onChange={(e) => setNext(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">8자 이상, 숫자로만 쓸 수 없습니다.</p>
            </div>
            <div>
              <Label>새 비밀번호 확인</Label>
              <Input type="password" autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy || !next || !confirm}>
              <KeyRound className="h-4 w-4 mr-2" />{busy ? "변경 중..." : "변경"}
            </Button>
            <p className="text-xs text-muted-foreground">
              변경하면 다른 기기의 로그인은 모두 끊깁니다.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
