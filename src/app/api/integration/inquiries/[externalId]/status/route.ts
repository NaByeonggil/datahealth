import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestSignature } from "@/lib/integration/factory";

/**
 * 홈페이지의 문의 처리 단계 → 이쪽 문의 상태.
 * 응대의 기준은 홈페이지다. 여기서는 "아직 볼 일이 남았는가"만 맞춘다.
 */
function mapStatus(factoryStatus: string, replied: boolean): string | null {
  if (factoryStatus === "SPAM" || factoryStatus === "CLOSED") return "closed";
  if (replied || factoryStatus === "QUOTED" || factoryStatus === "CONTRACTED") return "responded";
  return null;
}

// POST: 홈페이지에서 문의 상태가 바뀌거나 답변이 등록됐을 때
export async function POST(request: Request, { params }: { params: Promise<{ externalId: string }> }) {
  const { externalId } = await params;
  const raw = await request.text();
  if (!verifyRequestSignature(request, `/api/integration/inquiries/${externalId}/status`, raw)) {
    return NextResponse.json({ error: "서명이 올바르지 않습니다." }, { status: 401 });
  }

  let body: { status?: unknown; replied?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const inquiry = await prisma.boardInquiry.findUnique({ where: { externalId } });
  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = mapStatus(String(body.status ?? ""), body.replied === true);
  // AI 가 돌고 있는 중에는 건드리지 않는다 — 처리 결과가 상태를 덮어쓴다
  if (!next || next === inquiry.status || inquiry.status === "ai_processing") {
    return NextResponse.json({ status: inquiry.status, changed: false });
  }

  await prisma.boardInquiry.update({
    where: { id: inquiry.id },
    data: { status: next, respondedAt: next === "responded" ? new Date() : inquiry.respondedAt },
  });
  return NextResponse.json({ status: next, changed: true });
}
