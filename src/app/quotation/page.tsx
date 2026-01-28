"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface QuotationRow {
  id: string;
  quotationNo: string;
  productName: string;
  customerName: string | null;
  type: "simple" | "detailed";
  typeLabel: string;
  productType: string;
  totalAmount: number;
  createdAt: string;
}

export default function AllQuotationList() {
  const router = useRouter();
  const [data, setData] = useState<QuotationRow[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [total, setTotal] = useState(0);

  const fetchData = (s?: string) => {
    const q = s !== undefined ? s : search;
    const qs = new URLSearchParams({ search: q });
    if (typeFilter !== "all") qs.set("type", typeFilter);

    Promise.all([
      typeFilter !== "detailed"
        ? fetch(`/api/quotation/simple?search=${encodeURIComponent(q)}&limit=100`)
            .then((r) => r.json())
        : Promise.resolve({ data: [], total: 0 }),
      typeFilter !== "simple"
        ? fetch(`/api/quotation/detailed?search=${encodeURIComponent(q)}&limit=100`)
            .then((r) => r.json())
        : Promise.resolve({ data: [], total: 0 }),
    ]).then(([simpleRes, detailedRes]) => {
      const simpleRows: QuotationRow[] = (simpleRes.data || []).map(
        (q: Record<string, unknown>) => ({
          id: q.id,
          quotationNo: q.quotationNo,
          productName: q.productName,
          customerName: q.customerName,
          type: "simple" as const,
          typeLabel: "일반",
          productType: (q.productType as Record<string, string>)?.name || "",
          totalAmount: (q.totalAmount as number) || 0,
          createdAt: q.createdAt as string,
        })
      );
      const detailedRows: QuotationRow[] = (detailedRes.data || []).map(
        (q: Record<string, unknown>) => ({
          id: q.id,
          quotationNo: q.quotationNo,
          productName: q.productName,
          customerName: q.customerName,
          type: "detailed" as const,
          typeLabel: "상세",
          productType: (q.productType as string) || "",
          totalAmount: 0,
          createdAt: q.createdAt as string,
        })
      );
      const merged = [...simpleRows, ...detailedRows].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setData(merged);
      setTotal(merged.length);
    });
  };

  useEffect(() => {
    fetchData("");
  }, [typeFilter]);

  const handleRowClick = (row: QuotationRow) => {
    router.push(`/quotation/${row.type === "simple" ? "simple" : "detailed"}/${row.id}`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">전체 견적서</h2>

      <div className="flex gap-2 max-w-2xl">
        <Input
          placeholder="제품명, 고객사, 견적번호 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData()}
        />
        <Button variant="outline" onClick={() => fetchData()}>
          <Search className="h-4 w-4" />
        </Button>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="simple">일반</SelectItem>
            <SelectItem value="detailed">상세</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>견적서 ({total}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">유형</TableHead>
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    등록된 견적서가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {data.map((q) => (
                <TableRow
                  key={`${q.type}-${q.id}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(q)}
                >
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        q.type === "simple"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {q.typeLabel}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{q.quotationNo}</TableCell>
                  <TableCell className="font-medium">{q.productName}</TableCell>
                  <TableCell>{q.customerName || "-"}</TableCell>
                  <TableCell>{q.productType}</TableCell>
                  <TableCell className="text-right">
                    {q.totalAmount ? `${Math.round(q.totalAmount).toLocaleString()}원` : "-"}
                  </TableCell>
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
