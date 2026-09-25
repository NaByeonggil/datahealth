"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, LogIn } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        setBusy(false);
        return;
      }
      // 레이아웃이 서버에서 사용자·메뉴를 다시 그려야 해서 전체 이동을 쓴다
      window.location.href = data.user?.mustChangePassword ? "/change-password" : next;
    } catch {
      setError("서버에 연결하지 못했습니다.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Factory className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold">헬씨팜바이오</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">견적서 시스템 로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="username">아이디</Label>
                <Input id="username" autoComplete="username" autoFocus
                  value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">비밀번호</Label>
                <Input id="password" type="password" autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy || !username || !password}>
                <LogIn className="h-4 w-4 mr-2" />{busy ? "확인 중..." : "로그인"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-4">
          계정이 필요하면 관리자에게 문의해주세요.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
