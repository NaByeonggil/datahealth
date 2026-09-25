import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { isRole } from "@/lib/auth/roles";
import { getCurrentUser, revokeUserSessions } from "@/lib/auth/session";

const publicFields = {
  id: true, username: true, name: true, role: true, isActive: true,
  mustChangePassword: true, lastLoginAt: true, createdAt: true,
};

/** 마지막 남은 관리자를 끄거나 강등하면 아무도 계정 관리를 못 하게 된다 */
async function wouldOrphanAdmins(targetId: string, nextRole: string, nextActive: boolean) {
  if (nextRole === "admin" && nextActive) return false;
  const others = await prisma.user.count({
    where: { role: "admin", isActive: true, NOT: { id: targetId } },
  });
  return others === 0;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const me = await getCurrentUser();
    const body = await req.json();

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });

    const name = String(body.name ?? target.name).trim();
    const role = String(body.role ?? target.role);
    const isActive = body.isActive ?? target.isActive;

    if (!name) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    if (!isRole(role)) return NextResponse.json({ error: "알 수 없는 역할입니다." }, { status: 400 });

    if (me?.id === id && (role !== "admin" || !isActive)) {
      return NextResponse.json(
        { error: "자기 계정의 권한을 낮추거나 중지할 수 없습니다." },
        { status: 400 }
      );
    }
    if (await wouldOrphanAdmins(id, role, isActive)) {
      return NextResponse.json(
        { error: "마지막 관리자 계정입니다. 다른 관리자를 먼저 지정해주세요." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, role, isActive },
      select: publicFields,
    });

    // 계정을 중지하면 이미 열린 로그인도 즉시 끊는다
    if (!isActive) await revokeUserSessions(id);

    return NextResponse.json(user);
  } catch (error) {
    console.error("계정 수정 실패:", error);
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

/** 비밀번호 초기화 — 관리자가 임시 비밀번호를 정해주고 본인이 다시 바꾸게 한다 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const password = String(body.password || "");

  const invalid = validatePassword(password);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  await revokeUserSessions(id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (me?.id === id) {
    return NextResponse.json({ error: "자기 계정은 삭제할 수 없습니다." }, { status: 400 });
  }
  if (await wouldOrphanAdmins(id, "sales", false)) {
    return NextResponse.json(
      { error: "마지막 관리자 계정입니다. 다른 관리자를 먼저 지정해주세요." },
      { status: 400 }
    );
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
