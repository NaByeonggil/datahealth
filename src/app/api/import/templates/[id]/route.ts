import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.importTemplate.update({
    where: { id },
    data: {
      name: body.name,
      targetTable: body.targetTable,
      mappingConfig: JSON.stringify(body.mappingConfig),
      options: body.options ? JSON.stringify(body.options) : null,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.importTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
