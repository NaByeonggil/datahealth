import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { isRole } from "@/lib/auth/roles";

/** 비밀번호 해시는 어떤 경우에도 내보내지 않는다 */
const publicFields = {
  id: true, username: true, name: true, role: true, isActive: true,
  mustChangePassword: true, lastLoginAt: true, createdAt: true,
};

export async function GET() {
  const users = await prisma.user.findMany({
    select: { ...publicFields, _count: { select: { sessions: true } } },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const role = String(body.role || "sales");
    const password = String(body.password || "");

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "아이디는 영문 소문자·숫자·._- 로 3~30자여야 합니다." },
        { status: 400 }
      );
    }
    if (!name) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    if (!isRole(role)) return NextResponse.json({ error: "알 수 없는 역할입니다." }, { status: 400 });

    const invalid = validatePassword(password);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const user = await prisma.user.create({
      data: {
        username, name, role,
        passwordHash: await hashPassword(password),
        // 관리자가 정해준 비밀번호는 본인이 다시 바꾸게 한다
        mustChangePassword: true,
      },
      select: publicFields,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "이미 쓰고 있는 아이디입니다." }, { status: 400 });
    }
    console.error("계정 생성 실패:", error);
    return NextResponse.json({ error: "생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
