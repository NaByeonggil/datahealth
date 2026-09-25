/**
 * 로그인 세션 — 쿠키에는 난수 토큰만 담고 실체는 DB(Session)에 둔다.
 *
 * JWT 대신 DB 세션을 쓰는 이유: 계정을 끄거나 비밀번호를 바꿨을 때 이미 나간
 * 로그인을 즉시 끊을 수 있어야 한다. 원가가 걸린 화면이라 그게 더 중요하다.
 */
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "dh_session";
const SESSION_DAYS = 7;

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
}

export function newSessionToken() {
  return randomBytes(32).toString("hex");
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

/** 토큰으로 사용자 확인. 만료·비활성 계정은 통과시키지 않는다. */
export async function getUserByToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true, username: true, name: true, role: true,
          isActive: true, mustChangePassword: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // 만료된 세션은 지나는 길에 치운다
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.user.isActive) return null;

  const { id, username, name, role, mustChangePassword } = session.user;
  return { id, username, name, role, mustChangePassword };
}

/** 서버 컴포넌트·라우트 핸들러에서 현재 로그인 사용자 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return getUserByToken(store.get(SESSION_COOKIE)?.value);
}

/** 로그인 성공 시 세션을 연다 */
export async function createSession(userId: string, userAgent?: string | null) {
  const token = newSessionToken();
  await prisma.session.create({
    data: { token, userId, expiresAt: sessionExpiry(), userAgent: userAgent || null },
  });
  return token;
}

/** 이 사용자의 모든 세션을 끊는다 (비밀번호 변경·계정 비활성·강제 로그아웃) */
export async function revokeUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

/** 만료된 세션 청소 — 로그인할 때 겸사겸사 부른다 */
export async function purgeExpiredSessions() {
  await prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => undefined);
}
