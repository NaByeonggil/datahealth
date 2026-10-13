"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Factory, Send } from "lucide-react";

const EMPTY = { authorName: "", company: "", authorEmail: "", authorPhone: "", title: "", content: "", website: "" };

export function PublicInquiryForm({ companyName }: { companyName: string }) {
  const [form, setForm] = useState(EMPTY);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      setReceiptNo(data.receiptNo);
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Factory className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold">{companyName}</span>
        </div>

        {receiptNo ? (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <h1 className="text-lg font-semibold">문의가 접수되었습니다</h1>
              <div>
                <p className="text-sm text-muted-foreground">접수번호</p>
                <p className="text-2xl font-mono font-bold tracking-wider mt-1">{receiptNo}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                담당자가 확인한 뒤 답변을 등록합니다.
                <br />
                답변은 <b>접수번호</b>와 <b>입력하신 이메일</b>로 조회할 수 있으니 접수번호를 꼭 보관해주세요.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Link href={`/inquiry/check?no=${encodeURIComponent(receiptNo)}`}>
                  <Button>답변 조회하기</Button>
                </Link>
                <Button variant="outline" onClick={() => { setReceiptNo(null); setForm(EMPTY); setConsent(false); }}>
                  새 문의 작성
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">제조 · 견적 문의</CardTitle>
              <p className="text-sm text-muted-foreground">
                원료, 제형, 생산 수량, 포장 방식을 적어주시면 더 정확하게 안내드릴 수 있습니다.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="authorName">이름 *</Label>
                    <Input id="authorName" required maxLength={50} autoComplete="name"
                      value={form.authorName} onChange={set("authorName")} />
                  </div>
                  <div>
                    <Label htmlFor="company">회사명</Label>
                    <Input id="company" maxLength={100} autoComplete="organization"
                      value={form.company} onChange={set("company")} />
                  </div>
                  <div>
                    <Label htmlFor="authorEmail">이메일 *</Label>
                    <Input id="authorEmail" type="email" required maxLength={200} autoComplete="email"
                      placeholder="답변 조회에 사용됩니다"
                      value={form.authorEmail} onChange={set("authorEmail")} />
                  </div>
                  <div>
                    <Label htmlFor="authorPhone">연락처</Label>
                    <Input id="authorPhone" maxLength={30} autoComplete="tel" placeholder="010-0000-0000"
                      value={form.authorPhone} onChange={set("authorPhone")} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="title">제목 *</Label>
                  <Input id="title" required maxLength={150} value={form.title} onChange={set("title")} />
                </div>
                <div>
                  <Label htmlFor="content">문의 내용 *</Label>
                  <Textarea id="content" required rows={8} maxLength={5000}
                    placeholder={"예) 루테인 20mg 함유 정제 500mg, 60정 병 포장으로 1만 병 생산하려고 합니다.\n원료는 귀사 조달을 원하며 납기는 2개월 이내를 희망합니다."}
                    value={form.content} onChange={set("content")} />
                  <p className="text-xs text-muted-foreground text-right mt-1">{form.content.length.toLocaleString()} / 5,000</p>
                </div>

                {/* 자동 등록 프로그램을 거르는 칸 — 사람에게는 보이지 않는다 */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" tabIndex={-1} autoComplete="off"
                    value={form.website} onChange={set("website")} />
                </div>

                <div className="rounded-md border bg-gray-50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">개인정보 수집 · 이용 안내</p>
                  <p>수집 항목: 이름, 회사명, 이메일, 연락처, 문의 내용</p>
                  <p>이용 목적: 문의 확인 및 답변</p>
                  <p>보유 기간: 문의 처리 완료 후 1년</p>
                  <label className="flex items-center gap-2 pt-1 text-sm text-foreground">
                    <input type="checkbox" className="rounded" checked={consent}
                      onChange={(e) => setConsent(e.target.checked)} />
                    위 내용에 동의합니다 (필수)
                  </label>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <Link href="/inquiry/check" className="text-sm text-muted-foreground underline underline-offset-2">
                    이미 문의하셨나요? 답변 조회
                  </Link>
                  <Button type="submit" disabled={busy || !consent}>
                    <Send className="h-4 w-4 mr-2" />{busy ? "접수 중..." : "문의 접수"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
