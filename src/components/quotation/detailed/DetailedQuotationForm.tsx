"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useDetailedQuotationStore } from "@/store/detailedQuotationStore";
import MaterialSearch from "@/components/quotation/MaterialSearch";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

const PRODUCT_TYPES = ["정제", "경질캅셀", "연질캅셀", "분말스틱", "액상스틱", "파우치", "젤리"];

export default function DetailedQuotationForm() {
  const s = useDetailedQuotationStore();

  const totalMaterialCost = useMemo(
    () => s.materials.reduce((sum, m) => sum + m.totalPrice, 0), [s.materials]
  );
  const totalSupplyCost = useMemo(
    () => s.supplies.reduce((sum, m) => sum + m.totalPrice, 0), [s.supplies]
  );
  const totalProcessCost = useMemo(
    () => s.processes.reduce((sum, m) => sum + m.totalCost, 0), [s.processes]
  );
  const totalIndirectCost =
    s.inspectionCost + s.managementCost + s.deliveryCost + s.designCost + s.onetimeCost;
  const totalDirectCost = totalMaterialCost + totalSupplyCost + totalProcessCost;
  const totalCost = totalDirectCost + totalIndirectCost;
  const profitAmount = totalCost * (s.profitRate / 100);
  const finalAmount = totalCost + profitAmount;

  const handleSave = async () => {
    if (!s.productName) { toast.error("제품명을 입력해주세요."); return; }
    if (!s.productType) { toast.error("제품유형을 선택해주세요."); return; }
    try {
      const res = await fetch("/api/quotation/detailed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (res.ok) toast.success("견적서가 저장되었습니다.");
      else toast.error("저장에 실패했습니다.");
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 기본 정보 */}
      <Card>
        <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>견적번호</Label>
            <Input placeholder="자동생성" value={s.quotationNo} onChange={(e) => s.setField("quotationNo", e.target.value)} /></div>
          <div><Label>제품명 *</Label>
            <Input value={s.productName} onChange={(e) => s.setField("productName", e.target.value)} /></div>
          <div><Label>고객사명</Label>
            <Input value={s.customerName} onChange={(e) => s.setField("customerName", e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* 제품 정보 */}
      <Card>
        <CardHeader><CardTitle>제품 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label>제품유형 *</Label>
            <Select value={s.productType} onValueChange={(v) => s.setField("productType", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div><Label>제형</Label>
            <Input value={s.formType} onChange={(e) => s.setField("formType", e.target.value)} /></div>
          <div><Label>내용량</Label>
            <Input type="number" value={s.contentAmount || ""} onChange={(e) => s.setField("contentAmount", Number(e.target.value))} /></div>
          <div><Label>포장단위</Label>
            <Input type="number" value={s.packageUnit || ""} onChange={(e) => s.setField("packageUnit", Number(e.target.value))} /></div>
          <div><Label>섭취량</Label>
            <Input value={s.intakeGuide} onChange={(e) => s.setField("intakeGuide", e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* 제조 정보 */}
      <Card>
        <CardHeader><CardTitle>제조 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label>제조단위 (개)</Label>
            <Input type="number" value={s.productionQty || ""} onChange={(e) => s.setField("productionQty", Number(e.target.value))} /></div>
          <div><Label>단위중량 (g)</Label>
            <Input type="number" value={s.unitWeight || ""} onChange={(e) => s.setField("unitWeight", Number(e.target.value))} /></div>
          <div><Label>총중량 (kg)</Label>
            <Input type="number" value={s.totalWeight || ""} onChange={(e) => s.setField("totalWeight", Number(e.target.value))} /></div>
          <div><Label>수율 (%)</Label>
            <Input type="number" value={s.yieldRate} onChange={(e) => s.setField("yieldRate", Number(e.target.value))} /></div>
          <div><Label>실제수량</Label>
            <Input type="number" value={s.actualQty || ""} onChange={(e) => s.setField("actualQty", Number(e.target.value))} /></div>
          <div><Label>포장방법</Label>
            <Input value={s.packagingMethod} onChange={(e) => s.setField("packagingMethod", e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* 1. 원료비 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>1. 원료비</CardTitle>
          <Button variant="outline" size="sm" onClick={s.addMaterial}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead>원료명</TableHead>
                <TableHead className="w-24">규격</TableHead>
                <TableHead className="w-24">배합비(%)</TableHead>
                <TableHead className="w-24">함량(mg)</TableHead>
                <TableHead className="w-24">투입량(kg)</TableHead>
                <TableHead className="w-28">단가(원)</TableHead>
                <TableHead className="w-28">금액(원)</TableHead>
                <TableHead className="w-24">기능성분</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.materials.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                  행 추가 버튼을 눌러 원료를 추가하세요.</TableCell></TableRow>
              )}
              {s.materials.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center">{i + 1}</TableCell>
                  <TableCell>
                    <MaterialSearch
                      value={m.materialName}
                      onManualChange={(name) => s.updateMaterial(i, "materialName", name)}
                      onSelect={(mat) => {
                        s.updateMaterial(i, "materialName", mat.name);
                        s.updateMaterial(i, "unitPrice", mat.unitPrice);
                        if (mat.specification) s.updateMaterial(i, "specification", mat.specification);
                      }}
                    />
                  </TableCell>
                  <TableCell><Input className="h-8" value={m.specification || ""} onChange={(e) => s.updateMaterial(i, "specification", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-right" type="number" value={m.mixRatio || ""} onChange={(e) => s.updateMaterial(i, "mixRatio", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-right" type="number" value={m.contentMg || ""} onChange={(e) => s.updateMaterial(i, "contentMg", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-right" type="number" value={m.inputKg || ""} onChange={(e) => s.updateMaterial(i, "inputKg", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-right" type="number" value={m.unitPrice || ""} onChange={(e) => s.updateMaterial(i, "unitPrice", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-right bg-gray-50" readOnly value={m.totalPrice ? fmt(m.totalPrice) : ""} /></TableCell>
                  <TableCell><Input className="h-8" value={m.functionalContent || ""} onChange={(e) => s.updateMaterial(i, "functionalContent", e.target.value)} /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => s.removeMaterial(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {s.materials.length > 0 && (
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={7} className="text-right">원료비 소계</TableCell>
                  <TableCell className="text-right">{fmt(totalMaterialCost)}원</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 2. 자재비 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>2. 자재비</CardTitle>
          <Button variant="outline" size="sm" onClick={s.addSupply}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead>자재명</TableHead>
                <TableHead className="w-24">규격</TableHead>
                <TableHead className="w-24">수량</TableHead>
                <TableHead className="w-24">투입량</TableHead>
                <TableHead className="w-28">단가(원)</TableHead>
                <TableHead className="w-28">금액(원)</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.supplies.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                  행 추가 버튼을 눌러 자재를 추가하세요.</TableCell></TableRow>
              )}
              {s.supplies.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center">{i + 1}</TableCell>
                  <TableCell><Input className="h-8" value={m.supplyName} onChange={(e) => s.updateSupply(i, "supplyName", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8" value={m.specification || ""} onChange={(e) => s.updateSupply(i, "specification", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-right" type="number" value={m.quantity || ""} onChange={(e) => s.updateSupply(i, "quantity", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-right" type="number" value={m.inputQty || ""} onChange={(e) => s.updateSupply(i, "inputQty", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-right" type="number" value={m.unitPrice || ""} onChange={(e) => s.updateSupply(i, "unitPrice", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-right bg-gray-50" readOnly value={m.totalPrice ? fmt(m.totalPrice) : ""} /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => s.removeSupply(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {s.supplies.length > 0 && (
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={6} className="text-right">자재비 소계</TableCell>
                  <TableCell className="text-right">{fmt(totalSupplyCost)}원</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. 직접제조비 (공정비) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>3. 직접제조비 (공정비)</CardTitle>
          <Button variant="outline" size="sm" onClick={s.addProcess}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead>공정명</TableHead>
                <TableHead className="w-28">수량(case)</TableHead>
                <TableHead className="w-28">공정단가(원)</TableHead>
                <TableHead className="w-28">총공정비(원)</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.processes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  행 추가 버튼을 눌러 공정을 추가하세요.</TableCell></TableRow>
              )}
              {s.processes.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center">{i + 1}</TableCell>
                  <TableCell><Input className="h-8" value={m.processName} onChange={(e) => s.updateProcess(i, "processName", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-right" type="number" value={m.quantity || ""} onChange={(e) => s.updateProcess(i, "quantity", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-right" type="number" value={m.unitCost || ""} onChange={(e) => s.updateProcess(i, "unitCost", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-right bg-gray-50" readOnly value={m.totalCost ? fmt(m.totalCost) : ""} /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => s.removeProcess(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {s.processes.length > 0 && (
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={4} className="text-right">공정비 소계</TableCell>
                  <TableCell className="text-right">{fmt(totalProcessCost)}원</TableCell>
                  <TableCell></TableCell>
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
          <div><Label>검사비 (원)</Label>
            <Input type="number" value={s.inspectionCost || ""} onChange={(e) => s.setField("inspectionCost", Number(e.target.value))} /></div>
          <div><Label>관리비 (원)</Label>
            <Input type="number" value={s.managementCost || ""} onChange={(e) => s.setField("managementCost", Number(e.target.value))} /></div>
          <div><Label>배송비 (원)</Label>
            <Input type="number" value={s.deliveryCost || ""} onChange={(e) => s.setField("deliveryCost", Number(e.target.value))} /></div>
          <div><Label>디자인비 (원)</Label>
            <Input type="number" value={s.designCost || ""} onChange={(e) => s.setField("designCost", Number(e.target.value))} /></div>
          <div><Label>초회비 (원)</Label>
            <Input type="number" value={s.onetimeCost || ""} onChange={(e) => s.setField("onetimeCost", Number(e.target.value))} /></div>
          <div className="flex items-end">
            <div className="p-3 bg-gray-50 rounded-md w-full text-center">
              <p className="text-xs text-muted-foreground">간접제조비 소계</p>
              <p className="font-bold">{fmt(totalIndirectCost)}원</p>
            </div>
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
              <div className="flex items-center justify-center gap-2 mb-1">
                <Label className="text-sm">기업이윤율</Label>
                <Input className="w-20 h-8 text-right" type="number" value={s.profitRate}
                  onChange={(e) => s.setField("profitRate", Number(e.target.value))} />
                <span className="text-sm">%</span>
              </div>
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
      <Card>
        <CardHeader><CardTitle>비고</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={3} value={s.note} onChange={(e) => s.setField("note", e.target.value)} placeholder="메모 사항을 입력하세요." />
        </CardContent>
      </Card>

      {/* 액션 */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => toast.info("PDF 내보내기 기능은 준비 중입니다.")}>
          <FileDown className="h-4 w-4 mr-2" />PDF 내보내기
        </Button>
        <Button variant="outline" onClick={() => toast.info("Excel 내보내기 기능은 준비 중입니다.")}>
          <FileDown className="h-4 w-4 mr-2" />Excel 내보내기
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />저장
        </Button>
      </div>
    </div>
  );
}
