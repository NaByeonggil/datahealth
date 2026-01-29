"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import { exportSimpleQuotationPdf } from "@/lib/exports/simpleQuotationPdf";
import { exportSimpleQuotationExcel } from "@/lib/exports/simpleQuotationExcel";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

interface QuotationItem {
  id: string;
  sortOrder: number;
  category: string;
  materialName: string;
  theoryAmount: number;
  actualAmount: number;
  kgUnitPrice: number;
  materialCost: number;
  origin: string | null;
}

interface Quotation {
  id: string;
  quotationNo: string;
  productName: string;
  customerName: string | null;
  productType: { name: string; processingCost: number };
  packageUnit: number;
  bottleBoxCost: number;
  setCount: number;
  totalMaterialCost: number;
  totalAmount: number;
  note: string | null;
  items: QuotationItem[];
  createdAt: string;
}

export default function SimpleQuotationDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<Quotation | null>(null);

  useEffect(() => {
    fetch(`/api/quotation/simple/${id}`)
      .then((r) => r.json())
      .then(setData);
  }, [id]);

  if (!data) return <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>;

  const processingCostPerUnit = data.productType?.processingCost || 0;
  const processingCost = data.packageUnit * processingCostPerUnit;
  const subtotal = data.totalMaterialCost + processingCost + data.bottleBoxCost;

  const getExportData = () => ({
    quotationNo: data.quotationNo,
    productName: data.productName,
    customerName: data.customerName || "",
    packageUnit: data.packageUnit,
    bottleBoxCost: data.bottleBoxCost,
    setCount: data.setCount,
    processingCostPerUnit,
    note: data.note || "",
    items: data.items,
    totalMaterialCost: data.totalMaterialCost,
    processingCost,
    subtotal,
    totalAmount: data.totalAmount,
  });

  const handleExportPdf = () => {
    try {
      exportSimpleQuotationPdf(getExportData());
    } catch {
      toast.error("PDF 내보내기에 실패했습니다.");
    }
  };

  const handleExportExcel = () => {
    try {
      exportSimpleQuotationExcel(getExportData());
    } catch {
      toast.error("Excel 내보내기에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/quotation/simple")}>
          <ArrowLeft className="h-4 w-4 mr-1" />목록
        </Button>
        <h2 className="text-xl font-bold flex-1">일반견적서 상세</h2>
        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <FileDown className="h-4 w-4 mr-1" />PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel}>
          <FileDown className="h-4 w-4 mr-1" />Excel
        </Button>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">견적번호</p>
            <p className="font-mono font-medium">{data.quotationNo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">제품명</p>
            <p className="font-medium">{data.productName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">고객사</p>
            <p>{data.customerName || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">제품유형</p>
            <p>{data.productType?.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">포장단위</p>
            <p>{data.packageUnit}정</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">병+박스 비용</p>
            <p>{fmt(data.bottleBoxCost)}원</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">세트수</p>
            <p>{data.setCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">작성일</p>
            <p>{new Date(data.createdAt).toLocaleDateString("ko-KR")}</p>
          </div>
        </CardContent>
      </Card>

      {/* 원료 목록 */}
      <Card>
        <CardHeader><CardTitle>원료 목록</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead className="w-24">구분</TableHead>
                <TableHead>원료명</TableHead>
                <TableHead className="w-28 text-right">이론량(mg)</TableHead>
                <TableHead className="w-28 text-right">실투여량(g)</TableHead>
                <TableHead className="w-32 text-right">Kg당단가(원)</TableHead>
                <TableHead className="w-32 text-right">원료비(원)</TableHead>
                <TableHead className="w-24">원산지</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    원료 항목이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center">{i + 1}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="font-medium">{item.materialName}</TableCell>
                  <TableCell className="text-right">{item.theoryAmount || ""}</TableCell>
                  <TableCell className="text-right">{item.actualAmount ? item.actualAmount.toFixed(4) : ""}</TableCell>
                  <TableCell className="text-right">{item.kgUnitPrice ? fmt(item.kgUnitPrice) : ""}</TableCell>
                  <TableCell className="text-right">{item.materialCost ? fmt(item.materialCost) : ""}</TableCell>
                  <TableCell>{item.origin || ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 가격 계산 */}
      <Card>
        <CardHeader><CardTitle>가격 계산</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-muted-foreground">원료비 합계</p>
              <p className="text-lg font-bold">{fmt(data.totalMaterialCost)}원</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-muted-foreground">가공비</p>
              <p className="text-lg font-bold">{fmt(processingCost)}원</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-muted-foreground">병+박스</p>
              <p className="text-lg font-bold">{fmt(data.bottleBoxCost)}원</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-md">
              <p className="text-xs text-muted-foreground">합계</p>
              <p className="text-lg font-bold text-blue-700">{fmt(subtotal)}원</p>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-md">
              <p className="text-xs text-muted-foreground">세트합계 (x{data.setCount})</p>
              <p className="text-xl font-bold text-primary">{fmt(data.totalAmount)}원</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 비고 */}
      {data.note && (
        <Card>
          <CardHeader><CardTitle>비고</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{data.note}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
