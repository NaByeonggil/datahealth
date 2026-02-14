import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 문의 상세
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inquiry = await prisma.boardInquiry.findUnique({ where: { id } });
  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(inquiry);
}

// PUT: 문의 수정 (관리자 응답 등)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.adminResponse !== undefined) {
    data.adminResponse = body.adminResponse;
    data.status = "responded";
    data.respondedAt = new Date();
  }
  if (body.status !== undefined) data.status = body.status;
  if (body.priority !== undefined) data.priority = body.priority;

  const inquiry = await prisma.boardInquiry.update({ where: { id }, data });
  return NextResponse.json(inquiry);
}
