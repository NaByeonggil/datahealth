import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// API 키는 어떤 응답에도 원문으로 내보내지 않는다
const maskKey = <T extends { apiKey: string | null }>(s: T) => ({
  ...s,
  apiKey: s.apiKey ? "••••" + s.apiKey.slice(-4) : null,
});

// GET: 단일 AI 설정
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const setting = await prisma.aiSetting.findUnique({ where: { id } });
  if (!setting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(maskKey(setting));
}

// PUT: AI 설정 수정
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.displayName !== undefined) data.displayName = body.displayName;
  if (body.baseUrl !== undefined) data.baseUrl = body.baseUrl;
  if (body.apiKey !== undefined && !body.apiKey?.startsWith("••••")) data.apiKey = body.apiKey || null;
  if (body.modelName !== undefined) data.modelName = body.modelName;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.maxTokens !== undefined) data.maxTokens = body.maxTokens;
  if (body.temperature !== undefined) data.temperature = body.temperature;
  if (body.description !== undefined) data.description = body.description;

  const setting = await prisma.aiSetting.update({ where: { id }, data });
  return NextResponse.json(maskKey(setting));
}

// DELETE: AI 설정 삭제
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.aiSetting.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
