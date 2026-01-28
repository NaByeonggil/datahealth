"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, ChevronRight, ChevronLeft, Check, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

const TARGET_TABLES = [
  { value: "material", label: "원료" },
  { value: "supply", label: "자재" },
  { value: "process", label: "공정" },
  { value: "customer", label: "고객사" },
  { value: "productType", label: "제품유형" },
];

const TARGET_FIELDS: Record<string, { value: string; label: string; required?: boolean }[]> = {
  material: [
    { value: "code", label: "원료코드", required: true },
    { value: "name", label: "원료명", required: true },
    { value: "category", label: "분류(주/부원료)" },
    { value: "unit", label: "단위" },
    { value: "unitPrice", label: "단가" },
    { value: "origin", label: "원산지" },
    { value: "specification", label: "규격" },
    { value: "note", label: "비고" },
  ],
  supply: [
    { value: "code", label: "자재코드", required: true },
    { value: "name", label: "자재명", required: true },
    { value: "unit", label: "단위" },
    { value: "unitPrice", label: "단가" },
    { value: "specification", label: "규격" },
    { value: "note", label: "비고" },
  ],
  process: [
    { value: "code", label: "공정코드", required: true },
    { value: "name", label: "공정명", required: true },
    { value: "unitCost", label: "단가" },
    { value: "description", label: "설명" },
  ],
  customer: [
    { value: "code", label: "고객사코드", required: true },
    { value: "name", label: "고객사명", required: true },
    { value: "contact", label: "연락처" },
    { value: "manager", label: "담당자" },
    { value: "address", label: "주소" },
    { value: "email", label: "이메일" },
    { value: "note", label: "비고" },
  ],
  productType: [
    { value: "code", label: "유형코드", required: true },
    { value: "name", label: "유형명", required: true },
    { value: "processingCost", label: "가공비" },
    { value: "sortOrder", label: "순서" },
    { value: "description", label: "설명" },
  ],
};

interface SheetInfo {
  name: string; rowCount: number; headers: string[]; preview: string[][];
}
interface MappingEntry { sourceIndex: number; targetField: string; }
interface ImportResult {
  status: string; totalRows: number; successCount: number; errorCount: number; warningCount: number;
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}
interface Template { id: string; name: string; targetTable: string; mappingConfig: string; options: string | null; }

export default function ImportPage() {
  const [step, setStep] = useState(1);

  // Step 1
  const [targetTable, setTargetTable] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState("");
  const [fileType, setFileType] = useState("");
  const [sheets, setSheets] = useState<SheetInfo[]>([]);

  // Step 2
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRow, setHeaderRow] = useState(0);
  const [dataStartRow, setDataStartRow] = useState(1);

  // Step 3
  const [mapping, setMapping] = useState<MappingEntry[]>([]);
  const [duplicateHandling, setDuplicateHandling] = useState("skip");
  const [emptyKeepExisting, setEmptyKeepExisting] = useState(true);
  const [newOnly, setNewOnly] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");

  // Step 4
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const loadSuppliers = useCallback(() => {
    fetch("/api/suppliers?all=true").then(r => r.json()).then(res =>
      setSuppliers(Array.isArray(res) ? res : res.data || [])
    );
  }, []);

  const handleFileUpload = async () => {
    if (!file || !targetTable) { toast.error("대상 테이블과 파일을 선택해주세요."); return; }
    if (targetTable === "material" && !supplierId) { toast.error("공급사를 선택해주세요."); return; }

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/import/upload", { method: "POST", body: formData });
    if (!res.ok) { const err = await res.json(); toast.error(err.error); return; }

    const data = await res.json();
    setFileType(data.fileType);
    setSheets(data.sheets);
    if (data.sheets.length > 0) {
      setSelectedSheet(data.sheets[0].name);
      setHeaderRow(0);
      setDataStartRow(1);
    }

    // base64 for execute step
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      setFileBase64(b64);
    };
    reader.readAsDataURL(file);

    setStep(2);
  };

  const goToMapping = () => {
    const sheet = sheets.find(s => s.name === selectedSheet);
    if (!sheet) return;
    const headers = sheet.preview[headerRow] || [];
    const fields = TARGET_FIELDS[targetTable] || [];

    // Auto-map by name similarity
    const autoMapping: MappingEntry[] = headers.map((h, i) => {
      const match = fields.find(f =>
        f.label.includes(String(h)) || String(h).includes(f.label) || f.value.toLowerCase() === String(h).toLowerCase()
      );
      return { sourceIndex: i, targetField: match?.value || "" };
    });
    setMapping(autoMapping);

    // Load templates
    fetch(`/api/import/templates?targetTable=${targetTable}`).then(r => r.json()).then(setTemplates);
    setStep(3);
  };

  const applyTemplate = (tpl: Template) => {
    try {
      const config = JSON.parse(tpl.mappingConfig) as MappingEntry[];
      setMapping(config);
      if (tpl.options) {
        const opts = JSON.parse(tpl.options);
        setDuplicateHandling(opts.duplicateHandling || "skip");
        setEmptyKeepExisting(opts.emptyKeepExisting ?? true);
        setNewOnly(opts.newOnly ?? false);
      }
      toast.success(`템플릿 "${tpl.name}" 적용됨`);
    } catch { toast.error("템플릿 적용 실패"); }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) { toast.error("템플릿 이름을 입력하세요."); return; }
    await fetch("/api/import/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: templateName,
        targetTable,
        mappingConfig: mapping,
        options: { duplicateHandling, emptyKeepExisting, newOnly },
      }),
    });
    toast.success("템플릿이 저장되었습니다.");
    setTemplateName("");
    fetch(`/api/import/templates?targetTable=${targetTable}`).then(r => r.json()).then(setTemplates);
  };

  const executeImport = async () => {
    const activeMappings = mapping.filter(m => m.targetField);
    if (activeMappings.length === 0) { toast.error("최소 1개 이상의 컬럼을 매핑해주세요."); return; }

    setImporting(true);
    try {
      const res = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64, fileName: file?.name, fileType, sheetName: selectedSheet,
          headerRow, dataStartRow, targetTable, mapping: activeMappings,
          options: { duplicateHandling, emptyKeepExisting, newOnly },
          supplierId: targetTable === "material" ? supplierId : undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
      setStep(4);
    } catch {
      toast.error("임포트 실행 중 오류 발생");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(1); setFile(null); setFileBase64(""); setSheets([]);
    setMapping([]); setResult(null); setTargetTable(""); setSupplierId("");
  };

  const currentSheet = sheets.find(s => s.name === selectedSheet);
  const headers = currentSheet ? (currentSheet.preview[headerRow] || []) : [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">파일 임포트</h2>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["파일 업로드", "데이터 미리보기", "컬럼 매핑", "결과 확인"].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? "font-bold" : "text-muted-foreground"}`}>{label}</span>
            {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: File Upload */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1. 파일 업로드</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>대상 테이블 *</Label>
                <Select value={targetTable} onValueChange={(v) => { setTargetTable(v); if (v === "material") loadSuppliers(); }}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {TARGET_TABLES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {targetTable === "material" && (
                <div>
                  <Label>공급사 *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label>파일 선택 (xlsx, xls, csv)</Label>
              <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <Input type="file" accept=".xlsx,.xls,.csv,.tsv" className="max-w-xs mx-auto"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
                {file && <p className="mt-2 text-sm text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleFileUpload} disabled={!file || !targetTable}>
                다음 <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 2 && currentSheet && (
        <Card>
          <CardHeader><CardTitle>2. 데이터 미리보기</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              {sheets.length > 1 && (
                <div>
                  <Label>시트 선택</Label>
                  <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sheets.map(s => <SelectItem key={s.name} value={s.name}>{s.name} ({s.rowCount}행)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>헤더 행 (0부터)</Label>
                <Input type="number" className="w-24" value={headerRow} onChange={e => setHeaderRow(Number(e.target.value))} />
              </div>
              <div>
                <Label>데이터 시작 행</Label>
                <Input type="number" className="w-24" value={dataStartRow} onChange={e => setDataStartRow(Number(e.target.value))} />
              </div>
              <Badge variant="outline">{currentSheet.rowCount - dataStartRow}개 데이터 행 감지</Badge>
            </div>
            <div className="overflow-x-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {headers.map((h, i) => <TableHead key={i}>{String(h)}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSheet.preview.slice(dataStartRow, dataStartRow + 10).map((row, ri) => (
                    <TableRow key={ri}>
                      <TableCell className="text-muted-foreground">{dataStartRow + ri + 1}</TableCell>
                      {row.map((cell, ci) => <TableCell key={ci}>{String(cell ?? "")}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" />이전</Button>
              <Button onClick={goToMapping}>다음 <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Column Mapping */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>3. 컬럼 매핑</CardTitle>
              {templates.length > 0 && (
                <Select onValueChange={(v) => { const t = templates.find(t => t.id === v); if (t) applyTemplate(t); }}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="저장된 템플릿 적용" /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>파일 컬럼</TableHead>
                  <TableHead>→</TableHead>
                  <TableHead>DB 필드</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{String(h)}</TableCell>
                    <TableCell>→</TableCell>
                    <TableCell>
                      <Select value={mapping[i]?.targetField || "__none__"} onValueChange={(v) => {
                        const next = [...mapping];
                        next[i] = { sourceIndex: i, targetField: v === "__none__" ? "" : v };
                        setMapping(next);
                      }}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="선택 안 함" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">선택 안 함</SelectItem>
                          {(TARGET_FIELDS[targetTable] || []).map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}{f.required ? " *" : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded">
              <div>
                <Label>중복 처리</Label>
                <Select value={duplicateHandling} onValueChange={setDuplicateHandling}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">건너뜀</SelectItem>
                    <SelectItem value="overwrite">덮어쓰기</SelectItem>
                    <SelectItem value="error">오류 처리</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={emptyKeepExisting} onChange={e => setEmptyKeepExisting(e.target.checked)} />
                <Label className="text-sm">빈 값은 기존 데이터 유지</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={newOnly} onChange={e => setNewOnly(e.target.checked)} />
                <Label className="text-sm">신규 항목만 등록</Label>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded">
              <Input placeholder="템플릿 이름" value={templateName} onChange={e => setTemplateName(e.target.value)} className="max-w-xs" />
              <Button variant="outline" size="sm" onClick={saveTemplate}>템플릿 저장</Button>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="h-4 w-4 mr-1" />이전</Button>
              <Button onClick={executeImport} disabled={importing}>{importing ? "임포트 중..." : "임포트 실행"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 4 && result && (
        <Card>
          <CardHeader><CardTitle>4. 임포트 결과</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 border rounded text-center">
                <div className="text-2xl font-bold">{result.totalRows}</div>
                <div className="text-sm text-muted-foreground">전체</div>
              </div>
              <div className="p-4 border rounded text-center">
                <div className="text-2xl font-bold text-green-600">{result.successCount}</div>
                <div className="text-sm text-muted-foreground">성공</div>
              </div>
              <div className="p-4 border rounded text-center">
                <div className="text-2xl font-bold text-yellow-600">{result.warningCount}</div>
                <div className="text-sm text-muted-foreground">경고</div>
              </div>
              <div className="p-4 border rounded text-center">
                <div className="text-2xl font-bold text-red-600">{result.errorCount}</div>
                <div className="text-sm text-muted-foreground">오류</div>
              </div>
            </div>

            <Badge variant={result.status === "success" ? "default" : result.status === "partial" ? "secondary" : "destructive"} className="text-base px-3 py-1">
              {result.status === "success" ? <><Check className="h-4 w-4 mr-1" />성공</> : result.status === "partial" ? <><AlertTriangle className="h-4 w-4 mr-1" />일부 성공</> : <><X className="h-4 w-4 mr-1" />실패</>}
            </Badge>

            {result.errors.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-600 mb-2">오류 상세</h4>
                <div className="max-h-48 overflow-y-auto border rounded">
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-20">행</TableHead><TableHead>오류 내용</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {result.errors.map((e, i) => (
                        <TableRow key={i}><TableCell>{e.row}</TableCell><TableCell className="text-red-600">{e.message}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div>
                <h4 className="font-semibold text-yellow-600 mb-2">경고 상세</h4>
                <div className="max-h-48 overflow-y-auto border rounded">
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-20">행</TableHead><TableHead>경고 내용</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {result.warnings.map((w, i) => (
                        <TableRow key={i}><TableCell>{w.row}</TableCell><TableCell className="text-yellow-600">{w.message}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={reset}>새 임포트</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
