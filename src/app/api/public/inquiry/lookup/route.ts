import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, normalizeEmail, normalizeReceiptNo, publicStatus, rateLimit } from "@/lib/inquiry/publicIntake";

const TEN_MINUTES = 10 * 60 * 1000;

// POST: 접수번호 + 이메일로 내 문의 조회 (로그인 없음)
export async function POST(request: Request) {
  // 접수번호를 마구 넣어 보는 것을 막는다
  if (!rateLimit(`lookup:${clientIp(request)}`, 10, TEN_MINUTES)) {
    return NextResponse.json({ error: "조회 요청이 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const receiptNo = normalizeReceiptNo(body.receiptNo);
  const email = normalizeEmail(body.email);
  const notFound = NextResponse.json(
    { error: "접수번호와 이메일이 일치하는 문의를 찾을 수 없습니다." },
    { status: 404 }
  );
  if (!receiptNo || !email) return notFound;

  const inquiry = await prisma.boardInquiry.findUnique({ where: { receiptNo } });
  // 번호가 맞아도 이메일이 다르면 없는 것과 똑같이 답한다
  if (!inquiry || normalizeEmail(inquiry.authorEmail) !== email) return notFound;

  const status = publicStatus(inquiry.status);
  const answered = status.code === "answered" && !!inquiry.adminResponse;

  // 고객에게는 담당자가 등록한 답변만 보여준다. AI 초안·분류·추출 결과는 내부용이다.
  return NextResponse.json({
    receiptNo: inquiry.receiptNo,
    title: inquiry.title,
    content: inquiry.content,
    createdAt: inquiry.createdAt,
    status: status.code,
    statusLabel: status.label,
    answer: answered ? inquiry.adminResponse : null,
    answeredAt: answered ? inquiry.respondedAt : null,
  });
}
