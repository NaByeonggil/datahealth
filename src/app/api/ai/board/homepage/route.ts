import { NextRequest, NextResponse } from "next/server";
import { FACTORY_BOARDS, fetchFactoryJson, type FactoryBoard } from "@/lib/integration/factory";

// GET: 홈페이지 게시판(건기식 생산문의·펫제품 생산문의) 목록 — 홈페이지에서 그때그때 읽어온다
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const board = params.get("board") ?? "food";
  if (!FACTORY_BOARDS.includes(board as FactoryBoard)) {
    return NextResponse.json({ error: "없는 게시판입니다." }, { status: 400 });
  }

  const result = await fetchFactoryJson("/api/integration/board", {
    board,
    page: Number(params.get("page")) || 1,
    waitingOnly: params.get("waiting") === "1",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
