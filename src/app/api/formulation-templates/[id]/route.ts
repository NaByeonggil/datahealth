import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  buildTemplateHeader,
  buildTemplateItems,
  linkMaterialsByName,
  formulationTemplateInclude as include,
} from "@/lib/quotation/formulationTemplatePayload";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.formulationTemplate.findUnique({ where: { id }, include });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

/** 전체 수정 — 구성 원료는 통째로 교체한다(행 추가/삭제/순서변경을 그대로 반영) */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const header = buildTemplateHeader(body);
    if (!header.name) {
      return NextResponse.json({ error: "템플릿 이름을 입력해주세요." }, { status: 400 });
    }
    const items = await linkMaterialsByName(buildTemplateItems(body));
    if (items.length === 0) {
      return NextResponse.json({ error: "원료를 최소 1개 등록해주세요." }, { status: 400 });
    }

    const existing = await prisma.formulationTemplate.findUnique({
      where: { id }, select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const saved = await prisma.$transaction(async (tx) => {
      await tx.formulationTemplateItem.deleteMany({ where: { templateId: id } });
      return tx.formulationTemplate.update({
        where: { id },
        data: { ...header, items: { create: items } },
        include,
      });
    });
    return NextResponse.json(saved);
  } catch (error) {
    console.error("배합 템플릿 수정 실패:", error);
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.formulationTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("배합 템플릿 삭제 실패:", error);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
