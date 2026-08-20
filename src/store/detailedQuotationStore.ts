import { create } from "zustand";
import {
  DetailedMaterialItemType,
  DetailedSupplyItemType,
  DetailedProcessItemType,
  DetailedOverheadItemType,
  DetailedQuotationType,
} from "@/types/quotation";
import {
  calcTotalWeight,
  recalcMaterialRow,
  recalcSupplyRow,
  recalcProcessRow,
  num,
  DEFAULT_LOSS_RATE,
  DEFAULT_VAT_RATE,
  DEFAULT_PROFIT_RATE,
} from "@/lib/quotation/calculateDetailed";

export interface DetailedQuotationState {
  id: string | null;
  quotationNo: string;
  productName: string;
  customerName: string;
  customerId: string | null;
  productType: string;
  formType: string;
  contentAmount: number;
  packageUnit: number;
  intakeGuide: string;
  productionQty: number;
  lossRate: number;
  yieldRate: number;
  caseQty: number;
  packagingMethod: string;
  profitRate: number;
  vatRate: number;
  finalUnitPrice: number;
  status: "draft" | "confirmed" | "closed";
  validUntil: string;
  note: string;
  materials: DetailedMaterialItemType[];
  supplies: DetailedSupplyItemType[];
  processes: DetailedProcessItemType[];
  overheads: DetailedOverheadItemType[];
}

/** 값이 바뀌면 원료 행의 배합비/투입량이 다시 계산돼야 하는 필드 */
const WEIGHT_FIELDS = ["contentAmount", "productionQty", "lossRate"] as const;

/** 문자열이 들어와도 숫자로 강제하는 필드 (DB Float/Int 컬럼) */
const NUMERIC_FIELDS: (keyof DetailedQuotationState)[] = [
  "contentAmount",
  "packageUnit",
  "productionQty",
  "lossRate",
  "yieldRate",
  "caseQty",
  "profitRate",
  "vatRate",
  "finalUnitPrice",
];

interface DetailedQuotationActions {
  setField: <K extends keyof DetailedQuotationState>(
    field: K,
    value: DetailedQuotationState[K] | string | number
  ) => void;

  addMaterial: () => void;
  removeMaterial: (index: number) => void;
  updateMaterial: (
    index: number,
    field: keyof DetailedMaterialItemType,
    value: unknown
  ) => void;

  addSupply: () => void;
  removeSupply: (index: number) => void;
  updateSupply: (index: number, field: keyof DetailedSupplyItemType, value: unknown) => void;

  addProcess: () => void;
  removeProcess: (index: number) => void;
  updateProcess: (index: number, field: keyof DetailedProcessItemType, value: unknown) => void;
  applyCaseQtyToProcesses: () => void;

  addOverhead: () => void;
  removeOverhead: (index: number) => void;
  updateOverhead: (index: number, field: keyof DetailedOverheadItemType, value: unknown) => void;

  loadQuotation: (data: DetailedQuotationType) => void;
  reset: () => void;
}

const defaultState: DetailedQuotationState = {
  id: null,
  quotationNo: "",
  productName: "",
  customerName: "",
  customerId: null,
  productType: "",
  formType: "",
  contentAmount: 0,
  packageUnit: 0,
  intakeGuide: "",
  productionQty: 0,
  lossRate: DEFAULT_LOSS_RATE,
  yieldRate: 95,
  caseQty: 0,
  packagingMethod: "",
  profitRate: DEFAULT_PROFIT_RATE,
  vatRate: DEFAULT_VAT_RATE,
  finalUnitPrice: 0,
  status: "draft",
  validUntil: "",
  note: "",
  materials: [],
  supplies: [
    { sortOrder: 1, supplyName: "스틱필름", quantity: 0, inputQty: 0, unitPrice: 0, totalPrice: 0 },
    { sortOrder: 2, supplyName: "케이스(단상자)", quantity: 0, inputQty: 0, unitPrice: 0, totalPrice: 0 },
    { sortOrder: 3, supplyName: "카톤", quantity: 0, inputQty: 0, unitPrice: 0, totalPrice: 0 },
    { sortOrder: 4, supplyName: "마감스티커", quantity: 0, inputQty: 0, unitPrice: 0, totalPrice: 0 },
  ],
  processes: [
    { sortOrder: 1, processName: "칭량", quantity: 0, unitCost: 0, totalCost: 0 },
    { sortOrder: 2, processName: "혼합", quantity: 0, unitCost: 0, totalCost: 0 },
    { sortOrder: 3, processName: "충진", quantity: 0, unitCost: 0, totalCost: 0 },
    { sortOrder: 4, processName: "종합포장", quantity: 0, unitCost: 0, totalCost: 0 },
    { sortOrder: 5, processName: "검사", quantity: 0, unitCost: 0, totalCost: 0 },
  ],
  overheads: [
    { sortOrder: 1, name: "검사비", amount: 250000 },
    { sortOrder: 2, name: "관리비", amount: 150000 },
    { sortOrder: 3, name: "운반비", amount: 300000 },
    { sortOrder: 4, name: "디자인비용", amount: 0 },
    {
      sortOrder: 5,
      name: "1회성비용",
      amount: 0,
      note: "영양성분검사비, 기준규격검사비, 품목신고비용, 광고심의비용, 동판비 등",
    },
  ],
};

const reindex = <T extends { sortOrder: number }>(rows: T[]): T[] =>
  rows.map((r, i) => ({ ...r, sortOrder: i + 1 }));

/** 총중량이 바뀌면 모든 원료 행의 배합비/투입량/금액을 다시 계산한다 */
const recalcMaterials = (s: DetailedQuotationState): DetailedMaterialItemType[] => {
  const totalWeight = calcTotalWeight(s.contentAmount, s.productionQty, s.lossRate);
  return s.materials.map((m) =>
    recalcMaterialRow(m, { contentAmount: s.contentAmount, totalWeight })
  );
};

export const useDetailedQuotationStore = create<
  DetailedQuotationState & DetailedQuotationActions
>((set) => ({
  ...defaultState,

  setField: (field, value) =>
    set((s) => {
      const coerced = NUMERIC_FIELDS.includes(field) ? num(value) : value;
      const next = { ...s, [field]: coerced } as DetailedQuotationState;
      if ((WEIGHT_FIELDS as readonly string[]).includes(field as string)) {
        next.materials = recalcMaterials(next);
      }
      return next;
    }),

  addMaterial: () =>
    set((s) => ({
      materials: [
        ...s.materials,
        {
          sortOrder: s.materials.length + 1,
          materialId: null,
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
    set((s) => ({ materials: reindex(s.materials.filter((_, i) => i !== index)) })),

  updateMaterial: (index, field, value) =>
    set((s) => {
      const materials = [...s.materials];
      const numeric = ["mixRatio", "contentMg", "inputKg", "unitPrice"].includes(field);
      const row = { ...materials[index], [field]: numeric ? num(value) : value };
      const totalWeight = calcTotalWeight(s.contentAmount, s.productionQty, s.lossRate);
      materials[index] = recalcMaterialRow(
        row,
        { contentAmount: s.contentAmount, totalWeight },
        field as "mixRatio" | "contentMg" | "inputKg" | "unitPrice"
      );
      return { materials };
    }),

  addSupply: () =>
    set((s) => ({
      supplies: [
        ...s.supplies,
        {
          sortOrder: s.supplies.length + 1,
          supplyId: null,
          supplyName: "",
          quantity: 0,
          inputQty: 0,
          unitPrice: 0,
          totalPrice: 0,
        },
      ],
    })),

  removeSupply: (index) =>
    set((s) => ({ supplies: reindex(s.supplies.filter((_, i) => i !== index)) })),

  updateSupply: (index, field, value) =>
    set((s) => {
      const supplies = [...s.supplies];
      const numeric = ["quantity", "inputQty", "unitPrice"].includes(field);
      supplies[index] = recalcSupplyRow({
        ...supplies[index],
        [field]: numeric ? num(value) : value,
      });
      return { supplies };
    }),

  addProcess: () =>
    set((s) => ({
      processes: [
        ...s.processes,
        {
          sortOrder: s.processes.length + 1,
          processId: null,
          processName: "",
          quantity: s.caseQty || 0,
          unitCost: 0,
          totalCost: 0,
        },
      ],
    })),

  removeProcess: (index) =>
    set((s) => ({ processes: reindex(s.processes.filter((_, i) => i !== index)) })),

  updateProcess: (index, field, value) =>
    set((s) => {
      const processes = [...s.processes];
      const numeric = ["quantity", "unitCost"].includes(field);
      processes[index] = recalcProcessRow({
        ...processes[index],
        [field]: numeric ? num(value) : value,
      });
      return { processes };
    }),

  /** 공정 수량을 실제수량(case)으로 일괄 채운다 — 엑셀 E35 = F6 */
  applyCaseQtyToProcesses: () =>
    set((s) => ({
      processes: s.processes.map((p) =>
        recalcProcessRow({ ...p, quantity: s.caseQty })
      ),
    })),

  addOverhead: () =>
    set((s) => ({
      overheads: [...s.overheads, { sortOrder: s.overheads.length + 1, name: "", amount: 0 }],
    })),

  removeOverhead: (index) =>
    set((s) => ({ overheads: reindex(s.overheads.filter((_, i) => i !== index)) })),

  updateOverhead: (index, field, value) =>
    set((s) => {
      const overheads = [...s.overheads];
      overheads[index] = {
        ...overheads[index],
        [field]: field === "amount" ? num(value) : value,
      };
      return { overheads };
    }),

  loadQuotation: (data) =>
    set(() => ({
      id: data.id ?? null,
      quotationNo: data.quotationNo || "",
      productName: data.productName || "",
      customerName: data.customerName || "",
      customerId: data.customerId ?? null,
      productType: data.productType || "",
      formType: data.formType || "",
      contentAmount: num(data.contentAmount),
      packageUnit: num(data.packageUnit),
      intakeGuide: data.intakeGuide || "",
      productionQty: num(data.productionQty),
      lossRate: num(data.lossRate) || DEFAULT_LOSS_RATE,
      yieldRate: num(data.yieldRate),
      caseQty: num(data.caseQty),
      packagingMethod: data.packagingMethod || "",
      profitRate: num(data.profitRate),
      vatRate: num(data.vatRate) || DEFAULT_VAT_RATE,
      finalUnitPrice: num(data.finalUnitPrice),
      status: (data.status as DetailedQuotationState["status"]) || "draft",
      validUntil: data.validUntil ? String(data.validUntil).slice(0, 10) : "",
      note: data.note || "",
      materials: data.materials || [],
      supplies: data.supplies || [],
      processes: data.processes || [],
      overheads: data.overheads || [],
    })),

  reset: () => set(defaultState),
}));
