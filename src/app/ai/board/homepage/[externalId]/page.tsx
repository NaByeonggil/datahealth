"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FACTORY_BOARD_LABELS, FACTORY_STATUS_LABELS, type FactoryThread } from "@/types/factoryBoard";

const MAX_LENGTH = 2000;

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR") : "");

function Files({ files }: { files: { filename: string; size: number }[] }) {
  if (files.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
      {files.map((f, i) => (
        <li key={i} className="flex items-center gap-1">
          <Paperclip className="h-3 w-3" />{f.filename} ({Math.max(Math.round(f.size / 1024), 1).toLocaleString()}KB)
        </li>
      ))}
    </ul>
  );
}

export default function HomepageInquiryPage({ params }: { params: Promise<{ externalId: string }> }) {
  const { externalId } = use(params);
  const [thread, setThread] = useState<FactoryThread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/board/homepage/${externalId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "문의를 불러오지 못했습니다.");
      setThread(json);
      setError(null);
    } catch (e) {
      setError((e as Error).message || "문의를 불러오지 못했습니다.");
    }
  }, [externalId]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/ai/board/homepage/${externalId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, notifyCustomer: notifyCustomer && thread?.hasEmail === true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "답변을 등록하지 못했습니다.");
      toast.success("홈페이지 문의에 답변을 등록했습니다.");
      setMessage("");
      setConfirming(false);
      load();
    } catch (e) {
      toast.error((e as Error).message || "답변을 등록하지 못했습니다.");
    } finally {
      setSending(false);
    }
  };

  const boardKey = thread?.board === "/quote/pet" ? "pet" : "food";
  const back = (
    <Link href={`/ai/board/homepage?board=${boardKey}`}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />{thread ? FACTORY_BOARD_LABELS[boardKey] : "홈페이지 문의"} 목록으로
    </Link>
  );

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {back}
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      </div>
    );
  }
  if (!thread) return <div className="text-center py-8 text-muted-foreground">로딩 중...</div>;

  const fields: [string, string | null][] = [
    ["희망 제형", thread.formulations.join(", ")],
    ["희망 포장", thread.packagings.join(", ")],
    ["예상 수량", thread.quantity],
    ["예상 예산", thread.budget],
    ["희망 납기", thread.targetDate],
    ["목표 고객", thread.targetAudience],
    ["기능성·건강 고민", thread.healthConcern],
    ["원료 방향", thread.materialType],
    ["보유 자산", thread.ownedAssets.join(", ")],
    ["목표 판매가", thread.targetPrice],
  ];
  const filled = fields.filter(([, v]) => v);
  const answered = thread.answer !== null || thread.replies.some((r) => r.authorType === "ADMIN");

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {back}

      {/* 문의 내용 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg">
              <span className="text-blue-700">[{thread.serviceType}]</span> {thread.title}
            </CardTitle>
            <div className="flex gap-2 shrink-0">
              <Badge variant="outline">{FACTORY_STATUS_LABELS[thread.status] ?? thread.status}</Badge>
              {answered ? <Badge variant="secondary">답변 완료</Badge> : <Badge variant="destructive">답변 대기</Badge>}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {[thread.name, thread.company, when(thread.createdAt)].filter(Boolean).join(" · ")}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filled.length > 0 && (
            <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
              {filled.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="whitespace-pre-wrap text-sm">{thread.message || "(작성된 내용 없음)"}</div>
          <Files files={thread.files} />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a href={thread.factoryAdminUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">홈페이지 관리자에서 열기</Button>
            </a>
            {thread.boardInquiryId && (
              <Link href={`/ai/board/${thread.boardInquiryId}`}>
                <Button variant="outline" size="sm"><Bot className="h-4 w-4 mr-1" />AI 분석 보기</Button>
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              연락처와 첨부파일은 홈페이지 관리자에서 확인합니다.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 답변·답글 */}
      {(thread.answer || thread.replies.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">답변·답글 ({thread.replies.length + (thread.answer ? 1 : 0)})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {thread.answer && (
              <div className="rounded-lg bg-blue-50 p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  <b className="text-foreground">{thread.answer.authorName ?? "담당자"}</b> · 운영자 답변 · {when(thread.answer.createdAt)}
                </div>
                <div className="whitespace-pre-wrap text-sm">{thread.answer.body}</div>
              </div>
            )}
            {thread.replies.map((reply) => (
              <div key={reply.id} className={`rounded-lg p-3 ${reply.authorType === "ADMIN" ? "bg-blue-50" : "bg-gray-50 border"}`}>
                <div className="text-xs text-muted-foreground mb-1">
                  <b className="text-foreground">{reply.authorName}</b> · {reply.authorType === "ADMIN" ? "운영자" : "고객"} · {when(reply.createdAt)}
                </div>
                {reply.body && <div className="whitespace-pre-wrap text-sm">{reply.body}</div>}
                <Files files={reply.files} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 답변 달기 */}
      <Card id="reply" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="text-base">답변 달기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="고객에게 보일 답변을 입력하세요..."
            rows={6}
            maxLength={MAX_LENGTH}
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className={`flex items-center gap-2 text-sm ${thread.hasEmail ? "" : "text-muted-foreground"}`}>
              <input type="checkbox" className="rounded" disabled={!thread.hasEmail}
                checked={notifyCustomer && thread.hasEmail} onChange={(e) => setNotifyCustomer(e.target.checked)} />
              {thread.hasEmail ? "고객에게 메일로 알림" : "고객이 이메일을 남기지 않아 메일 알림은 보낼 수 없습니다"}
            </label>
            <span className="text-xs text-muted-foreground">{message.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}자</span>
          </div>
          <div className="flex gap-2">
            {thread.aiDraft && (
              <Button variant="outline" onClick={() => setMessage(thread.aiDraft!.slice(0, MAX_LENGTH))}>
                <Bot className="h-4 w-4 mr-1" />AI 답변 초안 불러오기
              </Button>
            )}
            <Button onClick={() => setConfirming(true)} disabled={!message.trim()}>
              <Send className="h-4 w-4 mr-1" />답변 등록
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 등록 즉시 고객에게 보이므로 한 번 더 확인받는다 */}
      <Dialog open={confirming} onOpenChange={(next) => !sending && setConfirming(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>홈페이지 문의에 답변 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              아래 내용이 <b className="text-foreground">{thread.name}</b>님 문의의 답글로 등록되고, 고객이 게시판에서 바로 볼 수 있습니다.
              {notifyCustomer && thread.hasEmail && " 고객에게 알림 메일도 발송됩니다."}
            </p>
            <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md border bg-gray-50 p-3">{message.trim()}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={sending}>취소</Button>
            <Button onClick={send} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              {sending ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
