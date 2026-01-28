import SimpleQuotationForm from "@/components/quotation/simple/SimpleQuotationForm";

export default function NewSimpleQuotation() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">일반견적서 작성</h2>
      <SimpleQuotationForm />
    </div>
  );
}
