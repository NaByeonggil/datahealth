import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { rankTollingRates } from "@/lib/quotation/resolveTollingRate";

/** 견적 폼의 "가공비 조회" — 조건에 맞는 단가 후보와 추가 공정비를 함께 돌려준다 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const formName = searchParams.get("formName") || "";
  const quantity = Number(searchParams.get("quantity") || "0");
  const specValue = searchParams.get("specValue")
    ? Number(searchParams.get("specValue"))
    : undefined;

  const rates = await prisma.tollingRate.findMany({
    where: { isCurrent: true },
    orderBy: { unitCost: "asc" },
  });

  const ranked = rankTollingRates(
    rates.map((r) => ({ ...r, effectiveDate: r.effectiveDate.toISOString() })),
    { formName, quantity, specValue }
  );

  const extras = await prisma.tollingExtra.findMany({
    where: { isCurrent: true },
    orderBy: { name: "asc" },
  });

  // 조회한 제형과 후보 업체에 걸린 것만 추린다 (다른 제형의 롤비/병값까지 나오지 않도록)
  const vendors = new Set(ranked.map((r) => r.rate.vendorName));
  const norm = (v: string) => v.replace(/\s|\(|\)/g, "").toLowerCase();
  const target = norm(formName);

  const matched = extras.filter((e) => {
    if (e.vendorName && !vendors.has(e.vendorName)) return false;
    if (!e.formName) return true; // 제형 무관 항목 (물류비 등)
    if (!target) return true;
    const f = norm(e.formName);
    return f === target || f.includes(target) || target.includes(f);
  });

  // 같은 항목이 제형만 달리해 중복 노출되지 않도록 정리
  const seen = new Set<string>();
  const relatedExtras = matched.filter((e) => {
    const key = `${e.name}|${e.vendorName || ""}|${e.calcType}|${e.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ candidates: ranked, extras: relatedExtras });
}
