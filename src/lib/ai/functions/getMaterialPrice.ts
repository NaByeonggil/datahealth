import { prisma } from "@/lib/prisma";
import { normName, toNumber } from "./args";

const MAX_CANDIDATES = 8;

/**
 * 원료 단가 조회.
 * 이름이 여러 원료에 걸리면 임의로 하나를 고르지 않고 후보를 돌려준다 —
 * 같은 "비타민C" 라도 공급사·규격마다 단가가 다르다.
 */
export async function getMaterialPrice(args: { materialName: string; quantityKg?: number }): Promise<unknown> {
  const keyword = String(args.materialName ?? "").trim();
  if (!keyword) return { found: false, message: "원료명 또는 코드가 필요합니다." };

  const search = (term: string) =>
    prisma.material.findMany({
      where: { isActive: true, OR: [{ name: { contains: term } }, { code: { contains: term } }] },
      include: { supplier: { select: { name: true } } },
      take: 100,
    });

  // 모델이 "비타민C (SRC21-0241)" 처럼 이름과 코드를 함께 넘기는 일이 있다 — 코드가 섞여 있으면 코드를 우선한다
  const tokens = keyword.split(/[\s()（）,]+/).filter(Boolean);
  const byCode = tokens.length > 1
    ? await prisma.material.findMany({
        where: { isActive: true, code: { in: tokens } },
        include: { supplier: { select: { name: true } } },
      })
    : [];

  let matches = byCode.length === 1 ? byCode : await search(keyword);
  if (matches.length === 0 && tokens.length > 1) matches = await search(tokens[0]);

  if (matches.length === 0) {
    return { found: false, message: `'${keyword}' 원료를 찾을 수 없습니다.` };
  }

  const key = normName(keyword);
  const exact = matches.filter((m) => m.code === keyword || normName(m.name) === key);
  const picked = exact.length === 1 ? exact[0] : matches.length === 1 ? matches[0] : null;

  if (!picked) {
    const pool = exact.length > 1 ? exact : matches;
    pool.sort((a, b) => a.name.length - b.name.length);
    return {
      found: false,
      ambiguous: true,
      message: `'${keyword}'에 해당하는 원료가 ${pool.length}건입니다. 사용자에게 어느 원료인지 확인하거나, 코드(code)로 다시 조회하세요.`,
      candidates: pool.slice(0, MAX_CANDIDATES).map((m) => ({
        code: m.code,
        name: m.name,
        unitPrice: m.unitPrice,
        supplierName: m.supplier.name,
        specification: m.specification,
      })),
    };
  }

  const quantityKg = toNumber(args.quantityKg, 1);

  return {
    found: true,
    material: {
      code: picked.code,
      name: picked.name,
      unit: picked.unit,
      unitPrice: picked.unitPrice,
      supplierName: picked.supplier.name,
      origin: picked.origin,
      specification: picked.specification,
    },
    calculation: {
      quantityKg,
      unitPrice: picked.unitPrice,
      totalCost: Math.round(picked.unitPrice * quantityKg),
    },
  };
}
