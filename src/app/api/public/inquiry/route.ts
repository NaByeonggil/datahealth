import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { processInquiry } from "@/lib/ai/boardMonitor";
import { clientIp, generateReceiptNo, rateLimit, validatePublicInquiry } from "@/lib/inquiry/publicIntake";

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// POST: 고객 문의 접수 (로그인 없음)
export async function POST(request: Request) {
  // 한 사람이 연달아 넣는 것과, 전체가 한꺼번에 몰리는 것을 각각 막는다
  if (!rateLimit(`inquiry:${clientIp(request)}`, 5, TEN_MINUTES) || !rateLimit("inquiry:all", 60, ONE_HOUR)) {
    return NextResponse.json({ error: "요청이 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // 사람 눈에 안 보이는 칸 — 채워져 있으면 자동 등록 프로그램이다. 저장하지 않고 성공한 척한다.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ receiptNo: generateReceiptNo() }, { status: 201 });
  }

  const checked = validatePublicInquiry(body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  // 접수번호가 겹치면 다시 뽑는다 (확률은 낮지만 unique 제약에 걸릴 수 있다)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const inquiry = await prisma.boardInquiry.create({
        data: { ...checked.data, source: "public", receiptNo: generateReceiptNo(), consentAt: new Date() },
      });

      // 응답을 보낸 뒤 AI 분류·초안 작성을 돌린다. AI PC 가 꺼져 있으면 대기 상태로 남는다.
      after(() => processInquiry(inquiry.id).catch(() => undefined));

      return NextResponse.json({ receiptNo: inquiry.receiptNo }, { status: 201 });
    } catch (error) {
      const isDuplicate = (error as { code?: string }).code === "P2002";
      if (!isDuplicate) throw error;
    }
  }
  return NextResponse.json({ error: "접수에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
}
