import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, validatePassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE, cookieOptions, createSession, getCurrentUser, revokeUserSessions,
} from "@/lib/auth/session";

/**
 * 본인 비밀번호 변경.
 * 바꾸고 나면 기존 세션을 전부 끊고 지금 이 브라우저만 다시 열어준다 —
 * 비밀번호가 샜을 때 다른 곳의 로그인이 살아 있으면 바꾼 의미가 없다.
 */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });

  // 관리자가 초기화해 준 상태면 현재 비밀번호를 다시 묻지 않는다
  if (!user.mustChangePassword) {
    const ok = await verifyPassword(String(currentPassword || ""), user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
    }
  }

  const invalid = validatePassword(String(newPassword || ""));
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  if (await verifyPassword(String(newPassword), user.passwordHash)) {
    return NextResponse.json({ error: "이전과 다른 비밀번호를 사용해주세요." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(String(newPassword)), mustChangePassword: false },
  });

  await revokeUserSessions(user.id);
  const token = await createSession(user.id, req.headers.get("user-agent"));

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}
