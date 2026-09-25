/**
 * 견적서 → 단가 대조용 입력(DriftSource) 변환.
 *
 * costFactor 는 "단가 × 이 값 = 이 줄의 금액" 이 되도록 각 견적서의 원래 산식에서 뽑는다.
 *   일반견적서  materialCost = actualAmount × kgUnitPrice / 1000  → factor = actualAmount / 1000
 *   상세견적서  totalPrice   = inputKg × unitPrice                → factor = inputKg
 * 그래야 영향액이 견적서에 찍힌 금액과 같은 단위로 나온다.
 */
import type { DriftSource } from "./priceDrift";

interface SimpleLike {
  products: {
    sortOrder: number;
    name: string;
    items: {
      sortOrder: number;
      materialId: string | null;
      materialName: string;
      actualAmount: number;
      kgUnitPrice: number;
    }[];
  }[];
}

interface DetailedLike {
  materials: {
    sortOrder: number;
    materialId: string | null;
    materialName: string;
    inputKg: number;
    unitPrice: number;
  }[];
}

export function simpleDriftSources(q: SimpleLike): DriftSource[] {
  return q.products.flatMap((p) =>
    p.items
      .filter((i) => i.materialName.trim())
      .map((i) => ({
        location: `${p.name || `제품 ${p.sortOrder}`} · ${i.sortOrder}행`,
        materialId: i.materialId,
        materialName: i.materialName,
        quotedPrice: i.kgUnitPrice,
        costFactor: i.actualAmount / 1000,
      }))
  );
}

export function detailedDriftSources(q: DetailedLike): DriftSource[] {
  return q.materials
    .filter((m) => m.materialName.trim())
    .map((m) => ({
      location: `${m.sortOrder}행`,
      materialId: m.materialId,
      materialName: m.materialName,
      quotedPrice: m.unitPrice,
      costFactor: m.inputKg,
    }));
}
