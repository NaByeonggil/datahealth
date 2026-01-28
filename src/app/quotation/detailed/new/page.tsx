import DetailedQuotationForm from "@/components/quotation/detailed/DetailedQuotationForm";

export default function NewDetailedQuotation() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">상세견적서 작성</h2>
      <DetailedQuotationForm />
    </div>
  );
}
