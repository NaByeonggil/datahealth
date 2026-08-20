"use client";

import { useEffect } from "react";
import DetailedQuotationForm from "@/components/quotation/detailed/DetailedQuotationForm";
import { useDetailedQuotationStore } from "@/store/detailedQuotationStore";

export default function NewDetailedQuotation() {
  const reset = useDetailedQuotationStore((s) => s.reset);

  // 수정 화면에서 넘어온 값이 남지 않도록 새 작성 진입 시 초기화한다
  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">상세견적서 작성</h2>
      <DetailedQuotationForm />
    </div>
  );
}
