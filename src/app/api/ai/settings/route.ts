import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// API 키는 어떤 응답에도 원문으로 내보내지 않는다
const maskKey = <T extends { apiKey: string | null }>(s: T) => ({
  ...s,
  apiKey: s.apiKey ? "••••" + s.apiKey.slice(-4) : null,
});

// GET: AI 설정 목록
export async function GET() {
  const settings = await prisma.aiSetting.findMany({
    orderBy: { priority: "asc" },
  });
  return NextResponse.json(settings.map(maskKey));
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
  return NextResponse.json(maskKey(setting), { status: 201 });
}
