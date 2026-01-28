"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

const TABLE_LABELS: Record<string, string> = {
  material: "원료", supply: "자재", process: "공정", customer: "고객사", productType: "제품유형",
};

interface Template {
  id: string; name: string; targetTable: string; mappingConfig: string; options: string | null;
  createdBy: string | null; createdAt: string; updatedAt: string;
}

export default function TemplatePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filterTable, setFilterTable] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = () => {
    const url = filterTable ? `/api/import/templates?targetTable=${filterTable}` : "/api/import/templates";
    fetch(url).then(r => r.json()).then(setTemplates);
  };

  useEffect(() => { fetchData(); }, [filterTable]);

  const handleDuplicate = async (tpl: Template) => {
    await fetch("/api/import/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${tpl.name} (복사)`,
        targetTable: tpl.targetTable,
        mappingConfig: JSON.parse(tpl.mappingConfig),
        options: tpl.options ? JSON.parse(tpl.options) : null,
      }),
    });
    toast.success("템플릿이 복사되었습니다.");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/import/templates/${id}`, { method: "DELETE" });
    toast.success("삭제되었습니다.");
    setDeleteConfirm(null);
    fetchData();
  };

  const getMappingCount = (config: string) => {
    try { return (JSON.parse(config) as unknown[]).filter((m: unknown) => (m as { targetField?: string }).targetField).length; }
    catch { return 0; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">매핑 템플릿 관리</h2>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">대상 테이블:</span>
        <Select value={filterTable || "all"} onValueChange={(v) => setFilterTable(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="전체" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {Object.entries(TABLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>템플릿 목록 ({templates.length}건)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>템플릿명</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>매핑 수</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>수정일</TableHead>
                <TableHead className="w-32">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">저장된 템플릿이 없습니다.</TableCell></TableRow>
              )}
              {templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline">{TABLE_LABELS[t.targetTable] || t.targetTable}</Badge></TableCell>
                  <TableCell>{getMappingCount(t.mappingConfig)}개</TableCell>
                  <TableCell className="text-sm">{new Date(t.createdAt).toLocaleDateString("ko-KR")}</TableCell>
                  <TableCell className="text-sm">{new Date(t.updatedAt).toLocaleDateString("ko-KR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>삭제 확인</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">정말 삭제하시겠습니까?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>취소</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
