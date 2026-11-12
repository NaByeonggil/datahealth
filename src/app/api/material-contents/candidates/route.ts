import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 함유량 행이 아직 없는 원료·취급품목 — 등록 다이얼로그의 원료 선택지 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceType = searchParams.get("sourceType") === "catalog" ? "catalog" : "material";
  const search = searchParams.get("search") || "";
  const nameFilter = search ? { name: { contains: search } } : {};

  const data = sourceType === "material"
    ? (await prisma.material.findMany({
        where: { content: null, ...nameFilter },
        select: { id: true, name: true, code: true, specification: true, supplier: { select: { name: true } } },
        orderBy: { name: "asc" },
        take: 30,
      })).map((m) => ({ id: m.id, name: m.name, label: `${m.code} · ${m.supplier.name}`, specification: m.specification }))
    : (await prisma.materialCatalog.findMany({
        where: { content: null, ...nameFilter },
        select: { id: true, name: true, specification: true, supplier: { select: { name: true } } },
        orderBy: { name: "asc" },
        take: 30,
      })).map((c) => ({ id: c.id, name: c.name, label: c.supplier.name, specification: c.specification }));

  return NextResponse.json({ data });
}
