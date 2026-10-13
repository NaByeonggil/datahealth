import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { factorySiteUrl, fetchFactoryJson, isFactoryInquiryId } from "@/lib/integration/factory";

// GET: 홈페이지 문의 한 건 — 문의 내용과 답글 스레드, 그리고 이쪽에 있는 AI 답변 초안
export async function GET(_request: Request, { params }: { params: Promise<{ externalId: string }> }) {
  const { externalId } = await params;
  if (!isFactoryInquiryId(externalId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await fetchFactoryJson<Record<string, unknown>>(
    `/api/integration/inquiries/${externalId}/thread`,
    {}
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  // 연동 이전에 들어온 문의는 이쪽에 기록이 없다 — AI 초안 없이 보여준다
  const local = await prisma.boardInquiry.findUnique({
    where: { externalId },
    select: { id: true, inquiryType: true, aiResponse: true },
  });
  const draftUsable =
    local?.aiResponse && !local.aiResponse.startsWith("AI 처리 중 오류") && local.inquiryType !== "spam";

  return NextResponse.json({
    ...result.data,
    boardInquiryId: local?.id ?? null,
    aiDraft: draftUsable ? local.aiResponse : null,
    factoryAdminUrl: `${factorySiteUrl()}/admin/inquiries/${externalId}`,
  });
}
