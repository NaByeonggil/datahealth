import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { standardFields, duplicateError } from "../fields";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = standardFields(await req.json());
  if (!data.name) return NextResponse.json({ error: "공전 원료명을 입력해주세요." }, { status: 400 });
  if (!data.keywords) return NextResponse.json({ error: "매칭 키워드를 하나 이상 입력해주세요." }, { status: 400 });
  try {
    const item = await prisma.functionalStandard.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (error) {
    const msg = duplicateError(error);
    if (msg) return NextResponse.json({ error: msg }, { status: 400 });
    if ((error as { code?: string }).code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw error;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.functionalStandard.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
