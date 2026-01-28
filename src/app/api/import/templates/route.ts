import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetTable = searchParams.get("targetTable");
  const where = targetTable ? { targetTable } : {};
  const data = await prisma.importTemplate.findMany({ where, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await prisma.importTemplate.create({
    data: {
      name: body.name,
      targetTable: body.targetTable,
      mappingConfig: JSON.stringify(body.mappingConfig),
      options: body.options ? JSON.stringify(body.options) : null,
      createdBy: body.createdBy || "홍길동",
    },
  });
  return NextResponse.json(item, { status: 201 });
}
