import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { processInquiry } from "@/lib/ai/boardMonitor";
import { verifyRequestSignature } from "@/lib/integration/factory";

const PATH = "/api/integration/inquiries";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 60)).slice(0, 20) : [];

/** 홈페이지가 선택형으로 받은 항목을 AI 가 읽을 글로 풀어 쓴다 */
function buildContent(body: Record<string, unknown>): string {
  const rows: [string, string][] = [
    ["문의 유형", str(body.serviceType, 60)],
    ["희망 제형", list(body.formulations).join(", ")],
    ["희망 포장", list(body.packagings).join(", ")],
    ["예상 수량", str(body.quantity, 60)],
    ["예상 예산", str(body.budget, 60)],
    ["희망 납기", str(body.targetDate, 30)],
    ["목표 고객", str(body.targetAudience, 300)],
    ["기능성·건강 고민", str(body.healthConcern, 300)],
    ["원료 방향", str(body.materialType, 60)],
    ["보유 자산", list(body.ownedAssets).join(", ")],
    ["목표 판매가", str(body.targetPrice, 60)],
  ];
  const fields = rows.filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const message = str(body.message, 5000) || "(작성된 내용 없음)";
  return fields ? `${fields}\n\n[상세 내용]\n${message}` : message;
}

// POST: 홈페이지에서 접수된 문의를 넘겨받는다 (같은 문의가 다시 와도 한 건으로 유지)
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyRequestSignature(request, PATH, raw)) {
    return NextResponse.json({ error: "서명이 올바르지 않습니다." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const externalId = str(body.id, 60);
  const authorName = str(body.name, 50);
  if (!externalId || !authorName) {
    return NextResponse.json({ error: "id 와 name 이 필요합니다." }, { status: 400 });
  }

  // 연락처·이메일은 받지 않는다 — 분석에 필요 없고, 고객 응대는 홈페이지 관리자에서 한다
  const data = {
    title: str(body.title, 150) || `${str(body.serviceType, 60) || "생산"} 문의`,
    content: buildContent(body),
    authorName,
    company: str(body.company, 100) || null,
  };

  const existing = await prisma.boardInquiry.findUnique({ where: { externalId } });
  const inquiry = existing
    ? existing
    : await prisma.boardInquiry.create({ data: { ...data, source: "factory", externalId } });

  // 응답을 보낸 뒤 AI 분류·추출·답변 초안을 돌린다. AI PC 가 꺼져 있으면 대기로 남는다.
  if (inquiry.status === "pending") {
    after(() => processInquiry(inquiry.id).catch(() => undefined));
  }

  return NextResponse.json({ id: inquiry.id, status: inquiry.status }, { status: existing ? 200 : 201 });
}
