"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";

export interface ColumnDef {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "badge";
  editable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

interface Props {
  title: string;
  apiUrl: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  searchPlaceholder?: string;
  dataKey?: string;
}

export default function MasterCrudPage({ title, apiUrl, columns, fields, searchPlaceholder, dataKey }: Props) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    params.set("all", "true");
    if (search) params.set("search", search);

    fetch(`${apiUrl}?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data && typeof res.total === "number") {
          setData(dataKey ? res[dataKey] : res.data);
          setTotalCount(res.total);
        } else {
          // fallback for APIs that don't support pagination
          const arr = dataKey ? res[dataKey] : (Array.isArray(res) ? res : res.data || []);
          setData(arr);
          setTotalCount(arr.length);
        }
      });
  }, [apiUrl, search, dataKey, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const openCreate = () => {
    const defaults: Record<string, unknown> = {};
    fields.forEach((f) => { defaults[f.key] = f.defaultValue ?? (f.type === "number" ? 0 : f.type === "checkbox" ? true : ""); });
    setForm(defaults);
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: Record<string, unknown>) => {
    setForm({ ...item });
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const missing = fields.filter((f) => f.required && !form[f.key]);
    if (missing.length) { toast.error(`${missing[0].label}을(를) 입력해주세요.`); return; }

    const method = editItem ? "PUT" : "POST";
    const url = editItem ? `${apiUrl}/${editItem.id}` : apiUrl;

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      toast.success(editItem ? "수정되었습니다." : "등록되었습니다.");
      setDialogOpen(false);
      fetchData();
    } else {
      const err = await res.json();
      toast.error(err.error || "저장에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`${apiUrl}/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("삭제되었습니다.");
      fetchData();
    } else {
      const err = await res.json();
      toast.error(err.error || "삭제에 실패했습니다.");
    }
    setDeleteConfirm(null);
  };

  const colSpanCount = columns.length + 2; // +1 No. +1 관리

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />새로 등록</Button>
      </div>

      {searchPlaceholder && (
        <div className="flex gap-2 max-w-md">
          <Input placeholder={searchPlaceholder} value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchData(); } }} />
          <Button variant="outline" onClick={() => { setPage(1); fetchData(); }}><Search className="h-4 w-4" /></Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{title} ({totalCount}건)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">No.</TableHead>
                {columns.map((col) => <TableHead key={col.key}>{col.label}</TableHead>)}
                <TableHead className="w-24">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow><TableCell colSpan={colSpanCount} className="text-center text-muted-foreground py-8">
                  등록된 데이터가 없습니다.</TableCell></TableRow>
              )}
              {data.map((row, idx) => (
                <TableRow key={row.id as string}>
                  <TableCell className="text-center text-muted-foreground text-sm">{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(row[col.key], row) :
                        col.type === "badge" ? (
                          <Badge variant={row[col.key] ? "default" : "secondary"}>
                            {row[col.key] ? "사용" : "미사용"}
                          </Badge>
                        ) : col.type === "number" ? (
                          Number(row[col.key] || 0).toLocaleString()
                        ) : (
                          String(row[col.key] ?? "-")
                        )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(row.id as string)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>페이지당</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
              <span>건 | 전체 {totalCount}건</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-accent" onClick={() => setPage(1)} disabled={currentPage <= 1}>
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-accent" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm font-medium">{currentPage} / {totalPages}</span>
              <button type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-accent" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-accent" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages}>
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? `${title} 수정` : `${title} 등록`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div key={field.key} className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{field.label}{field.required && " *"}</Label>
                <div className="col-span-3">
                  {field.type === "checkbox" ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!form[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })} />
                      <span className="text-sm">{form[field.key] ? "사용" : "미사용"}</span>
                    </label>
                  ) : field.type === "select" ? (
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={String(form[field.key] || "")}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}>
                      <option value="">선택</option>
                      {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      value={String(form[field.key] || "")}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={form[field.key] !== undefined ? String(form[field.key]) : ""}
                      onChange={(e) => setForm({ ...form, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value })} />
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>삭제 확인</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>취소</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
