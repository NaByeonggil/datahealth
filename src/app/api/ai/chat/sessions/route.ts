import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 세션 목록
export async function GET() {
  const sessions = await prisma.aiChatSession.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true } },
    },
  });
  return NextResponse.json(sessions);
}

// POST: 새 세션 생성
export async function POST() {
  const session = await prisma.aiChatSession.create({
    data: { title: "새 대화" },
  });
  return NextResponse.json(session, { status: 201 });
}
