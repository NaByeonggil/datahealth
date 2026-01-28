"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

interface MaterialItem {
  id: string; sortOrder: number; materialName: string; specification: string | null;
  mixRatio: number; contentMg: number; inputKg: number; unitPrice: number;
  totalPrice: number; functionalContent: string | null;
}
interface SupplyItem {
  id: string; sortOrder: number; supplyName: string; specification: string | null;
  quantity: number; inputQty: number; unitPrice: number; totalPrice: number;
}
interface ProcessItem {
  id: string; sortOrder: number; processName: string;
  quantity: number; unitCost: number; totalCost: number;
}

interface Quotation {
  id: string; quotationNo: string; productName: string; customerName: string | null;
  productType: string; formType: string | null; contentAmount: number | null;
  packageUnit: number; intakeGuide: string | null;
  productionQty: number; unitWeight: number; totalWeight: number;
  yieldRate: number; actualQty: number; packagingMethod: string | null;
  inspectionCost: number; managementCost: number; deliveryCost: number;
  designCost: number; onetimeCost: number; profitRate: number;
  note: string | null;
  materials: MaterialItem[]; supplies: SupplyItem[]; processes: ProcessItem[];
  createdAt: string;
}

export default function DetailedQuotationDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<Quotation | null>(null);

  useEffect(() => {
    fetch(`/api/quotation/detailed/${id}`)
      .then((r) => r.json())
      .then(setData);
  }, [id]);

  if (!data) return <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>;

  const totalMaterialCost = data.materials.reduce((s, m) => s + m.totalPrice, 0);
  const totalSupplyCost = data.supplies.reduce((s, m) => s + m.totalPrice, 0);
  const totalProcessCost = data.processes.reduce((s, m) => s + m.totalCost, 0);
  const totalIndirectCost = data.inspectionCost + data.managementCost + data.deliveryCost + data.designCost + data.onetimeCost;
  const totalDirectCost = totalMaterialCost + totalSupplyCost + totalProcessCost;
  const totalCost = totalDirectCost + totalIndirectCost;
  const profitAmount = totalCost * (data.profitRate / 100);
  const finalAmount = totalCost + profitAmount;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/quotation/detailed")}>
          <ArrowLeft className="h-4 w-4 mr-1" />목록
        </Button>
        <h2 className="text-xl font-bold">상세견적서 상세</h2>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-muted-foreground">견적번호</p><p className="font-mono font-medium">{data.quotationNo}</p></div>
          <div><p className="text-xs text-muted-foreground">제품명</p><p className="font-medium">{data.productName}</p></div>
          <div><p className="text-xs text-muted-foreground">고객사</p><p>{data.customerName || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">작성일</p><p>{new Date(data.createdAt).toLocaleDateString("ko-KR")}</p></div>
        </CardContent>
      </Card>

      {/* 제품 정보 */}
      <Card>
        <CardHeader><CardTitle>제품 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-muted-foreground">제품유형</p><p>{data.productType}</p></div>
          <div><p className="text-xs text-muted-foreground">제형</p><p>{data.formType || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">내용량</p><p>{data.contentAmount || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">포장단위</p><p>{data.packageUnit}</p></div>
          <div><p className="text-xs text-muted-foreground">섭취량</p><p>{data.intakeGuide || "-"}</p></div>
        </CardContent>
      </Card>

      {/* 제조 정보 */}
      <Card>
        <CardHeader><CardTitle>제조 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-muted-foreground">제조단위</p><p>{fmt(data.productionQty)}개</p></div>
          <div><p className="text-xs text-muted-foreground">단위중량</p><p>{data.unitWeight}g</p></div>
          <div><p className="text-xs text-muted-foreground">총중량</p><p>{data.totalWeight}kg</p></div>
          <div><p className="text-xs text-muted-foreground">수율</p><p>{data.yieldRate}%</p></div>
          <div><p className="text-xs text-muted-foreground">실제수량</p><p>{fmt(data.actualQty)}</p></div>
          <div><p className="text-xs text-muted-foreground">포장방법</p><p>{data.packagingMethod || "-"}</p></div>
        </CardContent>
      </Card>

      {/* 1. 원료비 */}
      <Card>
        <CardHeader><CardTitle>1. 원료비</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead>원료명</TableHead>
                <TableHead className="w-24">규격</TableHead>
                <TableHead className="w-24 text-right">배합비(%)</TableHead>
                <TableHead className="w-24 text-right">함량(mg)</TableHead>
                <TableHead className="w-24 text-right">투입량(kg)</TableHead>
                <TableHead className="w-28 text-right">단가(원)</TableHead>
                <TableHead className="w-28 text-right">금액(원)</TableHead>
                <TableHead className="w-24">기능성분</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.materials.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">항목 없음</TableCell></TableRow>
              )}
              {data.materials.map((m, i) => (
                <TableRow key={m.id}>
                  <TableCell className="text-center">{i + 1}</TableCell>
                  <TableCell className="font-medium">{m.materialName}</TableCell>
                  <TableCell>{m.specification || ""}</TableCell>
                  <TableCell className="text-right">{m.mixRatio || ""}</TableCell>
                  <TableCell className="text-right">{m.contentMg || ""}</TableCell>
                  <TableCell className="text-right">{m.inputKg || ""}</TableCell>
                  <TableCell className="text-right">{m.unitPrice ? fmt(m.unitPrice) : ""}</TableCell>
                  <TableCell className="text-right">{m.totalPrice ? fmt(m.totalPrice) : ""}</TableCell>
                  <TableCell>{m.functionalContent || ""}</TableCell>
                </TableRow>
              ))}
              {data.materials.length > 0 && (
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={7} className="text-right">원료비 소계</TableCell>
                  <TableCell className="text-right">{fmt(totalMaterialCost)}원</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 2. 자재비 */}
      <Card>
        <CardHeader><CardTitle>2. 자재비</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead>자재명</TableHead>
                <TableHead className="w-24">규격</TableHead>
                <TableHead className="w-24 text-right">수량</TableHead>
                <TableHead className="w-24 text-right">투입량</TableHead>
                <TableHead className="w-28 text-right">단가(원)</TableHead>
                <TableHead className="w-28 text-right">금액(원)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.supplies.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">항목 없음</TableCell></TableRow>
              )}
              {data.supplies.map((m, i) => (
                <TableRow key={m.id}>
                  <TableCell className="text-center">{i + 1}</TableCell>
                  <TableCell className="font-medium">{m.supplyName}</TableCell>
                  <TableCell>{m.specification || ""}</TableCell>
                  <TableCell className="text-right">{m.quantity || ""}</TableCell>
                  <TableCell className="text-right">{m.inputQty || ""}</TableCell>
                  <TableCell className="text-right">{m.unitPrice ? fmt(m.unitPrice) : ""}</TableCell>
                  <TableCell className="text-right">{m.totalPrice ? fmt(m.totalPrice) : ""}</TableCell>
                </TableRow>
              ))}
              {data.supplies.length > 0 && (
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={6} className="text-right">자재비 소계</TableCell>
                  <TableCell className="text-right">{fmt(totalSupplyCost)}원</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. 공정비 */}
      <Card>
        <CardHeader><CardTitle>3. 직접제조비 (공정비)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead>공정명</TableHead>
                <TableHead className="w-28 text-right">수량(case)</TableHead>
                <TableHead className="w-28 text-right">공정단가(원)</TableHead>
                <TableHead className="w-28 text-right">총공정비(원)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.processes.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">항목 없음</TableCell></TableRow>
              )}
              {data.processes.map((m, i) => (
                <TableRow key={m.id}>
                  <TableCell className="text-center">{i + 1}</TableCell>
                  <TableCell className="font-medium">{m.processName}</TableCell>
                  <TableCell className="text-right">{m.quantity || ""}</TableCell>
                  <TableCell className="text-right">{m.unitCost ? fmt(m.unitCost) : ""}</TableCell>
                  <TableCell className="text-right">{m.totalCost ? fmt(m.totalCost) : ""}</TableCell>
                </TableRow>
              ))}
              {data.processes.length > 0 && (
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={4} className="text-right">공정비 소계</TableCell>
                  <TableCell className="text-right">{fmt(totalProcessCost)}원</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. 간접제조비 */}
      <Card>
        <CardHeader><CardTitle>4. 간접제조비</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><p className="text-xs text-muted-foreground">검사비</p><p>{fmt(data.inspectionCost)}원</p></div>
          <div><p className="text-xs text-muted-foreground">관리비</p><p>{fmt(data.managementCost)}원</p></div>
          <div><p className="text-xs text-muted-foreground">배송비</p><p>{fmt(data.deliveryCost)}원</p></div>
          <div><p className="text-xs text-muted-foreground">디자인비</p><p>{fmt(data.designCost)}원</p></div>
          <div><p className="text-xs text-muted-foreground">초회비</p><p>{fmt(data.onetimeCost)}원</p></div>
          <div className="p-3 bg-gray-50 rounded-md text-center">
            <p className="text-xs text-muted-foreground">간접제조비 소계</p>
            <p className="font-bold">{fmt(totalIndirectCost)}원</p>
          </div>
        </CardContent>
      </Card>

      {/* 종합원가 산출 */}
      <Card>
        <CardHeader><CardTitle>종합원가 산출</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-muted-foreground">1. 원료비</p>
              <p className="font-bold">{fmt(totalMaterialCost)}원</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-muted-foreground">2. 자재비</p>
              <p className="font-bold">{fmt(totalSupplyCost)}원</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-muted-foreground">3. 직접제조비</p>
              <p className="font-bold">{fmt(totalProcessCost)}원</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-muted-foreground">4. 간접제조비</p>
              <p className="font-bold">{fmt(totalIndirectCost)}원</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-md text-center">
              <p className="text-sm text-muted-foreground">총원가</p>
              <p className="text-xl font-bold text-blue-700">{fmt(totalCost)}원</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md text-center">
              <p className="text-sm text-muted-foreground">기업이윤 ({data.profitRate}%)</p>
              <p className="font-bold">{fmt(profitAmount)}원</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-md text-center">
              <p className="text-sm text-muted-foreground">최종 견적금액</p>
              <p className="text-2xl font-bold text-primary">{fmt(finalAmount)}원</p>
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
