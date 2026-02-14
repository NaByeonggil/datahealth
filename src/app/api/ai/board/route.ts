import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 문의 목록
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const inquiryType = searchParams.get("inquiryType");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (inquiryType) where.inquiryType = inquiryType;

  const inquiries = await prisma.boardInquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(inquiries);
}

// POST: 문의 등록
export async function POST(request: Request) {
  const body = await request.json();
  const inquiry = await prisma.boardInquiry.create({
    data: {
      title: body.title,
      content: body.content,
      authorName: body.authorName,
      authorEmail: body.authorEmail || null,
      authorPhone: body.authorPhone || null,
    },
  });
  return NextResponse.json(inquiry, { status: 201 });
}
