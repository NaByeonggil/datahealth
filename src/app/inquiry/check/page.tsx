import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COMPANY_INFO } from "@/lib/company/supplier";
import { InquiryLookup } from "@/components/inquiry/InquiryLookup";

export const metadata: Metadata = { title: "문의 조회", description: "접수한 문의의 답변 확인" };
export const dynamic = "force-dynamic";

export default async function InquiryCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string }>;
}) {
  const { no } = await searchParams;
  const company = await prisma.companyInfo.findUnique({ where: { id: "default" } });
  return (
    <InquiryLookup
      companyName={company?.companyName || DEFAULT_COMPANY_INFO.companyName}
      initialReceiptNo={no ?? ""}
    />
  );
}
