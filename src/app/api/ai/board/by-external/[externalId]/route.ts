import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { factorySiteUrl } from "@/lib/integration/factory";

// GET: 홈페이지 문의로 견적서를 쓸 때 폼에 미리 채울 값
export async function GET(_request: Request, { params }: { params: Promise<{ externalId: string }> }) {
  const { externalId } = await params;
  const inquiry = await prisma.boardInquiry.findUnique({ where: { externalId } });
  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = inquiry.customerId
    ? await prisma.customer.findUnique({ where: { id: inquiry.customerId } })
    : null;

  let extracted: Record<string, unknown> | null = null;
  try {
    extracted = inquiry.extractedData ? JSON.parse(inquiry.extractedData) : null;
  } catch { /* 깨진 값은 없는 것으로 본다 */ }

  return NextResponse.json({
    externalId,
    boardInquiryId: inquiry.id,
    title: inquiry.title,
    content: inquiry.content,
    authorName: inquiry.authorName,
    company: inquiry.company,
    extracted,
    customer: customer
      ? { name: customer.name, manager: customer.manager, contact: customer.contact, email: customer.email }
      : null,
    factoryAdminUrl: `${factorySiteUrl()}/admin/inquiries/${externalId}`,
  });
}
