"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_COMPANY_INFO, CompanyInfoType } from "@/lib/company/supplier";

/** 화면에 뿌릴 항목 정의 — 견적서 공급자 블록과 같은 순서 */
const FIELDS: { key: keyof CompanyInfoType; label: string; placeholder: string; wide?: boolean }[] = [
  { key: "companyName", label: "상호", placeholder: "주식회사 상상바이오" },
  { key: "ceo", label: "대표자", placeholder: "최무신,박균배" },
  { key: "bizNo", label: "사업자번호", placeholder: "360-86-02016" },
  { key: "fax", label: "FAX", placeholder: "02-6956-0856" },
  { key: "manager", label: "담당자", placeholder: "박균배 약사, 나병길 약사" },
  { key: "tel", label: "전화", placeholder: "02-6956-0956" },
  { key: "email", label: "이메일", placeholder: "sangsangbio@gmail.com", wide: true },
  { key: "address", label: "주소", placeholder: "서울특별시 강동구 …", wide: true },
  { key: "bizType", label: "업태", placeholder: "도소매" },
  { key: "bizItem", label: "종목", placeholder: "건강기능식품" },
];

export default function CompanySettingsPage() {
  const [form, setForm] = useState<CompanyInfoType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/company")
      .then((r) => r.json())
      .then((d) => setForm(d))
      .catch(() => toast.error("회사 정보를 불러오지 못했습니다."));
  }, []);

  const set = (k: keyof CompanyInfoType, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleSave = async () => {
    if (!form) return;
    if (!form.companyName.trim()) {
      toast.error("상호는 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("저장되었습니다. 이후 발행하는 견적서에 반영됩니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">회사 정보</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setForm({ ...DEFAULT_COMPANY_INFO })}
          >
            <RotateCcw className="h-4 w-4 mr-2" />기본값 되돌리기
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            저장
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>견적서 공급자 정보</CardTitle>
          <p className="text-sm text-muted-foreground">
            일반견적서 PDF·Excel의 <strong>공급자</strong> 칸에 그대로 찍힙니다.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.wide ? "md:col-span-2" : ""}>
              <Label>
                {f.label}
                {f.key === "companyName" && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                value={form[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 견적서에 어떻게 나오는지 미리보기 */}
      <Card>
        <CardHeader><CardTitle>견적서 미리보기</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="border-collapse text-xs w-full" style={{ minWidth: 560 }}>
            <tbody>
              <tr>
                <td rowSpan={6} className="border border-black text-center font-bold px-1 w-6">공급자</td>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1 w-20">상　호</td>
                <td className="border border-black px-2 py-1">{form.companyName || "-"}</td>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1 w-16">대표자</td>
                <td className="border border-black px-2 py-1 w-28">{form.ceo || "-"}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">사업자번호</td>
                <td className="border border-black px-2 py-1">{form.bizNo || "-"}</td>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">F A X</td>
                <td className="border border-black px-2 py-1">{form.fax || "-"}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">담당자</td>
                <td className="border border-black px-2 py-1">{form.manager || "-"}</td>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">전　화</td>
                <td className="border border-black px-2 py-1">{form.tel || "-"}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">이메일</td>
                <td className="border border-black px-2 py-1" colSpan={3}>{form.email || "-"}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">주　소</td>
                <td className="border border-black px-2 py-1" colSpan={3}>{form.address || "-"}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">업　태</td>
                <td className="border border-black px-2 py-1">{form.bizType || "-"}</td>
                <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">종　목</td>
                <td className="border border-black px-2 py-1">{form.bizItem || "-"}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
