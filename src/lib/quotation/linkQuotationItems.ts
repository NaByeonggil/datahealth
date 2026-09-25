/**
 * 저장 직전 견적서 배합 행을 원료 마스터에 이어 붙인다.
 *
 * 화면에서 마스터를 골랐으면 materialId 가 이미 있고, 수기로 친 행이나 예전에
 * 저장된 견적서를 다시 저장하는 경우에만 이름으로 잇는다.
 * 이 연결은 금액에 전혀 영향을 주지 않는다 — 단가 스냅샷은 그대로 두고,
 * 발행 이후 마스터 단가가 움직였는지 대조할 때만 쓴다.
 */
import { linkMaterialsByName } from "@/lib/materials/linkByName";

type ProductCreate = {
  items: { create: { materialId: string | null; materialName: string }[] };
};

export async function linkQuotationProducts<T extends ProductCreate>(products: T[]): Promise<T[]> {
  // 견적서 전체 행을 한 번에 조회한다(제품마다 질의하지 않는다)
  const flat = products.flatMap((p) => p.items.create);
  if (flat.length === 0) return products;

  const linked = await linkMaterialsByName(flat);

  let cursor = 0;
  return products.map((p) => ({
    ...p,
    items: { create: p.items.create.map(() => linked[cursor++]) },
  }));
}
