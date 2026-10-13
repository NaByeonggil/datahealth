"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquare, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FACTORY_BOARD_LABELS, FACTORY_STATUS_LABELS,
  type FactoryBoardKey, type FactoryBoardPage,
} from "@/types/factoryBoard";

const BOARDS = Object.keys(FACTORY_BOARD_LABELS) as FactoryBoardKey[];

function HomepageBoard() {
  const router = useRouter();
  const search = useSearchParams();
  const board: FactoryBoardKey = search.get("board") === "pet" ? "pet" : "food";
  const page = Number(search.get("page")) || 1;
  const waitingOnly = search.get("waiting") === "1";

  const [reloadKey, setReloadKey] = useState(0);
  /** 어떤 조건으로 받아온 결과인지 함께 둔다 — 지금 조건과 다르면 아직 불러오는 중이다 */
  const [result, setResult] = useState<{ key: string; data: FactoryBoardPage | null; error: string | null } | null>(null);
  const key = `${board}|${page}|${waitingOnly}|${reloadKey}`;
  const loading = result?.key !== key;
  const data = result?.data ?? null;
  const error = result?.error ?? null;

  /** 게시판·필터는 주소에 둔다 — 상세에서 뒤로 왔을 때 보던 자리로 돌아온다 */
  const go = (next: { board?: FactoryBoardKey; page?: number; waiting?: boolean }) => {
    const params = new URLSearchParams();
    params.set("board", next.board ?? board);
    if (next.waiting ?? waitingOnly) params.set("waiting", "1");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.replace(`/ai/board/homepage?${params}`);
  };

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ board, page: String(page) });
    if (waitingOnly) params.set("waiting", "1");
    const fail = "목록을 불러오지 못했습니다.";
    fetch(`/api/ai/board/homepage?${params}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        setResult(res.ok ? { key, data: json, error: null } : { key, data: null, error: json.error || fail });
      })
      .catch(() => { if (!cancelled) setResult({ key, data: null, error: fail }); });
    return () => { cancelled = true; };
  }, [board, page, waitingOnly, key]);

  return (
    <div className="space-y-4">
      <Link href="/ai/board" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />문의 게시판
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">홈페이지 문의</h2>
          <p className="text-muted-foreground mt-1">
            factory.cancerwith.kr 게시판의 문의를 그대로 보여줍니다. 여기서 단 답변은 고객 게시판에 바로 등록됩니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />새로고침
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap border-b">
        <div className="flex gap-1">
          {BOARDS.map((key) => (
            <button
              key={key}
              onClick={() => go({ board: key, page: 1 })}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                board === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {FACTORY_BOARD_LABELS[key]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" className="rounded" checked={waitingOnly}
            onChange={(e) => go({ waiting: e.target.checked, page: 1 })} />
          답변 대기만 보기{data ? ` (${data.waitingCount}건)` : ""}
        </label>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : !data ? (
        <p className="text-center py-8 text-muted-foreground">로딩 중...</p>
      ) : data.items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          {waitingOnly ? "답변을 기다리는 문의가 없습니다." : "문의가 없습니다."}
        </p>
      ) : (
        <div className={`border rounded-lg overflow-x-auto ${loading ? "opacity-50" : ""}`}>
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 w-14">번호</th>
                <th className="px-3 py-2">제목</th>
                <th className="px-3 py-2 w-36">작성자</th>
                <th className="px-3 py-2 w-24">처리 단계</th>
                <th className="px-3 py-2 w-28">답변</th>
                <th className="px-3 py-2 w-28">접수일</th>
                <th className="px-3 py-2 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((item) => {
                const href = `/ai/board/homepage/${item.id}`;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-muted-foreground">{item.no}</td>
                    <td className="px-3 py-3">
                      <Link href={href} className="font-medium hover:underline">
                        <span className="text-blue-700">[{item.serviceType}]</span> {item.title}
                      </Link>
                      {item.replyCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />{item.replyCount}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {item.name}
                      {item.company && <span className="block text-xs text-muted-foreground">{item.company}</span>}
                    </td>
                    <td className="px-3 py-3">{FACTORY_STATUS_LABELS[item.status] ?? item.status}</td>
                    <td className="px-3 py-3">
                      {!item.answered ? (
                        <Badge variant="destructive">답변 대기</Badge>
                      ) : item.customerWaiting ? (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">고객 추가 글</Badge>
                      ) : (
                        <Badge variant="secondary">답변 완료</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`${href}#reply`}>
                        <Button size="sm" variant={item.answered && !item.customerWaiting ? "outline" : "default"}>
                          답변 달기
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => go({ page: data.page - 1 })}>
            <ChevronLeft className="h-4 w-4" />이전
          </Button>
          <span className="text-muted-foreground">{data.page} / {data.pageCount}</span>
          <Button variant="outline" size="sm" disabled={data.page >= data.pageCount} onClick={() => go({ page: data.page + 1 })}>
            다음<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function HomepageBoardPage() {
  // useSearchParams 는 Suspense 안에서만 쓸 수 있다
  return (
    <Suspense fallback={<p className="text-center py-8 text-muted-foreground">로딩 중...</p>}>
      <HomepageBoard />
    </Suspense>
  );
}
