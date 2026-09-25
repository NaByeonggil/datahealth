/**
 * 배합 템플릿 ↔ 견적서 배합 변환.
 *
 * 템플릿은 "무엇을 얼마나 넣는가"만 갖는다. 단가는 견적서에 얹는 순간
 * 원료 마스터에서 그때의 값을 다시 읽어 넣는다 — 그렇게 견적서 행에 복사된 값이
 * 곧 발행 시점 스냅샷이 된다. (템플릿에 단가를 굳혀두면 옛 단가가 계속 따라온다)
 */
import { SimpleQuotationItemType } from "@/types/quotation";

/** 템플릿 항목 — API 응답 형태 (material 은 include 로 함께 온다) */
export interface TemplateItemLike {
  sortOrder: number;
  category: string;
  role: string;
  materialId?: string | null;
  materialName: string;
  theoryAmount: number;
  origin?: string | null;
  refUnitPrice: number;
  note?: string | null;
  material?: {
    id: string;
    name: string;
    unitPrice: number;
    origin?: string | null;
    isActive: boolean;
  } | null;
}

export interface FormulationTemplateLike {
  id: string;
  name: string;
  productTypeId?: string | null;
  productSpec?: string | null;
  dosage?: string | null;
  subMaterialCostPerUnit?: number | null;
  note?: string | null;
  usageCount: number;
  lastUsedAt?: string | null;
  items: TemplateItemLike[];
  productType?: { id: string; name: string; formCode?: string | null } | null;
}

/** 이론량(mg) → 실투입량·원료비. 견적서 폼의 자동계산과 같은 식을 쓴다. */
export function calcItemAmounts(theoryAmount: number, kgUnitPrice: number) {
  const actualAmount = theoryAmount / 1000;
  return { actualAmount, materialCost: (actualAmount * kgUnitPrice) / 1000 };
}

/** 템플릿 항목 한 줄을 적용했을 때 어떤 단가가 쓰이는지 */
export interface ResolvedTemplateItem {
  item: SimpleQuotationItemType;
  /** 마스터에서 현재 단가를 읽어왔는가 (false = 참고 단가 사용) */
  fromMaster: boolean;
  /** 템플릿 저장 시점의 참고 단가 */
  refUnitPrice: number;
  /** 마스터 단가가 저장 시점과 달라졌는가 — 적용 전에 알려줄 값 */
  priceChanged: boolean;
  /** 연결된 원료가 마스터에서 비활성 처리됐는가 */
  materialInactive: boolean;
}

/**
 * 템플릿을 견적서 배합 행으로 바꾼다.
 * 마스터에 연결된 원료는 현재 단가를, 수기 입력 원료는 참고 단가를 쓴다.
 */
export function resolveTemplateItems(
  items: TemplateItemLike[]
): ResolvedTemplateItem[] {
  return [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t, i) => {
      const master = t.material ?? null;
      const fromMaster = Boolean(master);
      const kgUnitPrice = master ? master.unitPrice : t.refUnitPrice;
      const { actualAmount, materialCost } = calcItemAmounts(
        t.theoryAmount,
        kgUnitPrice
      );

      return {
        item: {
          sortOrder: i + 1,
          category: t.category,
          role: t.role,
          materialName: t.materialName,
          theoryAmount: t.theoryAmount,
          actualAmount,
          kgUnitPrice,
          materialCost,
          origin: t.origin ?? master?.origin ?? "",
        },
        fromMaster,
        refUnitPrice: t.refUnitPrice,
        priceChanged:
          fromMaster && t.refUnitPrice > 0 && master!.unitPrice !== t.refUnitPrice,
        materialInactive: fromMaster && master!.isActive === false,
      };
    });
}

/** 템플릿의 대표 원료 — 목록에서 한 줄로 보여줄 요약 */
export function summarizeTemplateItems(items: TemplateItemLike[], max = 3): string {
  const main = items.filter((i) => i.role === "주원료");
  const pick = (main.length > 0 ? main : items).slice(0, max);
  const rest = (main.length > 0 ? main : items).length - pick.length;
  const names = pick.map((i) => i.materialName).filter(Boolean).join(", ");
  return rest > 0 ? `${names} 외 ${rest}종` : names;
}
