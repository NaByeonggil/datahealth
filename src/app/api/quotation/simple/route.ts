import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  buildHeaderData,
  buildProductsCreate,
  simpleQuotationInclude as include,
} from "@/lib/quotation/simpleQuotationPayload";

function generateQuotationNo() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `SQ${y}${m}${d}-${r}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";

  const where = search
    ? {
        OR: [
          { productName: { contains: search } },
          { customerName: { contains: search } },
          { quotationNo: { contains: search } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.simpleQuotation.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.simpleQuotation.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.productName || !String(body.productName).trim()) {
      return NextResponse.json({ error: "견적서 제목을 입력해주세요." }, { status: 400 });
    }
    const products = buildProductsCreate(body);
    if (products.length === 0) {
      return NextResponse.json({ error: "제품을 최소 1개 등록해주세요." }, { status: 400 });
    }

    const quotation = await prisma.simpleQuotation.create({
      data: {
        quotationNo: body.quotationNo || generateQuotationNo(),
        ...buildHeaderData(body),
        products: { create: products },
      },
      include,
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "이미 쓰고 있는 견적번호입니다." }, { status: 400 });
    }
    console.error("일반견적서 저장 실패:", error);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
