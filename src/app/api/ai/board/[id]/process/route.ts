import { NextResponse } from "next/server";
import { processInquiry } from "@/lib/ai/boardMonitor";

// POST: 수동 AI 처리
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await processInquiry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "처리 실패" },
      { status: 500 }
    );
  }
}
