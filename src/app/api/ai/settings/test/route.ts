import { NextResponse } from "next/server";
import { testProviderConnection } from "@/lib/ai/aiClient";

// POST: 연결 테스트
export async function POST(request: Request) {
  const { providerId } = await request.json();
  if (!providerId) return NextResponse.json({ error: "providerId 필요" }, { status: 400 });

  try {
    const result = await testProviderConnection(providerId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "테스트 실패", latencyMs: 0 },
      { status: 500 }
    );
  }
}
