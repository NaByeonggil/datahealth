"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, FileDown, X } from "lucide-react";
import { toast } from "sonner";
import { ProductTypeType } from "@/types/quotation";
import { useSimpleQuotationStore } from "@/store/quotationStore";
import MaterialSearch from "@/components/quotation/MaterialSearch";
import { calculateSimpleQuotation } from "@/lib/quotation/calculateSimple";
import {
  buildQuotationNote, FOOD_TYPES, ITEM_ROLES, NoteTemplateLike,
} from "@/lib/quotation/quotationNote";
import { CompanyInfoType } from "@/lib/company/supplier";
import { exportSimpleQuotationPdf } from "@/lib/exports/simpleQuotationPdf";
import { exportSimpleQuotationExcel } from "@/lib/exports/simpleQuotationExcel";

const fmt = (n: number) => n.toLocaleString("ko-KR");

interface SimpleQuotationFormProps {
  /** 넘기면 수정 모드 — 해당 견적서를 불러와 채우고 저장 시 덮어쓴다 */
  quotationId?: string;
}

export default function SimpleQuotationForm({ quotationId }: SimpleQuotationFormProps = {}) {
  const router = useRouter();
  const store = useSimpleQuotationStore();
  const [productTypes, setProductTypes] = useState<ProductTypeType[]>([]);
  const [company, setCompany] = useState<CompanyInfoType | undefined>();
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplateLike[]>([]);
  const [saving, setSaving] = useState(false);
  /** 수정 모드에서 기존 견적서를 불러오는 중 */
  const [loading, setLoading] = useState(Boolean(quotationId));
  const isEdit = Boolean(quotationId);

  const { load, reset } = store;
  useEffect(() => {
    if (!quotationId) {
      // 새로 쓸 때는 직전 작성 내용이 남지 않게 비운다
      reset();
      return;
    }
    setLoading(true);
    fetch(`/api/quotation/simple/${quotationId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((q) => load(q))
      .catch(() => toast.error("견적서를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  useEffect(() => {
    fetch("/api/product-types")
      .then((r) => r.json())
      .then(setProductTypes)
      .catch(() => toast.error("제품유형을 불러오지 못했습니다."));
    fetch("/api/settings/company")
      .then((r) => (r.ok ? r.json() : undefined))
      .then(setCompany)
      .catch(() => undefined);
    fetch("/api/settings/quotation-notes?activeOnly=1")
      .then((r) => (r.ok ? r.json() : []))
      .then(setNoteTemplates)
      .catch(() => undefined);
  }, []);

  const calc = useMemo(
    () =>
      calculateSimpleQuotation({
        products: store.products.map((p) => ({
          name: p.name,
          processingCostPerUnit: p.processingCostPerUnit,
          subMaterialCostPerUnit: p.subMaterialCostPerUnit,
          items: p.items,
          lines: p.lines,
        })),
      }),
    [store.products]
  );

  /** 식품유형·제형·배합에 맞춰 조립한 기본 특기사항 */
  const defaultNote = useMemo(
    () =>
      buildQuotationNote(noteTemplates, {
        foodType: store.foodType,
        products: store.products.map((p) => ({
          name: p.name, formCode: p.productFormCode, typeName: p.productTypeName, items: p.items,
        })),
      }),
    [noteTemplates, store.foodType, store.products]
  );
  /** 직전에 자동으로 넣은 문구 — 사용자가 손댔는지 판단하는 기준 */
  const lastAutoNote = useRef("");

  useEffect(() => {
    if (!defaultNote) return;
    const cur = store.note.trim();
    if (!cur || cur === lastAutoNote.current.trim()) {
      lastAutoNote.current = defaultNote;
      store.setField("note", defaultNote);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultNote]);

  /** 제형 선택 — 공임비·제형 정보를 받아오고 포장방법을 다시 맞춘다 */
  const changeProductType = useCallback(
    (pi: number, typeId: string) => {
      store.setProductField(pi, "productTypeId", typeId);
      const pt = productTypes.find((t) => t.id === typeId);
      if (!pt) return;
      store.setProductField(pi, "processingCostPerUnit", pt.processingCost);
      store.setProductField(pi, "productFormCode", pt.formCode ?? "");
      store.setProductField(pi, "productTypeName", pt.name ?? "");
      store.setProductField(pi, "productCategory", pt.category ?? "");
      setTimeout(() => store.syncPackagingMethods(pi), 0);
    },
    [productTypes, store]
  );

  const getExportData = useCallback(
    () => ({
      quotationNo: store.quotationNo,
      productName: store.productName,
      customerName: store.customerName,
      customerContact: store.customerContact,
      customerPhone: store.customerPhone,
      customerFax: store.customerFax,
      validDays: store.validDays,
      deliveryTerms: store.deliveryTerms,
      paymentTerms: store.paymentTerms,
      foodType: store.foodType,
      productNames: calc.products.map((p) => p.name).join(" / "),
      productTypeNames: store.products.map((p) => p.productTypeName).filter(Boolean).join(" / "),
      productSpecs: store.products.map((p) => p.productSpec).filter(Boolean).join(" / "),
      dosages: store.products.map((p) => p.dosage).filter(Boolean).join(" / "),
      packagingMethods: calc.lines
        .map((l) => l.packagingMethod || l.displayLabel)
        .filter((v, i, a) => v && a.indexOf(v) === i)
        .join(" / "),
      note: store.note,
      products: calc.products.map((p, i) => ({ ...p, items: store.products[i]?.items ?? [] })),
      lines: calc.lines,
      totalCost: calc.totalCost,
      supplyAmount: calc.supplyAmount,
      vatAmount: calc.vatAmount,
      sumOptions: store.sumOptions,
      company,
    }),
    [store, calc, company]
  );

  const handleExportPdf = useCallback(() => {
    try { exportSimpleQuotationPdf(getExportData()); }
    catch { toast.error("PDF 내보내기에 실패했습니다."); }
  }, [getExportData]);

  const handleExportExcel = useCallback(() => {
    try { exportSimpleQuotationExcel(getExportData()); }
    catch { toast.error("Excel 내보내기에 실패했습니다."); }
  }, [getExportData]);

  const handleSave = async () => {
    if (!store.productName) { toast.error("제품명을 입력해주세요."); return; }
    if (store.products.some((p) => !p.productTypeId)) {
      toast.error("모든 제품의 제형을 선택해주세요."); return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/quotation/simple/${quotationId}` : "/api/quotation/simple",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...store,
            products: store.products.map((p, i) => ({
              ...p,
              name: p.name?.trim() || store.productName || `제품 ${i + 1}`,
            })),
            totalMaterialCost: calc.products[0]?.materialCostPerUnit ?? 0,
            totalAmount: store.sumOptions ? calc.supplyAmount : 0,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "");
      }
      const saved = await res.json();
      toast.success(isEdit ? "견적서를 수정했습니다." : "견적서가 저장되었습니다.");
      // 저장 후에는 상세 화면으로 — 폼 상태가 다음 작성에 새어 나가지 않게 비운다
      store.reset();
      router.push(`/quotation/simple/${saved.id}`);
    } catch (e) {
      toast.error((e as Error).message || (isEdit ? "수정에 실패했습니다." : "저장에 실패했습니다."));
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 기본 정보 */}
      <Card>
        <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>견적번호</Label>
            {/* 이미 발행된 번호는 바꾸지 않는다 */}
            <Input placeholder="자동생성" value={store.quotationNo} disabled={isEdit}
              onChange={(e) => store.setField("quotationNo", e.target.value)} />
          </div>
          <div>
            <Label>견적서 제목 <span className="text-destructive">*</span></Label>
            <Input value={store.productName}
              onChange={(e) => store.setField("productName", e.target.value)} />
          </div>
          <div>
            <Label>고객사명</Label>
            <Input value={store.customerName}
              onChange={(e) => store.setField("customerName", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* 견적서 양식 정보 */}
      <Card>
        <CardHeader><CardTitle>견적서 정보 (PDF 출력용)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>수신 담당자</Label>
              <Input value={store.customerContact} placeholder="예: 김현우님"
                onChange={(e) => store.setField("customerContact", e.target.value)} />
            </div>
            <div>
              <Label>전화</Label>
              <Input value={store.customerPhone}
                onChange={(e) => store.setField("customerPhone", e.target.value)} />
            </div>
            <div>
              <Label>FAX</Label>
              <Input value={store.customerFax}
                onChange={(e) => store.setField("customerFax", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>유효기간 (일)</Label>
              <Input type="number" min={0} value={store.validDays}
                onChange={(e) => store.setField("validDays", Number(e.target.value))} />
            </div>
            <div>
              <Label>납기 일자</Label>
              <Input value={store.deliveryTerms} placeholder="예: 발주 후 30일"
                onChange={(e) => store.setField("deliveryTerms", e.target.value)} />
            </div>
            <div>
              <Label>결제 조건</Label>
              <Input value={store.paymentTerms} placeholder="예: 발주 시 50%"
                onChange={(e) => store.setField("paymentTerms", e.target.value)} />
            </div>
            <div>
              <Label>식품유형</Label>
              <Select value={store.foodType} onValueChange={(v) => store.setField("foodType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOOD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">특기사항 문구가 이 값에 따라 달라집니다</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 제품 — 정제·환제처럼 제형이 다르면 제품을 추가한다 */}
      {store.products.map((p, pi) => {
        const pc = calc.products[pi];
        return (
          <Card key={pi} className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  제품 {pi + 1}
                  {p.name ? <span className="text-muted-foreground font-normal"> · {p.name}</span> : null}
                </CardTitle>
                <Button variant="ghost" size="sm" disabled={store.products.length <= 1}
                  onClick={() => store.removeProduct(pi)}>
                  <Trash2 className="h-4 w-4 text-destructive mr-1" />제품 삭제
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* 제품 기본값 */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2">
                  <Label>제품명</Label>
                  <Input value={p.name} placeholder={store.productName || "예: 모두의모발정제"}
                    onChange={(e) => store.setProductField(pi, "name", e.target.value)} />
                </div>
                <div>
                  <Label>제형 <span className="text-destructive">*</span></Label>
                  <Select value={p.productTypeId} onValueChange={(v) => changeProductType(pi, v)}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {productTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({fmt(t.processingCost)}원)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>1정당 부원료비 (원)</Label>
                  <Input type="number" min={0} value={p.subMaterialCostPerUnit}
                    onChange={(e) => store.setProductField(pi, "subMaterialCostPerUnit", Number(e.target.value))} />
                </div>
                <div>
                  <Label>제품규격</Label>
                  <Input value={p.productSpec} placeholder="예: 1000mg정제"
                    onChange={(e) => store.setProductField(pi, "productSpec", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>섭취방법</Label>
                  <Input value={p.dosage} placeholder="예: 1일 3회 1정"
                    onChange={(e) => store.setProductField(pi, "dosage", e.target.value)} />
                </div>
              </div>

              {/* 배합 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">원료 목록 (배합)</p>
                  <Button variant="outline" size="sm" onClick={() => store.addItem(pi)}>
                    <Plus className="h-4 w-4 mr-1" />행 추가
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No.</TableHead>
                        <TableHead className="w-28">구분</TableHead>
                        <TableHead className="w-28">주/부원료</TableHead>
                        <TableHead>원료명</TableHead>
                        <TableHead className="w-28">이론량(mg)</TableHead>
                        <TableHead className="w-28">Kg당단가</TableHead>
                        <TableHead className="w-24 text-right">원료비</TableHead>
                        <TableHead className="w-24">원산지</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                            행 추가 버튼을 눌러 원료를 추가하세요.
                          </TableCell>
                        </TableRow>
                      )}
                      {p.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>
                            <Select value={item.category}
                              onValueChange={(v) => store.updateItem(pi, index, "category", v)}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="건기식">건기식</SelectItem>
                                <SelectItem value="일반식품">일반식품</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={item.role || "주원료"}
                              onValueChange={(v) => store.updateItem(pi, index, "role", v)}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {ITEM_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <MaterialSearch
                              value={item.materialName}
                              onManualChange={(name) => store.updateItem(pi, index, "materialName", name)}
                              onSelect={(mat) => {
                                store.updateItem(pi, index, "materialName", mat.name);
                                store.updateItem(pi, index, "kgUnitPrice", mat.unitPrice);
                                store.updateItem(pi, index, "origin", mat.origin ?? "");
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input className="h-8" type="number" value={item.theoryAmount || ""}
                              onChange={(e) => store.updateItem(pi, index, "theoryAmount", Number(e.target.value))} />
                          </TableCell>
                          <TableCell>
                            <Input className="h-8" type="number" value={item.kgUnitPrice || ""}
                              onChange={(e) => store.updateItem(pi, index, "kgUnitPrice", Number(e.target.value))} />
                          </TableCell>
                          <TableCell className="text-right">{fmt(Math.round(item.materialCost))}원</TableCell>
                          <TableCell>
                            <Input className="h-8" value={item.origin ?? ""}
                              onChange={(e) => store.updateItem(pi, index, "origin", e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => store.removeItem(pi, index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 1정당 단가 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 bg-gray-50 rounded-md">
                  <p className="text-xs text-muted-foreground">1정당 원료비</p>
                  <p className="font-bold">{fmt(Math.round(pc?.materialCostPerUnit ?? 0))}원</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-md">
                  <p className="text-xs text-muted-foreground">부원료비</p>
                  <p className="font-bold">{fmt(p.subMaterialCostPerUnit)}원</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-md">
                  <p className="text-xs text-muted-foreground">공임비</p>
                  <p className="font-bold">{fmt(p.processingCostPerUnit)}원</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-md">
                  <p className="text-xs text-muted-foreground">1정당 합계</p>
                  <p className="font-bold text-blue-700">{fmt(Math.round(pc?.perUnitCost ?? 0))}원</p>
                </div>
              </div>

              {/* 포장 옵션 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">포장 옵션</p>
                    <p className="text-xs text-muted-foreground">
                      30정·60정처럼 포장이 다르거나 세트수 구간이 다르면 줄을 추가하세요.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => store.addLine(pi)}>
                    <Plus className="h-4 w-4 mr-1" />옵션 추가
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">옵션명</TableHead>
                        <TableHead className="w-24">포장단위</TableHead>
                        <TableHead className="w-28">병+박스(원)</TableHead>
                        <TableHead className="w-24">세트수</TableHead>
                        <TableHead className="w-24">단위</TableHead>
                        <TableHead className="w-40">포장방법</TableHead>
                        <TableHead className="w-28 text-right">제조원가</TableHead>
                        <TableHead className="w-28 text-right">1박스원가</TableHead>
                        <TableHead className="w-32 text-right">공급가액</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.lines.map((ln, li) => {
                        const r = pc?.lines[li];
                        return (
                          <TableRow key={li}>
                            <TableCell>
                              <Input className="h-8" value={ln.label ?? ""} placeholder={r?.displayLabel}
                                onChange={(e) => store.updateLine(pi, li, "label", e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" type="number" min={0} value={ln.packageUnit || ""}
                                onChange={(e) => store.updateLine(pi, li, "packageUnit", Number(e.target.value))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" type="number" min={0} value={ln.bottleBoxCost || ""}
                                onChange={(e) => store.updateLine(pi, li, "bottleBoxCost", Number(e.target.value))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" type="number" min={1} value={ln.setCount || ""}
                                onChange={(e) => store.updateLine(pi, li, "setCount", Number(e.target.value))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" value={ln.unit ?? ""} placeholder="박스"
                                onChange={(e) => store.updateLine(pi, li, "unit", e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" value={ln.packagingMethod ?? ""} placeholder="단상자*병*30정"
                                onChange={(e) => store.updateLine(pi, li, "packagingMethod", e.target.value)} />
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {fmt(Math.round(r?.manufacturingCost ?? 0))}원
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {fmt(Math.round(r?.subtotal ?? 0))}원
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {fmt(r?.supplyAmount ?? 0)}원
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" disabled={p.lines.length <= 1}
                                onClick={() => store.removeLine(pi, li)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>1박스원가</strong> = 1정당원가 x 정제수(포장단위) + 병·박스 &nbsp;→&nbsp;
                  <strong>x 세트수</strong> = 공급가액 (부가세 별도)
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button variant="outline" className="w-full" onClick={store.addProduct}>
        <Plus className="h-4 w-4 mr-2" />제품 추가 (정제 + 환제처럼 제형이 다를 때)
      </Button>

      {/* 견적 총액 */}
      <Card>
        <CardHeader><CardTitle>견적 총액</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {calc.lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-sm font-medium">{l.no} · {l.productName} {l.displayLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    1박스원가 {fmt(Math.round(l.subtotal))}원 x {fmt(l.setCount)}{l.unit || "박스"}
                  </p>
                </div>
                <p className="text-lg font-bold">{fmt(l.supplyAmount)}원</p>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={store.sumOptions}
              onChange={(e) => store.setField("sumOptions", e.target.checked)} />
            <span className="text-sm">옵션 합계 표시</span>
            <span className="text-xs text-muted-foreground">
              — 옵션을 <strong>모두 발주</strong>할 때만 켜세요.
            </span>
          </label>

          {store.sumOptions ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-muted-foreground">총원가</p>
                <p className="text-lg font-bold">{fmt(Math.round(calc.totalCost))}원</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-muted-foreground">세액 (10%)</p>
                <p className="text-lg font-bold">{fmt(calc.vatAmount)}원</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-md">
                <p className="text-xs text-muted-foreground">공급가액 (부가세 별도)</p>
                <p className="text-xl font-bold text-primary">{fmt(calc.supplyAmount)}원</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md">
              포장 옵션 중 <strong>택일</strong>하는 견적이라 합계를 내지 않습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 특기사항 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>특기사항</CardTitle>
            <Button variant="outline" size="sm" disabled={!defaultNote}
              onClick={() => { lastAutoNote.current = defaultNote; store.setField("note", defaultNote); }}>
              기본 문구 불러오기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea rows={8} value={store.note}
            onChange={(e) => store.setField("note", e.target.value)} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleExportPdf}>
          <FileDown className="h-4 w-4 mr-2" />PDF 내보내기
        </Button>
        <Button variant="outline" onClick={handleExportExcel}>
          <FileDown className="h-4 w-4 mr-2" />Excel 내보내기
        </Button>
        {isEdit && (
          <Button variant="outline" disabled={saving}
            onClick={() => { store.reset(); router.push(`/quotation/simple/${quotationId}`); }}>
            <X className="h-4 w-4 mr-2" />취소
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{isEdit ? "수정 저장" : "저장"}
        </Button>
      </div>
    </div>
  );
}
