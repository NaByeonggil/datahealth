"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, FileDown } from "lucide-react";
import { toast } from "sonner";
import { ProductTypeType } from "@/types/quotation";
import { useSimpleQuotationStore } from "@/store/quotationStore";
import MaterialSearch from "@/components/quotation/MaterialSearch";

function formatNumber(num: number): string {
  return num.toLocaleString("ko-KR");
}

function parseNumber(str: string): number {
  return Number(str.replace(/,/g, "")) || 0;
}

export default function SimpleQuotationForm() {
  const store = useSimpleQuotationStore();
  const [productTypes, setProductTypes] = useState<ProductTypeType[]>([]);

  useEffect(() => {
    fetch("/api/product-types")
      .then((res) => res.json())
      .then(setProductTypes)
      .catch(() => toast.error("제품유형을 불러오지 못했습니다."));
  }, []);

  const totalMaterialCost = useMemo(
    () => store.items.reduce((sum, item) => sum + item.materialCost, 0),
    [store.items]
  );

  const processingCost = store.packageUnit * store.processingCostPerUnit;
  const subtotal = totalMaterialCost + processingCost + store.bottleBoxCost;
  const totalAmount = subtotal * store.setCount;

  const handleProductTypeChange = useCallback(
    (typeId: string) => {
      store.setField("productTypeId", typeId);
      const pt = productTypes.find((t) => t.id === typeId);
      if (pt) store.setField("processingCostPerUnit", pt.processingCost);
    },
    [productTypes, store]
  );

  const handleSave = async () => {
    if (!store.productName) {
      toast.error("제품명을 입력해주세요.");
      return;
    }
    if (!store.productTypeId) {
      toast.error("제품유형을 선택해주세요.");
      return;
    }
    try {
      const res = await fetch("/api/quotation/simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...store,
          totalMaterialCost,
          totalAmount,
        }),
      });
      if (res.ok) {
        toast.success("견적서가 저장되었습니다.");
      } else {
        toast.error("저장에 실패했습니다.");
      }
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>견적번호</Label>
            <Input
              placeholder="자동생성"
              value={store.quotationNo}
              onChange={(e) => store.setField("quotationNo", e.target.value)}
            />
          </div>
          <div>
            <Label>제품명 *</Label>
            <Input
              value={store.productName}
              onChange={(e) => store.setField("productName", e.target.value)}
            />
          </div>
          <div>
            <Label>고객사명</Label>
            <Input
              value={store.customerName}
              onChange={(e) => store.setField("customerName", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 제품유형 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>제품유형 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={store.productTypeId}
            onValueChange={handleProductTypeChange}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {productTypes.map((pt) => (
              <div key={pt.id} className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value={pt.id} id={pt.id} />
                <Label htmlFor={pt.id} className="cursor-pointer flex-1">
                  <span className="font-medium">{pt.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({formatNumber(pt.processingCost)}원)
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 포장/비용 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>포장 및 비용</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>포장단위 (정/개)</Label>
            <Input
              type="number"
              value={store.packageUnit || ""}
              onChange={(e) => store.setField("packageUnit", Number(e.target.value))}
            />
          </div>
          <div>
            <Label>병+박스 비용 (원)</Label>
            <Input
              type="number"
              value={store.bottleBoxCost || ""}
              onChange={(e) => store.setField("bottleBoxCost", Number(e.target.value))}
            />
          </div>
          <div>
            <Label>세트수</Label>
            <Input
              type="number"
              min={1}
              value={store.setCount || ""}
              onChange={(e) => store.setField("setCount", Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 원료 테이블 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>원료 목록</CardTitle>
          <Button variant="outline" size="sm" onClick={store.addItem}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No.</TableHead>
                  <TableHead className="w-24">구분</TableHead>
                  <TableHead>원료명</TableHead>
                  <TableHead className="w-28">이론량(mg)</TableHead>
                  <TableHead className="w-28">실투여량(g)</TableHead>
                  <TableHead className="w-32">Kg당단가(원)</TableHead>
                  <TableHead className="w-32">원료비(원)</TableHead>
                  <TableHead className="w-24">원산지</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      행 추가 버튼을 눌러 원료를 추가하세요.
                    </TableCell>
                  </TableRow>
                )}
                {store.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell>
                      <Select
                        value={item.category}
                        onValueChange={(v) => store.updateItem(index, "category", v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="건기식">건기식</SelectItem>
                          <SelectItem value="일반식품">일반식품</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <MaterialSearch
                        value={item.materialName}
                        onManualChange={(name) => store.updateItem(index, "materialName", name)}
                        onSelect={(mat) => {
                          store.updateItem(index, "materialName", mat.name);
                          store.updateItem(index, "kgUnitPrice", mat.unitPrice);
                          store.updateItem(index, "origin", mat.origin || "");
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-right"
                        type="number"
                        value={item.theoryAmount || ""}
                        onChange={(e) =>
                          store.updateItem(index, "theoryAmount", Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-right bg-gray-50"
                        readOnly
                        value={item.actualAmount ? item.actualAmount.toFixed(4) : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-right"
                        value={item.kgUnitPrice ? formatNumber(item.kgUnitPrice) : ""}
                        onChange={(e) =>
                          store.updateItem(index, "kgUnitPrice", parseNumber(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-right bg-gray-50"
                        readOnly
                        value={item.materialCost ? formatNumber(Math.round(item.materialCost)) : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        value={item.origin || ""}
                        onChange={(e) => store.updateItem(index, "origin", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => store.removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 가격 계산 */}
      <Card>
        <CardHeader>
          <CardTitle>가격 계산</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-muted-foreground">원료비 합계</p>
              <p className="text-lg font-bold">{formatNumber(Math.round(totalMaterialCost))}원</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-muted-foreground">
                가공비 ({store.packageUnit} x {formatNumber(store.processingCostPerUnit)})
              </p>
              <p className="text-lg font-bold">{formatNumber(processingCost)}원</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-muted-foreground">병+박스</p>
              <p className="text-lg font-bold">{formatNumber(store.bottleBoxCost)}원</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-md">
              <p className="text-xs text-muted-foreground">합계</p>
              <p className="text-lg font-bold text-blue-700">{formatNumber(Math.round(subtotal))}원</p>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-md">
              <p className="text-xs text-muted-foreground">
                세트합계 (x{store.setCount})
              </p>
              <p className="text-xl font-bold text-primary">
                {formatNumber(Math.round(totalAmount))}원
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 비고 */}
      <Card>
        <CardHeader>
          <CardTitle>비고</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={store.note}
            onChange={(e) => store.setField("note", e.target.value)}
            placeholder="메모 사항을 입력하세요."
          />
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => toast.info("PDF 내보내기 기능은 준비 중입니다.")}>
          <FileDown className="h-4 w-4 mr-2" />
          PDF 내보내기
        </Button>
        <Button variant="outline" onClick={() => toast.info("Excel 내보내기 기능은 준비 중입니다.")}>
          <FileDown className="h-4 w-4 mr-2" />
          Excel 내보내기
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          저장
        </Button>
      </div>
    </div>
  );
}
