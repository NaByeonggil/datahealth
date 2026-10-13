import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestSignature } from "@/lib/integration/factory";

// GET: 홈페이지 관리자 화면에 보여줄 AI 분석 결과
export async function GET(request: Request, { params }: { params: Promise<{ externalId: string }> }) {
  const { externalId } = await params;
  if (!verifyRequestSignature(request, `/api/integration/inquiries/${externalId}`, "")) {
    return NextResponse.json({ error: "서명이 올바르지 않습니다." }, { status: 401 });
  }

  const inquiry = await prisma.boardInquiry.findUnique({ where: { externalId } });
  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let extracted: Record<string, unknown> | null = null;
  try {
    extracted = inquiry.extractedData ? JSON.parse(inquiry.extractedData) : null;
    // 추정 견적 금액은 이 시스템 안에서만 본다
    if (extracted) delete extracted.internalEstimate;
  } catch { /* 깨진 값은 없는 것으로 본다 */ }

  const failed = inquiry.aiResponse?.startsWith("AI 처리 중 오류") ?? false;

  // 넘기는 것은 분류·추출·답변 초안뿐이다. 단가·추정 견적 같은 금액 정보는 넘기지 않는다.
  return NextResponse.json({
    id: inquiry.id,
    status: inquiry.status,
    inquiryType: inquiry.inquiryType,
    priority: inquiry.priority,
    confidence: inquiry.confidence,
    extracted,
    draft: failed || inquiry.inquiryType === "spam" ? null : inquiry.aiResponse,
    error: failed ? inquiry.aiResponse : null,
    processedAt: inquiry.processedAt,
  });
}
