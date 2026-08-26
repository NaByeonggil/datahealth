export interface ProductTypeType {
  id: string;
  code: string;
  name: string;
  /// 제형 코드 — TABLET, POWDER_STICK, VIAL … (일부 유형은 비어 있음)
  formCode?: string | null;
  /// 고형 / 액상 / 젤리 / 용기형 / 융복합
  category?: string | null;
  processingCost: number;
  sortOrder: number;
  isActive: boolean;
  description?: string | null;
}

export interface SupplierType {
  id: string;
  code: string;
  name: string;
  contact?: string | null;
  manager?: string | null;
  isActive: boolean;
}

export interface MaterialType {
  id: string;
  supplierId: string;
  code: string;
  name: string;
  category: string;
  origin?: string | null;
  specification?: string | null;
  unit: string;
  unitPrice: number;
  isActive: boolean;
  supplier?: SupplierType;
}

export interface SimpleQuotationItemType {
  id?: string;
  sortOrder: number;
  category: string;
  /** 주원료 / 부원료 */
  role: string;
  materialName: string;
  theoryAmount: number;
  actualAmount: number;
  kgUnitPrice: number;
  materialCost: number;
  origin?: string | null;
}

export interface SimpleQuotationType {
  id?: string;
  quotationNo: string;
  productName: string;
  customerName?: string | null;
  productTypeId: string;
  packageUnit: number;
  bottleBoxCost: number;
  setCount: number;
  totalMaterialCost: number;
  totalAmount: number;
  note?: string | null;
  items: SimpleQuotationItemType[];
  productType?: ProductTypeType;
}

export interface DetailedMaterialItemType {
  id?: string;
  sortOrder: number;
  materialId?: string | null;
  materialName: string;
  specification?: string | null;
  /** 배합비율 (%) */
  mixRatio: number;
  /** 1포당 함량 (mg) */
  contentMg: number;
  /** 투입량 (kg) */
  inputKg: number;
  /** kg 당 단가 */
  unitPrice: number;
  totalPrice: number;
  functionalContent?: string | null;
  note?: string | null;
}

export interface DetailedSupplyItemType {
  id?: string;
  sortOrder: number;
  supplyId?: string | null;
  supplyName: string;
  specification?: string | null;
  /** 함량(개) — 참고값, 금액 계산에 쓰지 않는다 */
  quantity: number;
  /** 투입량(개) */
  inputQty: number;
  unitPrice: number;
  totalPrice: number;
  note?: string | null;
}

export interface DetailedProcessItemType {
  id?: string;
  sortOrder: number;
  processId?: string | null;
  processName: string;
  /** 수량 (case) */
  quantity: number;
  unitCost: number;
  totalCost: number;
  note?: string | null;
}

export interface DetailedOverheadItemType {
  id?: string;
  sortOrder: number;
  name: string;
  amount: number;
  note?: string | null;
}

export interface DetailedQuotationType {
  id?: string;
  quotationNo: string;
  productName: string;
  customerName?: string | null;
  customerId?: string | null;
  productType: string;
  formType?: string | null;
  contentAmount?: number | null;
  packageUnit: number;
  intakeGuide?: string | null;

  productionQty: number;
  unitWeight?: number;
  totalWeight?: number;
  lossRate?: number;
  yieldRate: number;
  theoreticalQty?: number;
  /** 실제수량(case) — 1 case 원가 환산의 분모 */
  caseQty: number;
  packagingMethod?: string | null;

  profitRate: number;
  vatRate?: number;
  /** 확정 납품단가(VAT 포함) */
  finalUnitPrice?: number;

  // 저장 시점 계산 스냅샷
  materialCost?: number;
  supplyCost?: number;
  processCost?: number;
  overheadCost?: number;
  costSubtotal?: number;
  profitAmount?: number;
  unitPriceExVat?: number;
  totalAmount?: number;

  status?: string;
  validUntil?: string | Date | null;
  note?: string | null;

  materials: DetailedMaterialItemType[];
  supplies: DetailedSupplyItemType[];
  processes: DetailedProcessItemType[];
  overheads: DetailedOverheadItemType[];

  createdAt?: string;
  updatedAt?: string;
}
