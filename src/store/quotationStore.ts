import { create } from "zustand";
import { SimpleQuotationItemType } from "@/types/quotation";
import { SimpleQuotationLineInput } from "@/lib/quotation/calculateSimple";
import { buildPackagingMethod, isAutoPackagingMethod } from "@/lib/quotation/packagingMethod";

/** 견적서에 담기는 제품 하나 — 제형·배합·포장옵션을 따로 갖는다 */
export interface QuotationProductState {
  name: string;
  productTypeId: string;
  /** 제형 정보 — 포장방법 자동 표기에 쓴다 */
  processingCostPerUnit: number;
  productFormCode: string;
  productTypeName: string;
  productCategory: string;
  subMaterialCostPerUnit: number;
  productSpec: string;
  dosage: string;
  items: SimpleQuotationItemType[];
  lines: SimpleQuotationLineInput[];
}

interface SimpleQuotationState {
  quotationNo: string;
  productName: string;
  customerName: string;
  note: string;
  // 견적서 양식용
  customerContact: string;
  customerPhone: string;
  customerFax: string;
  validDays: number;
  deliveryTerms: string;
  paymentTerms: string;
  /** 식품유형 — 건강기능식품 / 기타가공품 … (특기사항 조건 분기) */
  foodType: string;
  /** 포장 옵션을 모두 발주하는가. false=택일(합계 없음), true=합산 */
  sumOptions: boolean;
  products: QuotationProductState[];
}

/** 저장된 견적서(API 응답) — 수정 화면에서 폼으로 되돌릴 때 쓰는 형태 */
export interface LoadedQuotation {
  quotationNo?: string | null;
  productName?: string | null;
  customerName?: string | null;
  note?: string | null;
  customerContact?: string | null;
  customerPhone?: string | null;
  customerFax?: string | null;
  validDays?: number | null;
  deliveryTerms?: string | null;
  paymentTerms?: string | null;
  foodType?: string | null;
  sumOptions?: boolean | null;
  products?: {
    name?: string | null;
    productTypeId?: string | null;
    subMaterialCostPerUnit?: number | null;
    productSpec?: string | null;
    dosage?: string | null;
    productType?: {
      name?: string | null;
      formCode?: string | null;
      category?: string | null;
      processingCost?: number | null;
    } | null;
    items?: Partial<SimpleQuotationItemType>[] | null;
    lines?: Partial<SimpleQuotationLineInput>[] | null;
  }[] | null;
}

interface SimpleQuotationActions {
  setField: (field: keyof SimpleQuotationState, value: unknown) => void;
  /** 저장된 견적서를 폼 상태로 되돌린다 (수정 화면) */
  load: (q: LoadedQuotation) => void;
  // 제품
  addProduct: () => void;
  removeProduct: (pi: number) => void;
  setProductField: (pi: number, field: keyof QuotationProductState, value: unknown) => void;
  /** 제형이 바뀌면 그 제품의 자동 포장방법을 다시 쓴다 */
  syncPackagingMethods: (pi: number) => void;
  // 배합
  addItem: (pi: number) => void;
  removeItem: (pi: number, index: number) => void;
  updateItem: (pi: number, index: number, field: keyof SimpleQuotationItemType, value: unknown) => void;
  // 포장옵션
  addLine: (pi: number) => void;
  removeLine: (pi: number, index: number) => void;
  updateLine: (pi: number, index: number, field: keyof SimpleQuotationLineInput, value: unknown) => void;
  reset: () => void;
}

const emptyLine = (): SimpleQuotationLineInput => ({
  label: "", packageUnit: 0, bottleBoxCost: 0, setCount: 1, packagingMethod: "", unit: "박스",
});

const emptyProduct = (): QuotationProductState => ({
  name: "", productTypeId: "",
  processingCostPerUnit: 0, productFormCode: "", productTypeName: "", productCategory: "",
  subMaterialCostPerUnit: 20, productSpec: "", dosage: "",
  items: [],
  lines: [emptyLine()],
});

const defaultSimpleState: SimpleQuotationState = {
  quotationNo: "",
  productName: "",
  customerName: "",
  note: "",
  customerContact: "",
  customerPhone: "",
  customerFax: "",
  validDays: 30,
  deliveryTerms: "",
  paymentTerms: "",
  foodType: "건강기능식품",
  sumOptions: false,
  products: [emptyProduct()],
};

const createEmptyItem = (sortOrder: number): SimpleQuotationItemType => ({
  sortOrder,
  category: "일반식품",
  role: "주원료",
  materialName: "",
  theoryAmount: 0,
  actualAmount: 0,
  kgUnitPrice: 0,
  materialCost: 0,
  origin: "",
});

/** 특정 제품만 바꾼 새 배열을 만든다 */
function patchProduct(
  products: QuotationProductState[],
  pi: number,
  fn: (p: QuotationProductState) => QuotationProductState
): QuotationProductState[] {
  const next = [...products];
  if (!next[pi]) return next;
  next[pi] = fn(next[pi]);
  return next;
}

export const useSimpleQuotationStore = create<SimpleQuotationState & SimpleQuotationActions>(
  (set) => ({
    ...defaultSimpleState,
    setField: (field, value) => set({ [field]: value }),

    load: (q) =>
      set({
        quotationNo: q.quotationNo ?? "",
        productName: q.productName ?? "",
        customerName: q.customerName ?? "",
        note: q.note ?? "",
        customerContact: q.customerContact ?? "",
        customerPhone: q.customerPhone ?? "",
        customerFax: q.customerFax ?? "",
        validDays: q.validDays ?? 30,
        deliveryTerms: q.deliveryTerms ?? "",
        paymentTerms: q.paymentTerms ?? "",
        foodType: q.foodType ?? "건강기능식품",
        sumOptions: q.sumOptions === true,
        products:
          (q.products ?? []).length > 0
            ? (q.products ?? []).map((p) => ({
                name: p.name ?? "",
                productTypeId: p.productTypeId ?? "",
                // 제형 정보는 마스터에서 함께 받아온 값을 그대로 쓴다
                processingCostPerUnit: p.productType?.processingCost ?? 0,
                productFormCode: p.productType?.formCode ?? "",
                productTypeName: p.productType?.name ?? "",
                productCategory: p.productType?.category ?? "",
                subMaterialCostPerUnit: p.subMaterialCostPerUnit ?? 20,
                productSpec: p.productSpec ?? "",
                dosage: p.dosage ?? "",
                items: (p.items ?? []).map((it, i) => ({
                  sortOrder: i + 1,
                  category: it.category ?? "일반식품",
                  role: it.role ?? "주원료",
                  materialName: it.materialName ?? "",
                  theoryAmount: it.theoryAmount ?? 0,
                  actualAmount: it.actualAmount ?? 0,
                  kgUnitPrice: it.kgUnitPrice ?? 0,
                  materialCost: it.materialCost ?? 0,
                  origin: it.origin ?? "",
                })),
                lines:
                  (p.lines ?? []).length > 0
                    ? (p.lines ?? []).map((ln) => ({
                        label: ln.label ?? "",
                        packageUnit: ln.packageUnit ?? 0,
                        bottleBoxCost: ln.bottleBoxCost ?? 0,
                        setCount: ln.setCount ?? 1,
                        packagingMethod: ln.packagingMethod ?? "",
                        unit: ln.unit ?? "박스",
                      }))
                    : [emptyLine()],
              }))
            : [emptyProduct()],
      }),

    addProduct: () => set((s) => ({ products: [...s.products, emptyProduct()] })),
    removeProduct: (pi) =>
      set((s) => ({
        // 제품은 최소 하나 남긴다
        products: s.products.length <= 1 ? s.products : s.products.filter((_, i) => i !== pi),
      })),
    setProductField: (pi, field, value) =>
      set((s) => ({ products: patchProduct(s.products, pi, (p) => ({ ...p, [field]: value })) })),

    syncPackagingMethods: (pi) =>
      set((s) => ({
        products: patchProduct(s.products, pi, (p) => ({
          ...p,
          lines: p.lines.map((ln) => {
            const prev = (ln.packagingMethod ?? "").trim();
            // 수동으로 쓴 값은 그대로 둔다
            if (prev && !isAutoPackagingMethod(prev)) return ln;
            return {
              ...ln,
              packagingMethod: buildPackagingMethod(
                ln.packageUnit, p.productFormCode, p.productTypeName, p.productCategory
              ),
            };
          }),
        })),
      })),

    addItem: (pi) =>
      set((s) => ({
        products: patchProduct(s.products, pi, (p) => ({
          ...p, items: [...p.items, createEmptyItem(p.items.length + 1)],
        })),
      })),
    removeItem: (pi, index) =>
      set((s) => ({
        products: patchProduct(s.products, pi, (p) => ({
          ...p,
          items: p.items.filter((_, i) => i !== index).map((it, i) => ({ ...it, sortOrder: i + 1 })),
        })),
      })),
    updateItem: (pi, index, field, value) =>
      set((s) => ({
        products: patchProduct(s.products, pi, (p) => {
          const items = [...p.items];
          const item = { ...items[index], [field]: value };
          // 자동 계산
          if (field === "theoryAmount") {
            item.actualAmount = Number(value) / 1000;
            item.materialCost = (item.actualAmount * item.kgUnitPrice) / 1000;
          }
          if (field === "kgUnitPrice") {
            item.materialCost = (item.actualAmount * Number(value)) / 1000;
          }
          items[index] = item;
          return { ...p, items };
        }),
      })),

    addLine: (pi) =>
      set((s) => ({
        products: patchProduct(s.products, pi, (p) => ({ ...p, lines: [...p.lines, emptyLine()] })),
      })),
    removeLine: (pi, index) =>
      set((s) => ({
        products: patchProduct(s.products, pi, (p) => ({
          ...p,
          lines: p.lines.length <= 1 ? p.lines : p.lines.filter((_, i) => i !== index),
        })),
      })),
    updateLine: (pi, index, field, value) =>
      set((s) => ({
        products: patchProduct(s.products, pi, (p) => {
          const lines = [...p.lines];
          const next = { ...lines[index], [field]: value };
          // 포장단위를 바꾸면 포장방법을 제형에 맞춰 따라 맞춘다(수동값은 보존)
          if (field === "packageUnit") {
            const prev = (lines[index].packagingMethod ?? "").trim();
            if (!prev || isAutoPackagingMethod(prev)) {
              next.packagingMethod = buildPackagingMethod(
                Number(value), p.productFormCode, p.productTypeName, p.productCategory
              );
            }
          }
          lines[index] = next;
          return { ...p, lines };
        }),
      })),

    reset: () => set(defaultSimpleState),
  })
);
