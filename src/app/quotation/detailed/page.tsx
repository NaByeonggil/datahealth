"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Sheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuotationRow {
  id: string;
  quotationNo: string;
  productName: string;
  customerName: string | null;
  productType: string;
  status: string;
  caseQty: number;
  finalUnitPrice: number;
  totalAmount: number;
  createdAt: string;
}

const fmt = (n: number) => Math.round(n || 0).toLocaleString("ko-KR");
const STATUS_LABEL: Record<string, string> = {
  draft: "작성중",
  confirmed: "확정",
  closed: "종료",
};

export default function DetailedQuotationList() {
  const router = useRouter();
  const [data, setData] = useState<QuotationRow[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const fetchData = (s?: string) => {
    const q = s !== undefined ? s : search;
    fetch(`/api/quotation/detailed?search=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((res) => { setData(res.data); setTotal(res.total); });
  };

  useEffect(() => { fetchData(""); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">상세견적서 목록</h2>
        <Link href="/quotation/detailed/new">
          <Button><Plus className="h-4 w-4 mr-2" />새 견적서 작성</Button>
        </Link>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input placeholder="제품명, 고객사, 견적번호 검색" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData()} />
        <Button variant="outline" onClick={() => fetchData()}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>견적서 ({total}건)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>견적번호</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead>고객사</TableHead>
                <TableHead>제품유형</TableHead>
                <TableHead className="text-right">수량(case)</TableHead>
                <TableHead className="text-right">납품단가</TableHead>
                <TableHead className="text-right">총액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>작성일</TableHead>
                <TableHead className="w-56 text-center">양식</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    등록된 견적서가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {data.map((q) => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/quotation/detailed/${q.id}`)}>
                  <TableCell className="font-mono text-sm">{q.quotationNo}</TableCell>
                  <TableCell className="font-medium">{q.productName}</TableCell>
                  <TableCell>{q.customerName || "-"}</TableCell>
                  <TableCell>{q.productType}</TableCell>
                  <TableCell className="text-right">{fmt(q.caseQty)}</TableCell>
                  <TableCell className="text-right">{fmt(q.finalUnitPrice)}원</TableCell>
                  <TableCell className="text-right font-medium">{fmt(q.totalAmount)}원</TableCell>
                  <TableCell>
                    <Badge variant={q.status === "confirmed" ? "default" : "secondary"}>
                      {STATUS_LABEL[q.status] || q.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(q.createdAt).toLocaleDateString("ko-KR")}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        title="엑셀 양식으로 보기"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/quotation/detailed/${q.id}?view=sheet`);
                        }}
                      >
                        <Sheet className="h-4 w-4 mr-1" />엑셀양식
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        title="엑셀 양식2 (원본 시트 그대로)"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/quotation/detailed/${q.id}?view=sheet2`);
                        }}
                      >
                        <Sheet className="h-4 w-4 mr-1" />엑셀양식2
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
