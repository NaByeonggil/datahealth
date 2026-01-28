import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetTable = searchParams.get("targetTable");
  const status = searchParams.get("status");
  const limit = Number(searchParams.get("limit") || 50);

  const where: Record<string, unknown> = {};
  if (targetTable) where.targetTable = targetTable;
  if (status) where.status = status;

  const data = await prisma.importHistory.findMany({
    where,
    include: { template: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json(data);
}
