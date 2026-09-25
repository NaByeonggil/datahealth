/**
 * 원료 단가 이력 기록.
 *
 * 현재 단가는 MaterialPrice 에서 endDate 가 비어 있는 행이다(원료당 하나).
 * 단가를 고치면 열려 있던 행을 닫고 새 행을 연다 — 가공비(ProcessingCost)와 같은 방식이다.
 * Material.unitPrice 는 그 현재 행의 사본이라 둘을 항상 같은 트랜잭션에서 움직인다.
 *
 * 이력이 남아야 "이 견적 이후 단가가 바뀌었다"를 언제부터인지까지 말할 수 있다.
 */
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/** 단가가 같으면 이력을 만들지 않는다 — 이름만 고친 저장까지 이력에 쌓이면 못 읽는다 */
const isSamePrice = (a: number, b: number) => Math.abs(a - b) < 0.0001;

export interface PriceChangeInput {
  materialId: string;
  newPrice: number;
  /** 언제부터 적용되는 단가인가. 비우면 지금 */
  effectiveDate?: Date | null;
  changedBy?: string | null;
  changeReason?: string | null;
}

/**
 * 원료의 현재 단가 행을 닫고 새 행을 연다.
 * 단가가 그대로면 아무것도 하지 않고 false 를 돌려준다.
 * 호출하는 쪽에서 Material.unitPrice 도 함께 갱신해야 한다(같은 트랜잭션 안에서).
 */
export async function recordPriceChange(
  tx: Tx,
  { materialId, newPrice, effectiveDate, changedBy, changeReason }: PriceChangeInput
): Promise<boolean> {
  const current = await tx.materialPrice.findFirst({
    where: { materialId, endDate: null },
    orderBy: { effectiveDate: "desc" },
  });

  if (current && isSamePrice(current.price, newPrice)) return false;

  const at = effectiveDate ?? new Date();

  // 열려 있던 행을 모두 닫는다. 임포트로 여러 행이 열려 있을 수 있어 updateMany 를 쓴다.
  await tx.materialPrice.updateMany({
    where: { materialId, endDate: null },
    data: { endDate: at },
  });

  await tx.materialPrice.create({
    data: {
      materialId,
      price: newPrice,
      effectiveDate: at,
      changedBy: changedBy || "관리자",
      changeReason: changeReason || null,
    },
  });

  return true;
}

/** 신규 원료 등록 시 첫 단가 행을 연다 */
export async function openInitialPrice(
  tx: Tx,
  { materialId, newPrice, effectiveDate, changedBy }: PriceChangeInput
) {
  await tx.materialPrice.create({
    data: {
      materialId,
      price: newPrice,
      effectiveDate: effectiveDate ?? new Date(),
      changedBy: changedBy || "관리자",
      changeReason: "신규 등록",
    },
  });
}
