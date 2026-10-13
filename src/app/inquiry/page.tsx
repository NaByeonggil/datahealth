import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COMPANY_INFO } from "@/lib/company/supplier";
import { PublicInquiryForm } from "@/components/inquiry/PublicInquiryForm";

export const metadata: Metadata = { title: "제품 문의", description: "제조·견적 문의 접수" };
// 회사명을 DB 에서 읽는다 — 빌드 때 미리 굽지 않는다
export const dynamic = "force-dynamic";

export default async function PublicInquiryPage() {
  const company = await prisma.companyInfo.findUnique({ where: { id: "default" } });
  return <PublicInquiryForm companyName={company?.companyName || DEFAULT_COMPANY_INFO.companyName} />;
}
