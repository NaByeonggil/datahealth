import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  buildHeaderData,
  buildProductsCreate,
  simpleQuotationInclude as include,
} from "@/lib/quotation/simpleQuotationPayload";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quotation = await prisma.simpleQuotation.findUnique({ where: { id }, include });
  if (!quotation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(quotation);
}

/**
 * 전체 수정 — 작성 화면에서 그대로 다시 저장할 때 쓴다.
 * 제품·배합·포장옵션은 통째로 교체한다(행 추가/삭제/순서변경을 그대로 반영).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (!body.productName || !String(body.productName).trim()) {
      return NextResponse.json({ error: "견적서 제목을 입력해주세요." }, { status: 400 });
    }
    const products = buildProductsCreate(body);
    if (products.length === 0) {
      return NextResponse.json({ error: "제품을 최소 1개 등록해주세요." }, { status: 400 });
    }

    const existing = await prisma.simpleQuotation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const saved = await prisma.$transaction(async (tx) => {
      // 제품을 지우면 배합·포장옵션도 함께 지워진다(onDelete: Cascade)
      await tx.simpleQuotationProduct.deleteMany({ where: { quotationId: id } });
      return tx.simpleQuotation.update({
        where: { id },
        data: {
          ...buildHeaderData(body),
          ...(body.quotationNo ? { quotationNo: String(body.quotationNo).trim() } : {}),
          products: { create: products },
        },
        include,
      });
    });

    return NextResponse.json(saved);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "이미 쓰고 있는 견적번호입니다." }, { status: 400 });
    }
    console.error("일반견적서 수정 실패:", error);
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

/**
 * 부분 수정 — 상세 화면에서 특정 항목만 바꿀 때 쓴다.
 * 보내온 키만 반영하므로 나머지 값은 그대로 유지된다.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: { foodType?: string; note?: string } = {};
  if (typeof body.foodType === "string" && body.foodType.trim()) {
    data.foodType = body.foodType.trim();
  }
  if (typeof body.note === "string") data.note = body.note;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 });
  }

  const saved = await prisma.simpleQuotation.update({ where: { id }, data, include });
  return NextResponse.json(saved);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.simpleQuotation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("일반견적서 삭제 실패:", error);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
