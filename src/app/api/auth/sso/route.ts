import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, cookieOptions, createSession, purgeExpiredSessions } from "@/lib/auth/session";
import { consumeSsoToken, mappedUsername } from "@/lib/integration/factory";

/**
 * 홈페이지 관리자에서 넘어오는 자동 로그인.
 * 홈페이지가 발급한 1회용 토큰(유효 60초)을 확인하고 이쪽 세션을 연다.
 */
export async function GET(req: NextRequest) {
  // 프록시 뒤라 req.url 의 호스트가 내부 주소일 수 있다 — 넘겨받은 호스트로 되돌려 보낸다
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : req.nextUrl.origin;
  const fail = (reason: string) => NextResponse.redirect(`${origin}/login?sso=${reason}`);

  const claims = consumeSsoToken(req.nextUrl.searchParams.get("token") ?? "");
  if (!claims) return fail("invalid");

  const username = mappedUsername(claims.email);
  if (!username) return fail("unmapped");

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) return fail("unmapped");

  await purgeExpiredSessions();
  const token = await createSession(user.id, req.headers.get("user-agent"));
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  // 바깥 주소로 튕겨 보내는 데 쓰이지 않도록, 이 사이트 안의 경로만 받는다
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const res = NextResponse.redirect(`${origin}${safeNext}`);
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}
