import { create } from "zustand";
import { SimpleQuotationItemType } from "@/types/quotation";

interface SimpleQuotationState {
  quotationNo: string;
  productName: string;
  customerName: string;
  productTypeId: string;
  processingCostPerUnit: number;
  packageUnit: number;
  bottleBoxCost: number;
  setCount: number;
  note: string;
  items: SimpleQuotationItemType[];
}

interface SimpleQuotationActions {
  setField: (field: keyof SimpleQuotationState, value: unknown) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, field: keyof SimpleQuotationItemType, value: unknown) => void;
  reset: () => void;
}

const defaultSimpleState: SimpleQuotationState = {
  quotationNo: "",
  productName: "",
  customerName: "",
  productTypeId: "",
  processingCostPerUnit: 0,
  packageUnit: 0,
  bottleBoxCost: 0,
  setCount: 1,
  note: "",
  items: [],
};

const createEmptyItem = (sortOrder: number): SimpleQuotationItemType => ({
  sortOrder,
  category: "일반식품",
  materialName: "",
  theoryAmount: 0,
  actualAmount: 0,
  kgUnitPrice: 0,
  materialCost: 0,
  origin: "",
});

export const useSimpleQuotationStore = create<SimpleQuotationState & SimpleQuotationActions>(
  (set) => ({
    ...defaultSimpleState,
    setField: (field, value) => set({ [field]: value }),
    addItem: () =>
      set((state) => ({
        items: [...state.items, createEmptyItem(state.items.length + 1)],
      })),
    removeItem: (index) =>
      set((state) => ({
        items: state.items
          .filter((_, i) => i !== index)
          .map((item, i) => ({ ...item, sortOrder: i + 1 })),
      })),
    updateItem: (index, field, value) =>
      set((state) => {
        const items = [...state.items];
        const item = { ...items[index], [field]: value };
        // 자동 계산
        if (field === "theoryAmount") {
          item.actualAmount = Number(value) / 1000;
          item.materialCost = item.actualAmount * item.kgUnitPrice / 1000;
        }
        if (field === "kgUnitPrice") {
          item.materialCost = item.actualAmount * Number(value) / 1000;
        }
        items[index] = item;
        return { items };
      }),
    reset: () => set(defaultSimpleState),
  })
);
