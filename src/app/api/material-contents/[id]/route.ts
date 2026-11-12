import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { readContent } from "@/lib/materials/content";
import { manualFields } from "../fields";

/**
 * 함유량 수정.
 * body.reextract 가 true 면 입력값 대신 원료의 현재 규격에서 다시 읽고 자동 추출 상태로 되돌린다.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const row = await prisma.materialContent.findUnique({
    where: { id },
    include: {
      material: { select: { name: true, specification: true } },
      catalog: { select: { name: true, specification: true } },
    },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const source = row.material ?? row.catalog;
  const specification = source?.specification ?? row.specification;

  const data = body.reextract
    ? { ...readContent(specification), isManual: false, note: row.note }
    : { specification: specification?.trim() || null, ...manualFields(body, specification) };

  const item = await prisma.materialContent.update({
    where: { id },
    data: { ...data, name: source?.name ?? row.name },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.materialContent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
