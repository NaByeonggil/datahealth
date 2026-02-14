import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 세션 + 메시지
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.aiChatSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}

// DELETE: 세션 삭제
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.aiChatSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
