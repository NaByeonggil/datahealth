import { NextResponse } from "next/server";
import { processAllPending } from "@/lib/ai/boardMonitor";

// POST: 폴링 - 대기중 문의 자동 처리
export async function POST() {
  try {
    const result = await processAllPending();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "모니터링 실패" },
      { status: 500 }
    );
  }
}
