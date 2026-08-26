"use client";

import { useParams } from "next/navigation";
import SimpleQuotationForm from "@/components/quotation/simple/SimpleQuotationForm";

export default function EditSimpleQuotation() {
  const { id } = useParams();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">일반견적서 수정</h2>
      <SimpleQuotationForm quotationId={String(id)} />
    </div>
  );
}
