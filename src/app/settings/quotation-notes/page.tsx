"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { APPLIES_TO, AppliesTo, buildQuotationNote } from "@/lib/quotation/quotationNote";

interface NoteTemplate {
  id: string;
  content: string;
  appliesTo: AppliesTo;
  sortOrder: number;
  isActive: boolean;
}

/** 미리보기용 조건 조합 */
const PREVIEW_CASES: { label: string; foodType: string; formCode: string; typeName: string }[] = [
  { label: "건강기능식품 · 스틱류", foodType: "건강기능식품", formCode: "POWDER_STICK", typeName: "분말스틱" },
  { label: "건강기능식품 · 정제/캡슐", foodType: "건강기능식품", formCode: "TABLET", typeName: "정제" },
  { label: "그 외 식품유형 · 스틱류", foodType: "기타가공품", formCode: "POWDER_STICK", typeName: "분말스틱" },
  { label: "그 외 식품유형 · 정제/캡슐", foodType: "기타가공품", formCode: "TABLET", typeName: "정제" },
];

export default function QuotationNotesPage() {
  const [rows, setRows] = useState<NoteTemplate[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/settings/quotation-notes")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => toast.error("문구를 불러오지 못했습니다."));
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Partial<NoteTemplate>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/settings/quotation-notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const content = draft.trim();
    if (!content) { toast.error("내용을 입력해주세요."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/settings/quotation-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      setDraft("");
      toast.success("추가되었습니다.");
      load();
    } catch {
      toast.error("추가에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/settings/quotation-notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("삭제되었습니다.");
      load();
    } catch {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  /** 위/아래 이동 — 인접한 두 항목의 sortOrder 를 맞바꾼다 */
  const move = async (index: number, dir: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    setBusy(true);
    try {
      await Promise.all([
        fetch(`/api/settings/quotation-notes/${a.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: b.sortOrder }),
        }),
        fetch(`/api/settings/quotation-notes/${b.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: a.sortOrder }),
        }),
      ]);
      load();
    } finally {
      setBusy(false);
    }
  };

  const active = rows.filter((r) => r.isActive);

  return (
    <div className="space-y-4 max-w-5xl">
      <h2 className="text-xl font-bold">견적서 특기사항</h2>

      <Card>
        <CardHeader>
          <CardTitle>기본 문구</CardTitle>
          <p className="text-sm text-muted-foreground">
            새 견적서를 작성하면 <strong>사용중</strong>인 문구가 순서대로 특기사항에 자동으로 들어갑니다.
            견적서마다 자유롭게 고칠 수 있고, 여기 문구를 바꿔도 이미 저장된 견적서는 그대로입니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">등록된 문구가 없습니다.</p>
          )}
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-start gap-2">
              <div className="flex flex-col pt-1">
                <Button variant="ghost" size="sm" className="h-5 px-1"
                  disabled={busy || i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-5 px-1"
                  disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <span className="w-6 pt-2 text-sm text-muted-foreground">
                {r.isActive ? "•" : "-"}
              </span>
              <Input
                className={r.isActive ? "" : "text-muted-foreground line-through"}
                defaultValue={r.content}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== r.content) patch(r.id, { content: v });
                }}
              />
              <Select value={r.appliesTo} onValueChange={(v) => patch(r.id, { appliesTo: v as AppliesTo })}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(APPLIES_TO).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-1 pt-2 whitespace-nowrap text-sm cursor-pointer">
                <input type="checkbox" checked={r.isActive} disabled={busy}
                  onChange={(e) => patch(r.id, { isActive: e.target.checked })} />
                사용
              </label>
              <Button variant="ghost" size="sm" className="mt-1"
                disabled={busy} onClick={() => remove(r.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2 pt-3 border-t">
            <Input
              placeholder="새 문구를 입력하세요 (번호는 자동으로 붙습니다)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button onClick={add} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              추가
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            내용을 고친 뒤 입력란 밖을 클릭하면 저장됩니다.
            &nbsp;·&nbsp; 치환어 <code>{"{동판비}"}</code> 는 스틱류 제형이면
            <strong> 스틱동판비, 박스동판비</strong>, 그 외에는 <strong>박스동판비</strong> 로 바뀝니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>견적서 미리보기</CardTitle>
          <p className="text-sm text-muted-foreground">
            식품유형과 제형에 따라 실제로 어떻게 나가는지 보여줍니다.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {PREVIEW_CASES.map((c) => (
            <div key={c.label}>
              <p className="text-xs font-medium mb-1">{c.label}</p>
              <div className="border border-black">
                <div className="bg-gray-200 font-bold px-2 py-1 text-xs border-b border-black">특 기 사 항</div>
                <div className="p-3 text-xs whitespace-pre-wrap min-h-20">
                  {buildQuotationNote(rows, c) || "(해당 조건에 표시할 문구가 없습니다)"}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
