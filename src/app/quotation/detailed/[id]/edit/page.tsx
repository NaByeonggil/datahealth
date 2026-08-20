"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DetailedQuotationForm from "@/components/quotation/detailed/DetailedQuotationForm";
import { useDetailedQuotationStore } from "@/store/detailedQuotationStore";
import { toast } from "sonner";

export default function EditDetailedQuotation() {
  const { id } = useParams();
  const loadQuotation = useDetailedQuotationStore((s) => s.loadQuotation);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quotation/detailed/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => loadQuotation(data))
      .catch(() => toast.error("견적서를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id, loadQuotation]);

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">상세견적서 수정</h2>
      <DetailedQuotationForm />
    </div>
  );
}
