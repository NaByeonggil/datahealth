import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: { content?: string; isActive?: boolean; sortOrder?: number; appliesTo?: string } = {};
  if (["ALL", "HEALTH_FOOD", "NON_HEALTH_FOOD"].includes(body.appliesTo)) {
    data.appliesTo = body.appliesTo;
  }

  if (body.content !== undefined) {
    const content = String(body.content).trim();
    if (!content) return NextResponse.json({ error: "내용은 필수입니다." }, { status: 400 });
    data.content = content;
  }
  if (body.isActive !== undefined) data.isActive = body.isActive === true;
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

  const saved = await prisma.quotationNoteTemplate.update({ where: { id }, data });
  return NextResponse.json(saved);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.quotationNoteTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
