import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 총 처리 수
  const totalLogs = await prisma.aiProcessingLog.count();

  // 오늘 처리 수
  const todayLogs = await prisma.aiProcessingLog.count({
    where: { createdAt: { gte: todayStart } },
  });

  // 평균 지연시간
  const avgLatency = await prisma.aiProcessingLog.aggregate({
    _avg: { latencyMs: true },
    where: { isSuccess: true },
  });

  // 폴백률
  const fallbackCount = await prisma.aiProcessingLog.count({
    where: { isFallback: true },
  });
  const fallbackRate = totalLogs > 0 ? (fallbackCount / totalLogs) * 100 : 0;

  // 성공률
  const successCount = await prisma.aiProcessingLog.count({
    where: { isSuccess: true },
  });
  const successRate = totalLogs > 0 ? (successCount / totalLogs) * 100 : 0;

  // 프로바이더별 통계
  const providerStats = await prisma.aiProcessingLog.groupBy({
    by: ["providerUsed"],
    _count: true,
    _avg: { latencyMs: true },
  });

  // 문의 통계
  const totalInquiries = await prisma.boardInquiry.count();
  const pendingInquiries = await prisma.boardInquiry.count({ where: { status: "pending" } });
  const completedInquiries = await prisma.boardInquiry.count({
    where: { status: { in: ["ai_completed", "responded", "closed"] } },
  });
  const reviewInquiries = await prisma.boardInquiry.count({ where: { status: "human_review" } });

  // 최근 6개월 월별 통계
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyLogs = await prisma.aiProcessingLog.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true, isSuccess: true },
  });

  const monthlyStats: { month: string; count: number; success: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const monthLogs = monthlyLogs.filter(
      (l) => l.createdAt >= date && l.createdAt < nextMonth
    );
    monthlyStats.push({
      month: monthKey,
      count: monthLogs.length,
      success: monthLogs.filter((l) => l.isSuccess).length,
    });
  }

  // 채팅 세션 수
  const totalSessions = await prisma.aiChatSession.count();

  return NextResponse.json({
    totalLogs,
    todayLogs,
    avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
    fallbackRate: Math.round(fallbackRate * 10) / 10,
    successRate: Math.round(successRate * 10) / 10,
    providerStats: providerStats.map((p) => ({
      provider: p.providerUsed,
      count: p._count,
      avgLatencyMs: Math.round(p._avg.latencyMs ?? 0),
    })),
    inquiry: { total: totalInquiries, pending: pendingInquiries, completed: completedInquiries, review: reviewInquiries },
    totalSessions,
    monthlyStats,
  });
}
