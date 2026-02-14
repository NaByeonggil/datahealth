import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const taskType = searchParams.get("taskType");

  const where: Record<string, unknown> = {};
  if (taskType) where.taskType = taskType;

  const logs = await prisma.aiProcessingLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
}
