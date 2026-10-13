import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchFactoryJson, isFactoryInquiryId } from "@/lib/integration/factory";

/** 홈페이지 답글 길이 제한에 맞춘다 */
const MAX_LENGTH = 2000;

/**
 * POST: 홈페이지 문의에 운영자 답글을 단다.
 * 등록 즉시 고객이 게시판에서 보게 되므로, 화면에서 담당자가 확인을 누른 뒤에만 불린다.
 */
export async function POST(request: Request, { params }: { params: Promise<{ externalId: string }> }) {
  const { externalId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!isFactoryInquiryId(externalId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "답변 내용을 입력해주세요." }, { status: 400 });
  if (message.length > MAX_LENGTH) {
    return NextResponse.json({ error: `답변은 ${MAX_LENGTH}자까지 입력할 수 있습니다.` }, { status: 400 });
  }

  const result = await fetchFactoryJson(`/api/integration/inquiries/${externalId}/replies`, {
    message,
    notifyCustomer: body.notifyCustomer === true,
    authorName: user.name,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  // 이쪽 문의 게시판도 답변 완료로 맞춘다
  await prisma.boardInquiry.updateMany({
    where: { externalId, status: { notIn: ["closed", "ai_processing"] } },
    data: { status: "responded", adminResponse: message, respondedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
