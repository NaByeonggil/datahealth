"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NewInquiryPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    content: "",
    authorName: "",
    authorEmail: "",
    authorPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content || !form.authorName) {
      toast.error("제목, 내용, 작성자는 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      await fetch("/api/ai/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success("문의가 등록되었습니다.");
      router.push("/ai/board");
    } catch {
      toast.error("등록 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">새 문의 작성</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">문의 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>제목 *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="문의 제목을 입력하세요"
              />
            </div>
            <div>
              <Label>내용 *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="문의 내용을 상세히 입력하세요 (원료, 수량, 제형 등)"
                rows={6}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>작성자 *</Label>
                <Input
                  value={form.authorName}
                  onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                  placeholder="이름"
                />
              </div>
              <div>
                <Label>이메일</Label>
                <Input
                  type="email"
                  value={form.authorEmail}
                  onChange={(e) => setForm({ ...form, authorEmail: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label>연락처</Label>
                <Input
                  value={form.authorPhone}
                  onChange={(e) => setForm({ ...form, authorPhone: e.target.value })}
                  placeholder="010-0000-0000"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "등록 중..." : "문의 등록"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
