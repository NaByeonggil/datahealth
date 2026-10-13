import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { callFactory } from "@/lib/integration/factory";

/** 홈페이지 첨부 제한(5MB)에 맞춘다 */
const MAX_PDF_BYTES = 5 * 1024 * 1024;

/**
 * POST: 견적서 PDF 를 홈페이지 문의의 답글로 보낸다.
 * 고객이 견적문의 게시판에서 바로 보게 되므로, 화면에서 담당자가 확인을 누른 뒤에만 불린다.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const quotation = await prisma.simpleQuotation.findUnique({ where: { id } });
  if (!quotation) return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });
  if (!quotation.inquiryExternalId) {
    return NextResponse.json({ error: "홈페이지 문의와 연결되지 않은 견적서입니다." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "견적서 PDF 가 없습니다." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "견적서 PDF 가 5MB 를 넘습니다." }, { status: 413 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 4).toString("latin1") !== "%PDF") {
    return NextResponse.json({ error: "PDF 파일이 아닙니다." }, { status: 400 });
  }

  const path = `/api/integration/inquiries/${quotation.inquiryExternalId}/replies`;
  const res = await callFactory(
    path,
    JSON.stringify({
      message: String(form.get("message") ?? "").trim().slice(0, 2000),
      notifyCustomer: form.get("notifyCustomer") === "true",
      authorName: user.name,
      file: { filename: `견적서_${quotation.quotationNo}.pdf`, base64: bytes.toString("base64") },
    })
  );

  if (!res) {
    return NextResponse.json({ error: "홈페이지에 연결하지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 502 });
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: detail.error || `홈페이지가 요청을 받지 않았습니다 (${res.status}).` },
      { status: 502 }
    );
  }

  const updated = await prisma.simpleQuotation.update({
    where: { id },
    data: { sentToInquiryAt: new Date() },
    select: { sentToInquiryAt: true },
  });
  // 이쪽 문의 게시판도 답변 완료로 맞춘다
  await prisma.boardInquiry.updateMany({
    where: { externalId: quotation.inquiryExternalId, status: { not: "closed" } },
    data: { status: "responded", respondedAt: new Date() },
  });

  return NextResponse.json({ ok: true, sentToInquiryAt: updated.sentToInquiryAt });
}
