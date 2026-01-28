"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, FileSpreadsheet, Upload, Package, Users, Building2, TrendingUp,
} from "lucide-react";

interface DashboardData {
  counts: { simple: number; detailed: number; materials: number; suppliers: number; customers: number };
  recentSimple: { id: string; quotationNo: string; productName: string; customerName: string | null; totalAmount: number; createdAt: string; productType: { name: string } }[];
  recentDetailed: { id: string; quotationNo: string; productName: string; customerName: string | null; createdAt: string }[];
  recentImports: { id: string; fileName: string; targetTable: string; status: string; successCount: number; totalRows: number; createdAt: string }[];
  monthlyStats: { month: string; simple: number; detailed: number }[];
}

const TABLE_LABELS: Record<string, string> = {
  material: "원료", supply: "자재", process: "공정", customer: "고객사", productType: "제품유형",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-8 text-center text-muted-foreground">로딩 중...</div>;

  const maxMonthly = Math.max(...data.monthlyStats.map(m => m.simple + m.detailed), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">대시보드</h2>
        <p className="text-muted-foreground mt-1">헬씨팜바이오 견적서 시스템 현황</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">일반견적서</p>
                <p className="text-2xl font-bold">{data.counts.simple}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">상세견적서</p>
                <p className="text-2xl font-bold">{data.counts.detailed}</p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">원료</p>
                <p className="text-2xl font-bold">{data.counts.materials}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">공급사</p>
                <p className="text-2xl font-bold">{data.counts.suppliers}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">고객사</p>
                <p className="text-2xl font-bold">{data.counts.customers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Monthly Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle className="text-base">빠른 작성</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href="/quotation/simple/new">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />새 일반견적서
              </Button>
            </Link>
            <Link href="/quotation/detailed/new">
              <Button className="w-full justify-start" variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />새 상세견적서
              </Button>
            </Link>
            <Link href="/import">
              <Button className="w-full justify-start" variant="outline">
                <Upload className="h-4 w-4 mr-2" />파일 임포트
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Monthly Stats (simple bar chart) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />월별 견적서 현황 (최근 6개월)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {data.monthlyStats.map((m) => {
                const total = m.simple + m.detailed;
                const height = Math.max((total / maxMonthly) * 100, 4);
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{total}</span>
                    <div className="w-full flex flex-col gap-0.5" style={{ height: `${height}%` }}>
                      {m.simple > 0 && (
                        <div className="bg-blue-500 rounded-t" style={{ flex: m.simple }} title={`일반: ${m.simple}`} />
                      )}
                      {m.detailed > 0 && (
                        <div className="bg-emerald-500 rounded-b" style={{ flex: m.detailed }} title={`상세: ${m.detailed}`} />
                      )}
                      {total === 0 && <div className="bg-muted rounded h-full" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{m.month.slice(5)}월</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 justify-center text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" />일반</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" />상세</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotations + Recent Imports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">최근 견적서</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>견적번호</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-sm">일자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSimple.length === 0 && data.recentDetailed.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">견적서가 없습니다.</TableCell></TableRow>
                )}
                {data.recentSimple.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.quotationNo}</TableCell>
                    <TableCell>{q.productName}</TableCell>
                    <TableCell><Badge variant="outline">일반</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(q.createdAt).toLocaleDateString("ko-KR")}</TableCell>
                  </TableRow>
                ))}
                {data.recentDetailed.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.quotationNo}</TableCell>
                    <TableCell>{q.productName}</TableCell>
                    <TableCell><Badge variant="secondary">상세</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(q.createdAt).toLocaleDateString("ko-KR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">최근 임포트</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>파일명</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>결과</TableHead>
                  <TableHead className="text-sm">일자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentImports.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">임포트 이력이 없습니다.</TableCell></TableRow>
                )}
                {data.recentImports.map(imp => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium text-sm">{imp.fileName}</TableCell>
                    <TableCell><Badge variant="outline">{TABLE_LABELS[imp.targetTable] || imp.targetTable}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={imp.status === "success" ? "default" : imp.status === "partial" ? "secondary" : "destructive"}>
                        {imp.successCount}/{imp.totalRows}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(imp.createdAt).toLocaleDateString("ko-KR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
