"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Trash2, Save, FileDown, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useDetailedQuotationStore } from "@/store/detailedQuotationStore";
import MasterSearch from "@/components/quotation/MasterSearch";
import NumberInput from "./NumberInput";
import { exportToExcel, exportToPDF } from "@/utils/exportDetailedQuotation";
import {
  calculateDetailedQuotation,
  calcUnitWeight,
  calcTotalWeight,
} from "@/lib/quotation/calculateDetailed";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const fmtDec = (n: number, digits = 2) =>
  n.toLocaleString("ko-KR", { maximumFractionDigits: digits });

const PRODUCT_TYPES = ["건강기능식품", "일반식품"];

interface ProductTypeOption {
  id: string;
  name: string;
  isActive: boolean;
}

/** 표 안에서 Enter / 위아래 화살표로 셀 이동. 좌우는 캐럿이 끝에 닿았을 때만 이동한다. */
function gridKeyHandler(
  section: string,
  row: number,
  col: string,
  cols: string[],
  rowCount: number
) {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    const focus = (r: number, c: string) => {
      const el = document.getElementById(`${section}-${r}-${c}`);
      if (el) {
        e.preventDefault();
        el.focus();
      }
    };
    const idx = cols.indexOf(col);
    const input = e.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd =
      input.selectionStart === input.value.length &&
      input.selectionEnd === input.value.length;

    if (e.key === "Enter") {
      if (idx < cols.length - 1) focus(row, cols[idx + 1]);
      else if (row < rowCount - 1) focus(row + 1, cols[0]);
    } else if (e.key === "ArrowUp" && row > 0) {
      focus(row - 1, col);
    } else if (e.key === "ArrowDown" && row < rowCount - 1) {
      focus(row + 1, col);
    } else if (e.key === "ArrowLeft" && atStart && idx > 0) {
      focus(row, cols[idx - 1]);
    } else if (e.key === "ArrowRight" && atEnd && idx < cols.length - 1) {
      focus(row, cols[idx + 1]);
    }
  };
}

const MATERIAL_COLS = ["name", "contentMg", "mixRatio", "unitPrice", "func"];
const SUPPLY_COLS = ["name", "spec", "quantity", "inputQty", "unitPrice", "note"];
const PROCESS_COLS = ["name", "quantity", "unitCost", "note"];
const OVERHEAD_COLS = ["name", "amount", "note"];

export default function DetailedQuotationForm() {
  const s = useDetailedQuotationStore();
  const router = useRouter();
  const [formTypes, setFormTypes] = useState<ProductTypeOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/product-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFormTypes((data || []).filter((pt: ProductTypeOption) => pt.isActive)))
      .catch(() => {});
  }, []);

  // 단위중량 / 총중량 / 이론수량 / 모든 소계는 계산 모듈 한 곳에서만 나온다
  const t = useMemo(() => calculateDetailedQuotation(s), [s]);
  const unitWeight = calcUnitWeight(s.contentAmount, s.packageUnit);
  const totalWeight = calcTotalWeight(s.contentAmount, s.productionQty, s.lossRate);

  const materialRatioSum = s.materials.reduce((sum, m) => sum + m.mixRatio, 0);
  const materialContentSum = s.materials.reduce((sum, m) => sum + m.contentMg, 0);
  const materialInputSum = s.materials.reduce((sum, m) => sum + m.inputKg, 0);

  const handleSave = async () => {
    if (!s.productName.trim()) return toast.error("제품명을 입력해주세요.");
    if (!s.productType) return toast.error("제품유형을 선택해주세요.");
    if (t.caseQty <= 0)
      return toast.error("실제수량(case)이 0입니다. 제조단위와 포장단위를 확인해주세요.");

    setSaving(true);
    try {
      const res = await fetch(
        s.id ? `/api/quotation/detailed/${s.id}` : "/api/quotation/detailed",
        {
          method: s.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "저장에 실패했습니다.");
        return;
      }
      toast.success(s.id ? "견적서가 수정되었습니다." : `저장되었습니다. (${json.quotationNo})`);
      router.push(`/quotation/detailed/${json.id}`);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const exportPayload = { ...s, unitWeight, totalWeight };

  return (
    <div className="space-y-6 max-w-6xl pb-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>견적번호</Label>
            <Input placeholder="자동생성" value={s.quotationNo}
              onChange={(e) => s.setField("quotationNo", e.target.value)} />
          </div>
          <div>
            <Label>제품명 *</Label>
            <Input value={s.productName} onChange={(e) => s.setField("productName", e.target.value)} />
          </div>
          <div>
            <Label>고객사명</Label>
            <Input value={s.customerName} onChange={(e) => s.setField("customerName", e.target.value)} />
          </div>
          <div>
            <Label>상태</Label>
            <Select value={s.status} onValueChange={(v) => s.setField("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">작성중</SelectItem>
                <SelectItem value="confirmed">확정</SelectItem>
                <SelectItem value="closed">종료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 제품 정보 */}
      <Card>
        <CardHeader><CardTitle>제품 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>제품유형 *</Label>
            <Select value={s.productType} onValueChange={(v) => s.setField("productType", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((t2) => <SelectItem key={t2} value={t2}>{t2}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>제형</Label>
            <Select value={s.formType} onValueChange={(v) => s.setField("formType", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {formTypes.map((ft) => <SelectItem key={ft.id} value={ft.name}>{ft.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>내용량 (g)</Label>
            <NumberInput className="h-9" value={s.contentAmount}
              onValueChange={(v) => s.setField("contentAmount", v)} />
          </div>
          <div>
            <Label>포장단위 (개/case)</Label>
            <NumberInput className="h-9" value={s.packageUnit}
              onValueChange={(v) => s.setField("packageUnit", v)} />
          </div>
          <div className="col-span-2 md:col-span-3">
            <Label>섭취량</Label>
            <Input value={s.intakeGuide} onChange={(e) => s.setField("intakeGuide", e.target.value)} />
          </div>
          <div>
            <Label>유효기간</Label>
            <Input type="date" value={s.validUntil}
              onChange={(e) => s.setField("validUntil", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* 제조 정보 */}
      <Card>
        <CardHeader><CardTitle>제조 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>제조단위 (개)</Label>
            <NumberInput className="h-9" thousand value={s.productionQty}
              onValueChange={(v) => s.setField("productionQty", v)} />
          </div>
          <div>
            <Label>로스율 (배수)</Label>
            <NumberInput className="h-9" value={s.lossRate}
              onValueChange={(v) => s.setField("lossRate", v)} />
            <p className="text-[11px] text-muted-foreground mt-1">총중량 = 내용량 × 제조단위 × 로스율</p>
          </div>
          <div>
            <Label>단위중량 CASE (g)</Label>
            <NumberInput className="h-9" readOnly value={unitWeight} />
            <p className="text-[11px] text-muted-foreground mt-1">내용량 × 포장단위</p>
          </div>
          <div>
            <Label>총중량 (kg)</Label>
            <NumberInput className="h-9" readOnly decimals={3} value={totalWeight} />
          </div>
          <div>
            <Label>수율 (%)</Label>
            <NumberInput className="h-9" value={s.yieldRate}
              onValueChange={(v) => s.setField("yieldRate", v)} />
          </div>
          <div>
            <Label>이론수량 (case)</Label>
            <NumberInput className="h-9" readOnly thousand value={t.theoreticalQty} />
          </div>
          <div>
            <Label>실제수량 (case) *</Label>
            <div className="flex gap-1">
              <NumberInput className="h-9" thousand value={s.caseQty}
                onValueChange={(v) => s.setField("caseQty", v)} />
              <Button type="button" variant="outline" size="sm" className="h-9 shrink-0"
                onClick={() => s.setField("caseQty", t.theoreticalQty)} title="이론수량 적용">
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">1 case 원가 환산의 분모</p>
          </div>
          <div>
            <Label>포장방법</Label>
            <Input value={s.packagingMethod}
              onChange={(e) => s.setField("packagingMethod", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* 1. 원료비 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>1. 원료비 (성분 및 배합비율)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              함량(mg)을 넣으면 배합비율 → 투입량 → 금액이 자동 계산됩니다.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={s.addMaterial}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No.</TableHead>
                <TableHead className="min-w-[180px]">원료명</TableHead>
                <TableHead className="w-24">함량(mg)</TableHead>
                <TableHead className="w-24">배합비율(%)</TableHead>
                <TableHead className="w-24">투입량(kg)</TableHead>
                <TableHead className="w-28">단가(원/kg)</TableHead>
                <TableHead className="w-28">총합계</TableHead>
                <TableHead className="w-28">기능성함량</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.materials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                    행 추가 버튼을 눌러 원료를 추가하세요.
                  </TableCell>
                </TableRow>
              )}
              {s.materials.map((m, i) => {
                const key = (col: string) =>
                  gridKeyHandler("mat", i, col, MATERIAL_COLS, s.materials.length);
                return (
                  <TableRow key={i}>
                    <TableCell className="text-center">{i + 1}</TableCell>
                    <TableCell>
                      <MasterSearch
                        inputId={`mat-${i}-name`}
                        value={m.materialName}
                        endpoint="/api/materials"
                        placeholder="원료명 검색"
                        onKeyDown={key("name")}
                        onManualChange={(name) => {
                          s.updateMaterial(i, "materialName", name);
                          s.updateMaterial(i, "materialId", null);
                        }}
                        onSelect={(mat) => {
                          s.updateMaterial(i, "materialId", mat.id);
                          s.updateMaterial(i, "materialName", mat.name);
                          s.updateMaterial(i, "unitPrice", mat.unitPrice ?? 0);
                          if (mat.specification)
                            s.updateMaterial(i, "specification", mat.specification);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <NumberInput id={`mat-${i}-contentMg`} value={m.contentMg} decimals={3}
                        onValueChange={(v) => s.updateMaterial(i, "contentMg", v)}
                        onKeyDown={key("contentMg")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput id={`mat-${i}-mixRatio`} value={m.mixRatio} decimals={4}
                        onValueChange={(v) => s.updateMaterial(i, "mixRatio", v)}
                        onKeyDown={key("mixRatio")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput value={m.inputKg} decimals={3} readOnly />
                    </TableCell>
                    <TableCell>
                      <NumberInput id={`mat-${i}-unitPrice`} value={m.unitPrice} thousand
                        onValueChange={(v) => s.updateMaterial(i, "unitPrice", v)}
                        onKeyDown={key("unitPrice")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput value={m.totalPrice} thousand readOnly />
                    </TableCell>
                    <TableCell>
                      <Input id={`mat-${i}-func`} className="h-8" value={m.functionalContent || ""}
                        onChange={(e) => s.updateMaterial(i, "functionalContent", e.target.value)}
                        onKeyDown={key("func")} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => s.removeMaterial(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {s.materials.length > 0 && (
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={2} className="text-right">합 계</TableCell>
                  <TableCell className="text-right">{fmtDec(materialContentSum)}</TableCell>
                  <TableCell className="text-right">{fmtDec(materialRatioSum, 4)}</TableCell>
                  <TableCell className="text-right">{fmtDec(materialInputSum, 3)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{fmt(t.materialCost)}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {fmtDec(t.materialPerCase)}원/case
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 2. 자재비 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>2. 자재비</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">금액 = 투입량 × 단가 (함량은 참고값)</p>
          </div>
          <Button variant="outline" size="sm" onClick={s.addSupply}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No.</TableHead>
                <TableHead className="min-w-[160px]">자재명</TableHead>
                <TableHead className="w-24">규격</TableHead>
                <TableHead className="w-24">함량(개)</TableHead>
                <TableHead className="w-24">투입량(개)</TableHead>
                <TableHead className="w-28">단가(원)</TableHead>
                <TableHead className="w-28">금액(원)</TableHead>
                <TableHead className="w-28">비고</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.supplies.map((m, i) => {
                const key = (col: string) =>
                  gridKeyHandler("sup", i, col, SUPPLY_COLS, s.supplies.length);
                return (
                  <TableRow key={i}>
                    <TableCell className="text-center">{i + 1}</TableCell>
                    <TableCell>
                      <MasterSearch
                        inputId={`sup-${i}-name`}
                        value={m.supplyName}
                        endpoint="/api/supplies"
                        placeholder="자재명 검색"
                        onKeyDown={key("name")}
                        onManualChange={(name) => {
                          s.updateSupply(i, "supplyName", name);
                          s.updateSupply(i, "supplyId", null);
                        }}
                        onSelect={(item) => {
                          s.updateSupply(i, "supplyId", item.id);
                          s.updateSupply(i, "supplyName", item.name);
                          s.updateSupply(i, "unitPrice", item.unitPrice ?? 0);
                          if (item.specification)
                            s.updateSupply(i, "specification", item.specification);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input id={`sup-${i}-spec`} className="h-8" value={m.specification || ""}
                        onChange={(e) => s.updateSupply(i, "specification", e.target.value)}
                        onKeyDown={key("spec")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput id={`sup-${i}-quantity`} value={m.quantity} thousand
                        onValueChange={(v) => s.updateSupply(i, "quantity", v)}
                        onKeyDown={key("quantity")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput id={`sup-${i}-inputQty`} value={m.inputQty} thousand
                        onValueChange={(v) => s.updateSupply(i, "inputQty", v)}
                        onKeyDown={key("inputQty")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput id={`sup-${i}-unitPrice`} value={m.unitPrice} thousand
                        onValueChange={(v) => s.updateSupply(i, "unitPrice", v)}
                        onKeyDown={key("unitPrice")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput value={m.totalPrice} thousand readOnly />
                    </TableCell>
                    <TableCell>
                      <Input id={`sup-${i}-note`} className="h-8" value={m.note || ""}
                        onChange={(e) => s.updateSupply(i, "note", e.target.value)}
                        onKeyDown={key("note")} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => s.removeSupply(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={6} className="text-right">소 계</TableCell>
                <TableCell className="text-right">{fmt(t.supplyCost)}</TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {fmtDec(t.supplyPerCase)}원/case
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. 직접제조비 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>3. 직접제조비 (공정비)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">총공정비 = 수량(case) × 공정단가</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={s.applyCaseQtyToProcesses}>
              <Wand2 className="h-4 w-4 mr-1" />수량 일괄적용
            </Button>
            <Button variant="outline" size="sm" onClick={s.addProcess}>
              <Plus className="h-4 w-4 mr-1" />행 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No.</TableHead>
                <TableHead className="min-w-[180px]">작업공정명</TableHead>
                <TableHead className="w-28">수량(case)</TableHead>
                <TableHead className="w-28">공정단가</TableHead>
                <TableHead className="w-32">총공정비</TableHead>
                <TableHead className="w-32">비고</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.processes.map((p, i) => {
                const key = (col: string) =>
                  gridKeyHandler("prc", i, col, PROCESS_COLS, s.processes.length);
                return (
                  <TableRow key={i}>
                    <TableCell className="text-center">{i + 1}</TableCell>
                    <TableCell>
                      <MasterSearch
                        inputId={`prc-${i}-name`}
                        value={p.processName}
                        endpoint="/api/processes"
                        priceField="unitCost"
                        placeholder="공정명 검색"
                        onKeyDown={key("name")}
                        onManualChange={(name) => {
                          s.updateProcess(i, "processName", name);
                          s.updateProcess(i, "processId", null);
                        }}
                        onSelect={(item) => {
                          s.updateProcess(i, "processId", item.id);
                          s.updateProcess(i, "processName", item.name);
                          s.updateProcess(i, "unitCost", item.unitCost ?? 0);
                          if (!p.quantity) s.updateProcess(i, "quantity", s.caseQty);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <NumberInput id={`prc-${i}-quantity`} value={p.quantity} thousand
                        onValueChange={(v) => s.updateProcess(i, "quantity", v)}
                        onKeyDown={key("quantity")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput id={`prc-${i}-unitCost`} value={p.unitCost} thousand
                        onValueChange={(v) => s.updateProcess(i, "unitCost", v)}
                        onKeyDown={key("unitCost")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput value={p.totalCost} thousand readOnly />
                    </TableCell>
                    <TableCell>
                      <Input id={`prc-${i}-note`} className="h-8" value={p.note || ""}
                        onChange={(e) => s.updateProcess(i, "note", e.target.value)}
                        onKeyDown={key("note")} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => s.removeProcess(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={4} className="text-right">소 계</TableCell>
                <TableCell className="text-right">{fmt(t.processCost)}</TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {fmtDec(t.processPerCase)}원/case
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. 간접제조비 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>4. 간접제조비</CardTitle>
          <Button variant="outline" size="sm" onClick={s.addOverhead}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No.</TableHead>
                <TableHead className="min-w-[180px]">내용</TableHead>
                <TableHead className="w-32">금액(원)</TableHead>
                <TableHead>비고</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.overheads.map((o, i) => {
                const key = (col: string) =>
                  gridKeyHandler("ovh", i, col, OVERHEAD_COLS, s.overheads.length);
                return (
                  <TableRow key={i}>
                    <TableCell className="text-center">{i + 1}</TableCell>
                    <TableCell>
                      <Input id={`ovh-${i}-name`} className="h-8" value={o.name}
                        onChange={(e) => s.updateOverhead(i, "name", e.target.value)}
                        onKeyDown={key("name")} />
                    </TableCell>
                    <TableCell>
                      <NumberInput id={`ovh-${i}-amount`} value={o.amount} thousand
                        onValueChange={(v) => s.updateOverhead(i, "amount", v)}
                        onKeyDown={key("amount")} />
                    </TableCell>
                    <TableCell>
                      <Input id={`ovh-${i}-note`} className="h-8" value={o.note || ""}
                        onChange={(e) => s.updateOverhead(i, "note", e.target.value)}
                        onKeyDown={key("note")} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => s.removeOverhead(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={2} className="text-right">소 계</TableCell>
                <TableCell className="text-right">{fmt(t.overheadCost)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {fmtDec(t.overheadPerCase)}원/case
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 종합원가 산출내역 */}
      <Card>
        <CardHeader>
          <CardTitle>종합원가 산출내역</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            모든 금액은 실제수량 {fmt(t.caseQty)} case 기준으로 환산됩니다.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {[
                ["1. 원료비", t.materialPerCase, t.materialCost],
                ["2. 자재비", t.supplyPerCase, t.supplyCost],
                ["3. 직접제조비", t.processPerCase, t.processCost],
                ["4. 간접제조비", t.overheadPerCase, t.overheadCost],
              ].map(([label, perCase, total]) => (
                <TableRow key={label as string}>
                  <TableCell className="w-56">{label}</TableCell>
                  <TableCell className="text-right w-40">{fmtDec(perCase as number)} 원/case</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    총 {fmt(total as number)} 원
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>5. 소계 (원가)</TableCell>
                <TableCell className="text-right">{fmtDec(t.costPerCase)} 원/case</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  총 {fmt(t.totalCostAmount)} 원
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>6. 기업이윤</span>
                    <NumberInput className="w-20 h-8" value={s.profitRate}
                      onValueChange={(v) => s.setField("profitRate", v)} />
                    <span className="text-sm">%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{fmtDec(t.profitPerCase)} 원/case</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  총 {fmt(t.totalProfitAmount)} 원
                </TableCell>
              </TableRow>
              <TableRow className="font-medium">
                <TableCell>7. 합계 (VAT 별도)</TableCell>
                <TableCell className="text-right">{fmtDec(t.pricePerCaseExVat)} 원/case</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  총 {fmt(t.totalAmountExVat)} 원
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>8. 1case 납품 예상가</span>
                    <span className="text-xs text-muted-foreground">VAT</span>
                    <NumberInput className="w-16 h-8" value={s.vatRate}
                      onValueChange={(v) => s.setField("vatRate", v)} />
                    <span className="text-sm">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 justify-end">
                    <NumberInput className="w-32 h-9 font-bold" thousand value={s.finalUnitPrice}
                      placeholder={String(t.suggestedUnitPrice)}
                      onValueChange={(v) => s.setField("finalUnitPrice", v)} />
                    <Button type="button" variant="outline" size="sm" className="h-9"
                      onClick={() => s.setField("finalUnitPrice", t.suggestedUnitPrice)}>
                      제안가 {fmt(t.suggestedUnitPrice)}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  이론가 {fmtDec(t.pricePerCaseIncVat)} 원 (VAT 포함)
                </TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 font-bold">
                <TableCell>9. 총납품 예상가 (VAT 포함)</TableCell>
                <TableCell className="text-right">{fmt(t.finalUnitPrice)} 원/case</TableCell>
                <TableCell className="text-right text-primary">{fmt(t.totalAmount)} 원</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 비고 */}
      <Card>
        <CardHeader><CardTitle>비고</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={3} value={s.note} onChange={(e) => s.setField("note", e.target.value)}
            placeholder="메모 사항을 입력하세요." />
        </CardContent>
      </Card>

      {/* 하단 고정 요약 바 — 사이드바를 덮지 않도록 본문 폭 안에서 sticky 로 붙인다 */}
      <div className="sticky bottom-0 z-40 border rounded-md shadow-lg bg-background/95 backdrop-blur">
        <div className="px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">원가/case </span>
            <span className="font-semibold">{fmtDec(t.costPerCase)}원</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">납품단가 </span>
            <span className="font-semibold">{fmt(t.finalUnitPrice)}원</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">총액 </span>
            <span className="font-bold text-primary">{fmt(t.totalAmount)}원</span>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                await exportToPDF(exportPayload);
                toast.success("PDF가 다운로드되었습니다.");
              } catch (error) {
                console.error(error);
                toast.error("PDF 내보내기에 실패했습니다.");
              }
            }}>
              <FileDown className="h-4 w-4 mr-1" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              try {
                exportToExcel(exportPayload);
                toast.success("Excel 파일이 다운로드되었습니다.");
              } catch (error) {
                console.error(error);
                toast.error("Excel 내보내기에 실패했습니다.");
              }
            }}>
              <FileDown className="h-4 w-4 mr-1" />Excel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />{saving ? "저장 중..." : s.id ? "수정 저장" : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
