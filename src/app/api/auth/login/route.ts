import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE, cookieOptions, createSession, purgeExpiredSessions,
} from "@/lib/auth/session";

/**
 * 로그인.
 * 아이디가 없든 비밀번호가 틀렸든 같은 문구를 돌려준다 —
 * 어느 쪽이 틀렸는지 알려주면 아이디를 캐낼 수 있다.
 */
const FAIL = "아이디 또는 비밀번호가 올바르지 않습니다.";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: FAIL }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { username: String(username).trim() },
    });

    // 계정이 없어도 해시 검증을 한 번 돌려 응답 시간을 비슷하게 맞춘다
    const ok = user
      ? await verifyPassword(String(password), user.passwordHash)
      : await verifyPassword(String(password), "scrypt$16384$8$1$00$00");

    if (!user || !ok) {
      return NextResponse.json({ error: FAIL }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json(
        { error: "사용이 중지된 계정입니다. 관리자에게 문의해주세요." },
        { status: 403 }
      );
    }

    await purgeExpiredSessions();
    const token = await createSession(user.id, req.headers.get("user-agent"));
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const res = NextResponse.json({
      user: {
        id: user.id, username: user.username, name: user.name,
        role: user.role, mustChangePassword: user.mustChangePassword,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions);
    return res;
  } catch (error) {
    console.error("로그인 실패:", error);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
