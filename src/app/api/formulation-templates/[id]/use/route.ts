import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 템플릿 사용 기록 — 견적서에 실제로 얹었을 때만 올린다.
 * 목록 정렬(자주 쓰는 순)의 근거가 되므로 미리보기만으로는 올리지 않는다.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const updated = await prisma.formulationTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      select: { id: true, usageCount: true, lastUsedAt: true },
    });
    return NextResponse.json(updated);
  } catch {
    // 사용 통계는 부가 정보다 — 실패해도 견적 작성을 막지 않는다
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
