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
import { Plus, Search } from "lucide-react";

interface QuotationRow {
  id: string;
  quotationNo: string;
  productName: string;
  customerName: string | null;
  totalAmount: number;
  productType: { name: string };
  createdAt: string;
}

export default function SimpleQuotationList() {
  const router = useRouter();
  const [data, setData] = useState<QuotationRow[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const fetchData = (s?: string) => {
    const q = s !== undefined ? s : search;
    fetch(`/api/quotation/simple?search=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((res) => { setData(res.data); setTotal(res.total); });
  };

  useEffect(() => { fetchData(""); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">일반견적서 목록</h2>
        <Link href="/quotation/simple/new">
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
                <TableHead className="text-right">총금액</TableHead>
                <TableHead>작성일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    등록된 견적서가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {data.map((q) => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/quotation/simple/${q.id}`)}>
                  <TableCell className="font-mono text-sm">{q.quotationNo}</TableCell>
                  <TableCell className="font-medium">{q.productName}</TableCell>
                  <TableCell>{q.customerName || "-"}</TableCell>
                  <TableCell>{q.productType?.name}</TableCell>
                  <TableCell className="text-right">{Math.round(q.totalAmount).toLocaleString()}원</TableCell>
                  <TableCell>{new Date(q.createdAt).toLocaleDateString("ko-KR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
