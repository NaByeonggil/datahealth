import SimpleQuotationForm from "@/components/quotation/simple/SimpleQuotationForm";

export default async function NewSimpleQuotation({
  searchParams,
}: {
  searchParams: Promise<{ inquiry?: string }>;
}) {
  // 홈페이지 관리자의 「견적서 만들기」로 들어오면 그 문의 ID 가 붙어 온다
  const { inquiry } = await searchParams;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">일반견적서 작성</h2>
      <SimpleQuotationForm inquiryId={inquiry} />
    </div>
  );
}
