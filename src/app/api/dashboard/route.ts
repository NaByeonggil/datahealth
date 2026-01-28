import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    simpleCount,
    detailedCount,
    recentSimple,
    recentDetailed,
    recentImports,
    materialCount,
    supplierCount,
    customerCount,
    monthlySimple,
    monthlyDetailed,
  ] = await Promise.all([
    prisma.simpleQuotation.count(),
    prisma.detailedQuotation.count(),
    prisma.simpleQuotation.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { productType: { select: { name: true } } } }),
    prisma.detailedQuotation.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.importHistory.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { template: { select: { name: true } } } }),
    prisma.material.count({ where: { isActive: true } }),
    prisma.supplier.count({ where: { isActive: true } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.simpleQuotation.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.detailedQuotation.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
  ]);

  // Aggregate monthly counts
  const months: Record<string, { simple: number; detailed: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = { simple: 0, detailed: 0 };
  }
  for (const q of monthlySimple) {
    const key = `${q.createdAt.getFullYear()}-${String(q.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) months[key].simple++;
  }
  for (const q of monthlyDetailed) {
    const key = `${q.createdAt.getFullYear()}-${String(q.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) months[key].detailed++;
  }

  return NextResponse.json({
    counts: { simple: simpleCount, detailed: detailedCount, materials: materialCount, suppliers: supplierCount, customers: customerCount },
    recentSimple,
    recentDetailed,
    recentImports,
    monthlyStats: Object.entries(months).map(([month, counts]) => ({ month, ...counts })),
  });
}
