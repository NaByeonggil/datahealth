"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, Search } from "lucide-react";

interface LookupResult {
  receiptNo: string;
  title: string;
  content: string;
  createdAt: string;
  status: "received" | "answered" | "closed";
  statusLabel: string;
  answer: string | null;
  answeredAt: string | null;
}

export function InquiryLookup({ companyName, initialReceiptNo }: { companyName: string; initialReceiptNo: string }) {
  const [receiptNo, setReceiptNo] = useState(initialReceiptNo);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/inquiry/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptNo, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "조회에 실패했습니다.");
        return;
      }
      setResult(data);
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Factory className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold">{companyName}</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">문의 조회</CardTitle>
            <p className="text-sm text-muted-foreground">접수번호와 문의하실 때 입력한 이메일을 넣어주세요.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="receiptNo">접수번호</Label>
                  <Input id="receiptNo" required placeholder="HP-XXXX-XXXX" className="font-mono"
                    value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" required autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}
              <div className="flex items-center justify-between">
                <Link href="/inquiry" className="text-sm text-muted-foreground underline underline-offset-2">
                  새 문의 작성
                </Link>
                <Button type="submit" disabled={busy || !receiptNo.trim() || !email.trim()}>
                  <Search className="h-4 w-4 mr-2" />{busy ? "조회 중..." : "조회"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {result && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{result.title}</CardTitle>
                  <Badge variant={result.status === "answered" ? "default" : "secondary"} className="shrink-0">
                    {result.statusLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  접수번호 {result.receiptNo} · {new Date(result.createdAt).toLocaleString("ko-KR")}
                </p>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm">{result.content}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">답변</CardTitle>
                {result.answeredAt && (
                  <p className="text-xs text-muted-foreground">{new Date(result.answeredAt).toLocaleString("ko-KR")}</p>
                )}
              </CardHeader>
              <CardContent>
                {result.answer ? (
                  <div className="whitespace-pre-wrap text-sm bg-blue-50 p-4 rounded-lg">{result.answer}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {result.status === "closed"
                      ? "종료된 문의입니다."
                      : "담당자가 문의를 확인하고 있습니다. 답변이 등록되면 이 화면에서 확인하실 수 있습니다."}
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
