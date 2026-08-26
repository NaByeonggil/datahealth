import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 목록 — activeOnly=1 이면 사용중인 문구만 (견적서 작성 화면이 쓴다) */
export async function GET(req: NextRequest) {
  const activeOnly = new URL(req.url).searchParams.get("activeOnly") === "1";
  const data = await prisma.quotationNoteTemplate.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const content = String(body.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ error: "내용은 필수입니다." }, { status: 400 });
  }
  // 새 항목은 맨 뒤로
  const last = await prisma.quotationNoteTemplate.findFirst({ orderBy: { sortOrder: "desc" } });
  const created = await prisma.quotationNoteTemplate.create({
    data: {
      content,
      appliesTo: ["ALL", "HEALTH_FOOD", "NON_HEALTH_FOOD"].includes(body.appliesTo)
        ? body.appliesTo : "ALL",
      sortOrder: (last?.sortOrder ?? 0) + 1,
      isActive: body.isActive !== false,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
