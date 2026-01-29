"use client";

import { useMemo, useEffect, useState } from "react";
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
import { exportToExcel, exportToPDF } from "@/utils/exportDetailedQuotation";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

const PRODUCT_TYPES = ["건강기능식품", "일반식품"];
const SUPPLY_NAMES = ["스틱필름", "단케이스", "마감스티커", "카톤"];

interface ProductType {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export default function DetailedQuotationForm() {
  const s = useDetailedQuotationStore();
  const [formTypes, setFormTypes] = useState<ProductType[]>([]);

  useEffect(() => {
    const fetchFormTypes = async () => {
      try {
        const res = await fetch("/api/product-types");
        if (res.ok) {
          const data = await res.json();
          setFormTypes(data.filter((pt: ProductType) => pt.isActive));
        }
      } catch (error) {
        console.error("제품유형(제형) 조회 실패:", error);
      }
    };
    fetchFormTypes();
  }, []);

  // 내용량에서 숫자 추출 후 제조단위와 곱하고 1000으로 나눠서 총중량 계산
  useEffect(() => {
    const contentNum = parseFloat(String(s.contentAmount).replace(/[^0-9.]/g, "")) || 0;
    if (contentNum > 0 && s.productionQty > 0) {
      const calculatedWeight = (contentNum * s.productionQty) / 1000;
      s.setField("totalWeight", calculatedWeight);
    }
  }, [s.contentAmount, s.productionQty]);

  const totalMaterialCost = useMemo(
    () => s.materials.reduce((sum, m) => sum + m.totalPrice, 0), [s.materials]
  );
  const totalSupplyCost = useMemo(
    () => s.supplies.reduce((sum, m) => sum + m.totalPrice, 0), [s.supplies]
  );
  const totalProcessCost = useMemo(
    () => s.processes[0] ? s.processes[0].quantity * s.processes[0].unitCost : 0, [s.processes]
  );
  const totalIndirectCost =
    s.inspectionCost + s.managementCost + s.deliveryCost + s.designCost;
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
            <Select value={s.formType} onValueChange={(v) => s.setField("formType", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {formTypes.map((ft) => <SelectItem key={ft.id} value={ft.name}>{ft.name}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div><Label>내용량</Label>
            <Input value={s.contentAmount || ""} onChange={(e) => s.setField("contentAmount", e.target.value)} /></div>
          <div><Label>포장단위</Label>
            <Input value={s.packageUnit || ""} onChange={(e) => s.setField("packageUnit", e.target.value)} /></div>
          <div className="col-span-2 md:col-span-4"><Label>섭취량</Label>
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
            <Input type="number" className="bg-gray-50" readOnly value={s.totalWeight || ""} /></div>
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
                <TableHead className="min-w-[200px]">원료명</TableHead>
                <TableHead className="w-24">배합비(%)</TableHead>
                <TableHead className="w-24">함량(mg)</TableHead>
                <TableHead className="w-24">투입량(kg)</TableHead>
                <TableHead className="min-w-[120px]">단가(원)</TableHead>
                <TableHead className="min-w-[120px]">총합계</TableHead>
                <TableHead className="w-24">비고</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.materials.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">
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
                        if (mat.origin) s.updateMaterial(i, "functionalContent", mat.origin);
                      }}
                    />
                  </TableCell>
                  <TableCell><Input
                    id={`mixRatio-${i}`}
                    className="h-8 text-right"
                    type="text"
                    inputMode="decimal"
                    value={m.mixRatio || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        s.updateMaterial(i, "mixRatio", val === "" ? 0 : val);
                      }
                    }}
                    onBlur={(e) => s.updateMaterial(i, "mixRatio", Number(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); document.getElementById(`contentMg-${i}`)?.focus(); }
                      else if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); document.getElementById(`mixRatio-${i-1}`)?.focus(); }
                      else if (e.key === "ArrowDown" && i < s.materials.length - 1) { e.preventDefault(); document.getElementById(`mixRatio-${i+1}`)?.focus(); }
                      else if (e.key === "ArrowRight") { e.preventDefault(); document.getElementById(`contentMg-${i}`)?.focus(); }
                    }}
                  /></TableCell>
                  <TableCell><Input
                    id={`contentMg-${i}`}
                    className="h-8 text-right"
                    type="text"
                    inputMode="decimal"
                    value={m.contentMg || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        s.updateMaterial(i, "contentMg", val === "" ? 0 : val);
                      }
                    }}
                    onBlur={(e) => s.updateMaterial(i, "contentMg", Number(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); document.getElementById(`inputKg-${i}`)?.focus(); }
                      else if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); document.getElementById(`contentMg-${i-1}`)?.focus(); }
                      else if (e.key === "ArrowDown" && i < s.materials.length - 1) { e.preventDefault(); document.getElementById(`contentMg-${i+1}`)?.focus(); }
                      else if (e.key === "ArrowLeft") { e.preventDefault(); document.getElementById(`mixRatio-${i}`)?.focus(); }
                      else if (e.key === "ArrowRight") { e.preventDefault(); document.getElementById(`inputKg-${i}`)?.focus(); }
                    }}
                  /></TableCell>
                  <TableCell><Input
                    id={`inputKg-${i}`}
                    className="h-8 text-right"
                    type="text"
                    inputMode="decimal"
                    value={m.inputKg || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        s.updateMaterial(i, "inputKg", val === "" ? 0 : val);
                      }
                    }}
                    onBlur={(e) => s.updateMaterial(i, "inputKg", Number(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); document.getElementById(`unitPrice-${i}`)?.focus(); }
                      else if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); document.getElementById(`inputKg-${i-1}`)?.focus(); }
                      else if (e.key === "ArrowDown" && i < s.materials.length - 1) { e.preventDefault(); document.getElementById(`inputKg-${i+1}`)?.focus(); }
                      else if (e.key === "ArrowLeft") { e.preventDefault(); document.getElementById(`contentMg-${i}`)?.focus(); }
                      else if (e.key === "ArrowRight") { e.preventDefault(); document.getElementById(`unitPrice-${i}`)?.focus(); }
                    }}
                  /></TableCell>
                  <TableCell><Input
                    id={`unitPrice-${i}`}
                    className="h-8 min-w-[100px] text-right"
                    type="text"
                    inputMode="numeric"
                    value={m.unitPrice ? m.unitPrice.toLocaleString("ko-KR") : ""}
                    onChange={(e) => {
                      const num = Number(e.target.value.replace(/,/g, ""));
                      if (!isNaN(num)) s.updateMaterial(i, "unitPrice", num);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); document.getElementById(`note-${i}`)?.focus(); }
                      else if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); document.getElementById(`unitPrice-${i-1}`)?.focus(); }
                      else if (e.key === "ArrowDown" && i < s.materials.length - 1) { e.preventDefault(); document.getElementById(`unitPrice-${i+1}`)?.focus(); }
                      else if (e.key === "ArrowLeft") { e.preventDefault(); document.getElementById(`inputKg-${i}`)?.focus(); }
                      else if (e.key === "ArrowRight") { e.preventDefault(); document.getElementById(`note-${i}`)?.focus(); }
                    }}
                  /></TableCell>
                  <TableCell><Input id={`totalPrice-${i}`} className="h-8 text-right bg-gray-50" readOnly value={m.totalPrice ? fmt(m.totalPrice) : ""} tabIndex={-1} /></TableCell>
                  <TableCell><Input
                    id={`note-${i}`}
                    className="h-8"
                    value={m.functionalContent || ""}
                    onChange={(e) => s.updateMaterial(i, "functionalContent", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); document.getElementById(`mixRatio-${i+1}`)?.focus(); }
                      else if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); document.getElementById(`note-${i-1}`)?.focus(); }
                      else if (e.key === "ArrowDown" && i < s.materials.length - 1) { e.preventDefault(); document.getElementById(`note-${i+1}`)?.focus(); }
                      else if (e.key === "ArrowLeft") { e.preventDefault(); document.getElementById(`unitPrice-${i}`)?.focus(); }
                    }}
                  /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => s.removeMaterial(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {s.materials.length > 0 && (
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={6} className="text-right">원료비 소계</TableCell>
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
              {s.supplies.map((m, i) => {
                const isFixed = i < SUPPLY_NAMES.length;
                return (
                  <TableRow key={i}>
                    <TableCell className="text-center">{i + 1}</TableCell>
                    <TableCell>
                      {isFixed ? (
                        <span className="font-medium">{SUPPLY_NAMES[i]}</span>
                      ) : (
                        <Input className="h-8" value={m.supplyName} onChange={(e) => s.updateSupply(i, "supplyName", e.target.value)} />
                      )}
                    </TableCell>
                    <TableCell><Input className="h-8" value={m.specification || ""} onChange={(e) => s.updateSupply(i, "specification", e.target.value)} /></TableCell>
                    <TableCell><Input className="h-8 text-right" type="number" value={m.quantity || ""} onChange={(e) => s.updateSupply(i, "quantity", Number(e.target.value))} /></TableCell>
                    <TableCell><Input className="h-8 text-right" type="number" value={m.inputQty || ""} onChange={(e) => s.updateSupply(i, "inputQty", Number(e.target.value))} /></TableCell>
                    <TableCell><Input className="h-8 text-right" type="number" value={m.unitPrice || ""} onChange={(e) => s.updateSupply(i, "unitPrice", Number(e.target.value))} /></TableCell>
                    <TableCell><Input className="h-8 text-right bg-gray-50" readOnly value={m.totalPrice ? fmt(m.totalPrice) : ""} /></TableCell>
                    <TableCell>
                      {!isFixed && (
                        <Button variant="ghost" size="sm" onClick={() => s.removeSupply(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-gray-50 font-medium">
                <TableCell colSpan={6} className="text-right">자재비 소계</TableCell>
                <TableCell className="text-right">{fmt(totalSupplyCost)}원</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. 직접제조비 (공정비) */}
      <Card>
        <CardHeader>
          <CardTitle>3. 직접제조비 (공정비)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">작업공정명</TableHead>
                <TableHead className="w-32 text-center">수량(case)</TableHead>
                <TableHead className="w-32 text-center bg-yellow-100">공정단가</TableHead>
                <TableHead className="w-32 text-center">총 공정비</TableHead>
                <TableHead>비고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {["칭량", "혼합", "스틱충진", "선별", "포장"].map((name, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-center">
                    {i === 2 && (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          className="h-8 w-20 text-right"
                          type="number"
                          value={s.processes[0]?.quantity || ""}
                          onChange={(e) => {
                            const qty = Number(e.target.value);
                            s.processes.forEach((_, idx) => s.updateProcess(idx, "quantity", qty));
                          }}
                        />
                        <span className="text-sm">set</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center bg-yellow-50">
                    {i === 2 && (
                      <Input
                        className="h-8 w-24 text-right"
                        type="number"
                        value={s.processes[0]?.unitCost || ""}
                        onChange={(e) => {
                          const cost = Number(e.target.value);
                          s.processes.forEach((_, idx) => s.updateProcess(idx, "unitCost", cost));
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {i === 2 && s.processes[0] ? fmt(s.processes[0].quantity * s.processes[0].unitCost) : ""}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-100 font-medium">
                <TableCell className="text-center">소 계</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right">{s.processes[0] ? fmt(s.processes[0].quantity * s.processes[0].unitCost) : 0}원</TableCell>
                <TableCell></TableCell>
              </TableRow>
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
          <div><Label>운반비 (원)</Label>
            <Input type="number" value={s.deliveryCost || ""} onChange={(e) => s.setField("deliveryCost", Number(e.target.value))} /></div>
          <div><Label>디자인비용 (원)</Label>
            <Input type="number" value={s.designCost || ""} onChange={(e) => s.setField("designCost", Number(e.target.value))} /></div>
          <div className="flex items-end col-span-2">
            <div className="p-3 bg-gray-50 rounded-md w-full text-center">
              <p className="text-xs text-muted-foreground">간접제조비 소계</p>
              <p className="font-bold">{fmt(totalIndirectCost)}원</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 종합원가 산출 */}
      <Card>
        <CardHeader><CardTitle>종합원가 산출내역</CardTitle></CardHeader>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-blue-50 rounded-md text-center">
              <p className="text-xs text-muted-foreground">5. 소계</p>
              <p className="font-bold text-blue-700">{fmt(totalCost)}원</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-muted-foreground">6. 기업이윤</p>
              <div className="flex items-center justify-center gap-1">
                <Input className="w-16 h-7 text-right text-sm" type="number" value={s.profitRate}
                  onChange={(e) => s.setField("profitRate", Number(e.target.value))} />
                <span className="text-xs">%</span>
              </div>
              <p className="font-bold">{fmt(profitAmount)}원</p>
            </div>
            <div className="p-3 bg-green-50 rounded-md text-center">
              <p className="text-xs text-muted-foreground">7. 합계 (VAT별도)</p>
              <p className="font-bold text-green-700">{fmt(finalAmount)}원</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-md text-center">
              <p className="text-xs text-muted-foreground">8. 1case 납품 예상가 (VAT별도)</p>
              <p className="font-bold text-orange-700">{s.productionQty ? fmt(finalAmount / s.productionQty) : 0}원</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-md text-center">
              <p className="text-xs text-muted-foreground">9. 총납품 예상가 (VAT별도)</p>
              <p className="font-bold text-primary">{fmt(finalAmount)}원</p>
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
        <Button variant="outline" onClick={async () => {
          try {
            await exportToPDF(s);
            toast.success("PDF가 다운로드되었습니다.");
          } catch (error) {
            console.error(error);
            toast.error("PDF 내보내기에 실패했습니다.");
          }
        }}>
          <FileDown className="h-4 w-4 mr-2" />PDF 내보내기
        </Button>
        <Button variant="outline" onClick={() => {
          try {
            exportToExcel(s);
            toast.success("Excel 파일이 다운로드되었습니다.");
          } catch (error) {
            console.error(error);
            toast.error("Excel 내보내기에 실패했습니다.");
          }
        }}>
          <FileDown className="h-4 w-4 mr-2" />Excel 내보내기
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />저장
        </Button>
      </div>
    </div>
  );
}
