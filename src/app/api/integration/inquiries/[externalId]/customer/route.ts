import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestSignature } from "@/lib/integration/factory";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** WEB-20261014-AB12 — 홈페이지 문의에서 생긴 고객사임을 코드로 알 수 있게 한다 */
function newCustomerCode(): string {
  // 서버 시계는 UTC 다 — 코드의 날짜는 한국 날짜로 찍는다
  const day = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
  return `WEB-${day}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * POST: 담당자가 홈페이지 관리자에서 「견적서 만들기」를 누르면 그 문의의 고객 정보가 넘어온다.
 * 문의 접수 때는 연락처를 받지 않고, 견적서를 쓰기로 한 시점에만 받는다.
 */
export async function POST(request: Request, { params }: { params: Promise<{ externalId: string }> }) {
  const { externalId } = await params;
  const raw = await request.text();
  if (!verifyRequestSignature(request, `/api/integration/inquiries/${externalId}/customer`, raw)) {
    return NextResponse.json({ error: "서명이 올바르지 않습니다." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const inquiry = await prisma.boardInquiry.findUnique({ where: { externalId } });
  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const person = str(body.name, 50);
  const company = str(body.company, 100);
  const phone = str(body.phone, 30);
  const email = str(body.email, 200).toLowerCase();
  // 회사명이 없으면 개인 고객이다 — 담당자 이름을 고객사명으로 쓴다
  const name = company || person;
  if (!name) return NextResponse.json({ error: "name 또는 company 가 필요합니다." }, { status: 400 });

  const data = { name, manager: person || null, contact: phone || null, email: email || null };

  // 이미 이 문의로 등록했으면 그 고객사를 갱신한다. 아니면 같은 이메일(없으면 같은 이름·연락처)의
  // 기존 고객사를 찾아 쓰고, 없을 때만 새로 만든다 — 재문의마다 고객사가 늘어나지 않게.
  const existing =
    (inquiry.customerId ? await prisma.customer.findUnique({ where: { id: inquiry.customerId } }) : null) ??
    (email
      ? await prisma.customer.findFirst({ where: { email } })
      : await prisma.customer.findFirst({ where: { name, contact: phone || null } }));

  const customer = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data })
    : await prisma.customer.create({
        data: { ...data, code: newCustomerCode(), note: "홈페이지 견적문의로 등록" },
      });

  if (inquiry.customerId !== customer.id) {
    await prisma.boardInquiry.update({ where: { id: inquiry.id }, data: { customerId: customer.id } });
  }

  return NextResponse.json({ customerId: customer.id, created: !existing }, { status: existing ? 200 : 201 });
}
