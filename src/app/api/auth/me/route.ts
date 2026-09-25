import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

/** 화면이 자기 권한을 알아야 메뉴·원가 표시를 맞출 수 있다 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json(user);
}
