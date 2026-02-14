"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AiStatsCard } from "@/components/ai/AiStatsCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bot, Activity, Clock, AlertTriangle, CheckCircle, MessageSquare, BarChart3, TrendingUp,
} from "lucide-react";

interface DashboardData {
  totalLogs: number;
  todayLogs: number;
  avgLatencyMs: number;
  fallbackRate: number;
  successRate: number;
  providerStats: { provider: string; count: number; avgLatencyMs: number }[];
  inquiry: { total: number; pending: number; completed: number; review: number };
  totalSessions: number;
  monthlyStats: { month: string; count: number; success: number }[];
}

interface LogEntry {
  id: string;
  taskType: string;
  providerUsed: string;
  latencyMs: number;
  isSuccess: boolean;
  isFallback: boolean;
  errorMessage?: string;
  createdAt: string;
}

const TASK_LABELS: Record<string, string> = {
  chat: "채팅", classify: "분류", extract: "정보추출", function_call: "함수호출", generate_response: "답변생성",
};

export default function AiDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch("/api/ai/dashboard").then((r) => r.json()).then(setData);
    fetch("/api/ai/logs?limit=20").then((r) => r.json()).then(setLogs);
  }, []);

  if (!data) return <div className="text-center py-8 text-muted-foreground">로딩 중...</div>;

  const maxMonthly = Math.max(...data.monthlyStats.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI 대시보드</h2>
        <p className="text-muted-foreground mt-1">AI 처리 현황 및 성능 통계</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <AiStatsCard title="총 처리" value={data.totalLogs} icon={<Bot className="h-8 w-8" />} />
        <AiStatsCard title="오늘 처리" value={data.todayLogs} icon={<Activity className="h-8 w-8" />} />
        <AiStatsCard title="평균 지연" value={`${data.avgLatencyMs}ms`} icon={<Clock className="h-8 w-8" />} />
        <AiStatsCard title="성공률" value={`${data.successRate}%`} icon={<CheckCircle className="h-8 w-8" />} />
        <AiStatsCard title="폴백률" value={`${data.fallbackRate}%`} icon={<AlertTriangle className="h-8 w-8" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 문의 현황 */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" />문의 현황</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span>총 문의</span><span className="font-bold">{data.inquiry.total}</span></div>
            <div className="flex justify-between text-sm"><span>대기중</span><span className="font-bold text-orange-600">{data.inquiry.pending}</span></div>
            <div className="flex justify-between text-sm"><span>처리 완료</span><span className="font-bold text-green-600">{data.inquiry.completed}</span></div>
            <div className="flex justify-between text-sm"><span>검토 필요</span><span className="font-bold text-red-600">{data.inquiry.review}</span></div>
            <div className="flex justify-between text-sm pt-2 border-t"><span>채팅 세션</span><span className="font-bold">{data.totalSessions}</span></div>
          </CardContent>
        </Card>

        {/* 프로바이더별 통계 */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />프로바이더별 통계</CardTitle></CardHeader>
          <CardContent>
            {data.providerStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">데이터 없음</p>
            ) : (
              <div className="space-y-3">
                {data.providerStats.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.provider}</span>
                    <div className="text-right">
                      <span>{p.count}회</span>
                      <span className="text-muted-foreground ml-2">({p.avgLatencyMs}ms)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 월별 추이 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />월별 처리 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {data.monthlyStats.map((m) => {
                const height = Math.max((m.count / maxMonthly) * 100, 4);
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{m.count}</span>
                    <div className="w-full bg-purple-500 rounded-t" style={{ height: `${height}%` }} title={`${m.count}건`} />
                    <span className="text-xs text-muted-foreground">{m.month.slice(5)}월</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 처리 로그 */}
      <Card>
        <CardHeader><CardTitle className="text-base">최근 처리 로그</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>작업</TableHead>
                <TableHead>프로바이더</TableHead>
                <TableHead>지연시간</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>폴백</TableHead>
                <TableHead>일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">로그가 없습니다.</TableCell></TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell><Badge variant="outline">{TASK_LABELS[log.taskType] ?? log.taskType}</Badge></TableCell>
                  <TableCell className="text-sm">{log.providerUsed}</TableCell>
                  <TableCell className="text-sm">{log.latencyMs}ms</TableCell>
                  <TableCell>
                    {log.isSuccess ? (
                      <Badge className="bg-green-100 text-green-800">성공</Badge>
                    ) : (
                      <Badge variant="destructive">실패</Badge>
                    )}
                  </TableCell>
                  <TableCell>{log.isFallback && <Badge variant="secondary">폴백</Badge>}</TableCell>
                  <TableCell className="text-xs">{new Date(log.createdAt).toLocaleString("ko-KR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
