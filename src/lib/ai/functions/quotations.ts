import { prisma } from "@/lib/prisma";
import { calculateSimpleQuotation } from "@/lib/quotation/calculateSimple";
import { calculateDetailedQuotation } from "@/lib/quotation/calculateDetailed";
import { simpleQuotationInclude } from "@/lib/quotation/simpleQuotationPayload";
import { toNumber } from "./args";

/**
 * 저장된 견적서 조회 — 일반견적서(SQ…)와 상세견적서(DQ…).
 * 금액은 견적서 화면과 같은 계산 모듈로 다시 계산해 돌려준다(저장된 합계를 믿지 않는다).
 */

const MAX_RESULTS = 10;
const won = (n: number) => Math.round(n);
const ymd = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

/** 견적번호·고객사·제품명으로 일반·상세견적서를 함께 찾는다 */
export async function searchQuotations(args: { keyword?: string; type?: string }): Promise<unknown> {
  const keyword = String(args.keyword ?? "").trim();
  const type = String(args.type ?? "").trim();
  const where = keyword
    ? {
        OR: [
          { quotationNo: { contains: keyword } },
          { customerName: { contains: keyword } },
          { productName: { contains: keyword } },
        ],
      }
    : {};
  const select = { quotationNo: true, productName: true, customerName: true, createdAt: true } as const;

  const [simple, detailed] = await Promise.all([
    type === "detailed"
      ? []
      : prisma.simpleQuotation.findMany({ where, select, orderBy: { createdAt: "desc" }, take: 50 }),
    type === "simple"
      ? []
      : prisma.detailedQuotation.findMany({ where, select, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const all = [
    ...simple.map((q) => ({ ...q, type: "일반견적서" })),
    ...detailed.map((q) => ({ ...q, type: "상세견적서" })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    count: all.length,
    shown: Math.min(all.length, MAX_RESULTS),
    message:
      all.length === 0
        ? "해당하는 견적서가 없습니다."
        : "내용이 필요하면 quotationNo 로 get_quotation 을 호출하세요.",
    quotations: all.slice(0, MAX_RESULTS).map((q) => ({
      quotationNo: q.quotationNo,
      type: q.type,
      productName: q.productName,
      customerName: q.customerName,
      date: ymd(q.createdAt),
    })),
  };
}

/** 견적번호 하나의 내용. 일반견적서는 setCount 를 주면 세트수를 바꿔 다시 계산한다. */
export async function getQuotation(args: { quotationNo: string; setCount?: number }): Promise<unknown> {
  const quotationNo = String(args.quotationNo ?? "").trim().toUpperCase();
  if (!quotationNo) return { found: false, message: "견적번호(quotationNo)가 필요합니다. search_quotations 로 먼저 찾으세요." };

  if (quotationNo.startsWith("DQ")) return getDetailed(quotationNo);
  const simple = await getSimple(quotationNo, toNumber(args.setCount));
  return simple ?? getDetailed(quotationNo);
}

async function getSimple(quotationNo: string, setCountOverride: number): Promise<unknown | null> {
  const q = await prisma.simpleQuotation.findUnique({ where: { quotationNo }, include: simpleQuotationInclude });
  if (!q) return null;

  const override = setCountOverride > 0 ? Math.round(setCountOverride) : 0;
  const calc = calculateSimpleQuotation({
    products: q.products.map((p) => ({
      name: p.name,
      processingCostPerUnit: p.productType?.processingCost || 0,
      subMaterialCostPerUnit: p.subMaterialCostPerUnit ?? 20,
      items: p.items,
      lines: p.lines.map((ln) => (override ? { ...ln, setCount: override } : ln)),
    })),
  });

  return {
    found: true,
    type: "일반견적서",
    quotationNo: q.quotationNo,
    date: ymd(q.createdAt),
    productName: q.productName,
    customerName: q.customerName,
    foodType: q.foodType,
    ...(override ? { recalculated: `모든 포장옵션의 세트수를 ${override.toLocaleString("ko-KR")}로 바꿔 다시 계산한 값입니다. 저장된 견적서는 바뀌지 않았습니다.` } : {}),
    // 택일이면 옵션 중 하나를 고르는 견적이라 합계가 의미 없다
    optionMode: q.sumOptions ? "합산(옵션 모두 생산)" : "택일(옵션 중 하나 선택 — 합계는 참고용)",
    products: q.products.map((p, pi) => {
      const r = calc.products[pi];
      return {
        name: p.name,
        productType: p.productType?.name,
        productSpec: p.productSpec,
        dosage: p.dosage,
        formulation: p.items.map((it) => ({
          material: it.materialName,
          role: it.role,
          mgPerUnit: it.theoryAmount,
          kgUnitPrice: won(it.kgUnitPrice),
          origin: it.origin || undefined,
        })),
        perUnit: {
          materialCost: r.materialCostPerUnit,
          subMaterialCost: r.subMaterialCostPerUnit,
          processingCost: r.processingCostPerUnit,
          total: r.perUnitCost,
        },
        options: r.lines.map((ln) => ({
          option: ln.displayLabel,
          packagingMethod: ln.packagingMethod,
          packageUnit: ln.packageUnit,
          bottleBoxCost: won(ln.bottleBoxCost),
          setCount: ln.setCount,
          unit: ln.unit,
          pricePerBox: won(ln.sellingUnitPrice),
          supplyAmount: won(ln.supplyAmount),
          vatAmount: won(ln.vatAmount),
        })),
      };
    }),
    total: { supplyAmountExVat: won(calc.supplyAmount), vatAmount: won(calc.vatAmount) },
    note: q.note || undefined,
  };
}

async function getDetailed(quotationNo: string): Promise<unknown> {
  const q = await prisma.detailedQuotation.findUnique({
    where: { quotationNo },
    include: {
      materials: { orderBy: { sortOrder: "asc" } },
      supplies: { orderBy: { sortOrder: "asc" } },
      processes: { orderBy: { sortOrder: "asc" } },
      overheads: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!q) return { found: false, message: `견적번호 ${quotationNo} 견적서가 없습니다. search_quotations 로 찾아보세요.` };

  const t = calculateDetailedQuotation(q);
  return {
    found: true,
    type: "상세견적서",
    quotationNo: q.quotationNo,
    date: ymd(q.createdAt),
    productName: q.productName,
    customerName: q.customerName,
    productType: q.productType,
    contentAmountG: q.contentAmount,
    packageUnit: q.packageUnit,
    packagingMethod: q.packagingMethod,
    intakeGuide: q.intakeGuide,
    productionQty: q.productionQty,
    caseQty: t.caseQty,
    status: q.status,
    materials: q.materials.map((m) => ({
      name: m.materialName,
      mixRatio: m.mixRatio,
      contentMg: m.contentMg,
      inputKg: m.inputKg,
      unitPrice: won(m.unitPrice),
      total: won(m.totalPrice),
    })),
    supplies: q.supplies.map((s) => ({ name: s.supplyName, inputQty: s.inputQty, unitPrice: s.unitPrice, total: won(s.totalPrice) })),
    processes: q.processes.map((p) => ({ name: p.processName, quantity: p.quantity, unitCost: p.unitCost, total: won(p.totalCost) })),
    overheads: q.overheads.map((o) => ({ name: o.name, amount: won(o.amount) })),
    totals: {
      materialCost: won(t.materialCost),
      supplyCost: won(t.supplyCost),
      processCost: won(t.processCost),
      overheadCost: won(t.overheadCost),
      costPerCase: won(t.costPerCase),
      profitRate: q.profitRate,
      profitPerCase: won(t.profitPerCase),
      pricePerCaseExVat: won(t.pricePerCaseExVat),
      unitPriceIncVat: won(t.finalUnitPrice),
      totalAmountExVat: won(t.totalAmountExVat),
      totalAmountIncVat: won(t.totalAmount),
    },
    note: q.note || undefined,
  };
}
