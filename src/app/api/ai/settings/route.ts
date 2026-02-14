import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: AI 설정 목록
export async function GET() {
  const settings = await prisma.aiSetting.findMany({
    orderBy: { priority: "asc" },
  });
  // API 키는 마스킹 처리
  const masked = settings.map((s) => ({
    ...s,
    apiKey: s.apiKey ? "••••" + s.apiKey.slice(-4) : null,
  }));
  return NextResponse.json(masked);
}

// POST: AI 설정 생성
export async function POST(request: Request) {
  const body = await request.json();
  const setting = await prisma.aiSetting.create({
    data: {
      providerName: body.providerName,
      displayName: body.displayName,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey || null,
      modelName: body.modelName,
      priority: body.priority ?? 0,
      isActive: body.isActive ?? true,
      maxTokens: body.maxTokens ?? 2048,
      temperature: body.temperature ?? 0.7,
      description: body.description || null,
    },
  });
  return NextResponse.json(setting, { status: 201 });
}
