import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.supplier.update({
    where: { id },
    data: {
      code: body.code, name: body.name,
      contact: body.contact || null, manager: body.manager || null,
      address: body.address || null, email: body.email || null,
      isActive: body.isActive,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const used = await prisma.material.count({ where: { supplierId: id } });
  if (used > 0) return NextResponse.json({ error: "원료가 등록된 공급사는 삭제할 수 없습니다." }, { status: 400 });
  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
