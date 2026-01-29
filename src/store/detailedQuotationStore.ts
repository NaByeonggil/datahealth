import { create } from "zustand";
import {
  DetailedMaterialItemType,
  DetailedSupplyItemType,
  DetailedProcessItemType,
} from "@/types/quotation";

interface DetailedQuotationState {
  quotationNo: string;
  productName: string;
  customerName: string;
  productType: string;
  formType: string;
  contentAmount: number;
  packageUnit: number;
  intakeGuide: string;
  productionQty: number;
  unitWeight: number;
  totalWeight: number;
  yieldRate: number;
  actualQty: number;
  packagingMethod: string;
  inspectionCost: number;
  managementCost: number;
  deliveryCost: number;
  designCost: number;
  onetimeCost: number;
  profitRate: number;
  note: string;
  materials: DetailedMaterialItemType[];
  supplies: DetailedSupplyItemType[];
  processes: DetailedProcessItemType[];
}

interface DetailedQuotationActions {
  setField: (field: keyof DetailedQuotationState, value: unknown) => void;
  addMaterial: () => void;
  removeMaterial: (index: number) => void;
  updateMaterial: (index: number, field: keyof DetailedMaterialItemType, value: unknown) => void;
  addSupply: () => void;
  removeSupply: (index: number) => void;
  updateSupply: (index: number, field: keyof DetailedSupplyItemType, value: unknown) => void;
  addProcess: () => void;
  removeProcess: (index: number) => void;
  updateProcess: (index: number, field: keyof DetailedProcessItemType, value: unknown) => void;
  reset: () => void;
}

const defaultState: DetailedQuotationState = {
  quotationNo: "",
  productName: "",
  customerName: "",
  productType: "",
  formType: "",
  contentAmount: 0,
  packageUnit: 0,
  intakeGuide: "",
  productionQty: 0,
  unitWeight: 0,
  totalWeight: 0,
  yieldRate: 100,
  actualQty: 0,
  packagingMethod: "",
  inspectionCost: 250000,
  managementCost: 150000,
  deliveryCost: 300000,
  designCost: 0,
  onetimeCost: 0,
  profitRate: 5,
  note: "",
  materials: [],
  supplies: [
    { sortOrder: 1, supplyName: "스틱필름", specification: "", quantity: 1, inputQty: 6, unitPrice: 280000, totalPrice: 1 * 6 * 280000 },
    { sortOrder: 2, supplyName: "단케이스", specification: "", quantity: 1, inputQty: 2000, unitPrice: 500, totalPrice: 1 * 2000 * 500 },
    { sortOrder: 3, supplyName: "마감스티커", specification: "", quantity: 1, inputQty: 2000, unitPrice: 10, totalPrice: 1 * 2000 * 10 },
    { sortOrder: 4, supplyName: "카톤", specification: "", quantity: 1, inputQty: 100, unitPrice: 2000, totalPrice: 1 * 100 * 2000 },
  ],
  processes: [
    { sortOrder: 1, processName: "공정세트", quantity: 2000, unitCost: 3000, totalCost: 2000 * 3000 },
  ],
};

export const useDetailedQuotationStore = create<DetailedQuotationState & DetailedQuotationActions>(
  (set) => ({
    ...defaultState,
    setField: (field, value) => set({ [field]: value }),

    addMaterial: () =>
      set((s) => ({
        materials: [
          ...s.materials,
          {
            sortOrder: s.materials.length + 1,
            materialName: "",
            mixRatio: 0,
            contentMg: 0,
            inputKg: 0,
            unitPrice: 0,
            totalPrice: 0,
          },
        ],
      })),
    removeMaterial: (index) =>
      set((s) => ({
        materials: s.materials
          .filter((_, i) => i !== index)
          .map((m, i) => ({ ...m, sortOrder: i + 1 })),
      })),
    updateMaterial: (index, field, value) =>
      set((s) => {
        const materials = [...s.materials];
        const item = { ...materials[index], [field]: value };
        if (field === "inputKg" || field === "unitPrice") {
          item.totalPrice = item.inputKg * item.unitPrice;
        }
        materials[index] = item;
        return { materials };
      }),

    addSupply: () =>
      set((s) => ({
        supplies: [
          ...s.supplies,
          {
            sortOrder: s.supplies.length + 1,
            supplyName: "",
            quantity: 0,
            inputQty: 0,
            unitPrice: 0,
            totalPrice: 0,
          },
        ],
      })),
    removeSupply: (index) =>
      set((s) => ({
        supplies: s.supplies
          .filter((_, i) => i !== index)
          .map((m, i) => ({ ...m, sortOrder: i + 1 })),
      })),
    updateSupply: (index, field, value) =>
      set((s) => {
        const supplies = [...s.supplies];
        const item = { ...supplies[index], [field]: value };
        if (field === "quantity" || field === "inputQty" || field === "unitPrice") {
          item.totalPrice = item.quantity * item.inputQty * item.unitPrice;
        }
        supplies[index] = item;
        return { supplies };
      }),

    addProcess: () =>
      set((s) => ({
        processes: [
          ...s.processes,
          {
            sortOrder: s.processes.length + 1,
            processName: "",
            quantity: 0,
            unitCost: 0,
            totalCost: 0,
          },
        ],
      })),
    removeProcess: (index) =>
      set((s) => ({
        processes: s.processes
          .filter((_, i) => i !== index)
          .map((m, i) => ({ ...m, sortOrder: i + 1 })),
      })),
    updateProcess: (index, field, value) =>
      set((s) => {
        const processes = [...s.processes];
        const item = { ...processes[index], [field]: value };
        if (field === "quantity" || field === "unitCost") {
          item.totalCost = item.quantity * item.unitCost;
        }
        processes[index] = item;
        return { processes };
      }),

    reset: () => set(defaultState),
  })
);
