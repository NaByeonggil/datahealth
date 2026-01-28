export interface ProductTypeType {
  id: string;
  code: string;
  name: string;
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
  materialName: string;
  specification?: string | null;
  mixRatio: number;
  contentMg: number;
  inputKg: number;
  unitPrice: number;
  totalPrice: number;
  functionalContent?: string | null;
  note?: string | null;
}

export interface DetailedSupplyItemType {
  id?: string;
  sortOrder: number;
  supplyName: string;
  specification?: string | null;
  quantity: number;
  inputQty: number;
  unitPrice: number;
  totalPrice: number;
  note?: string | null;
}

export interface DetailedProcessItemType {
  id?: string;
  sortOrder: number;
  processName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  note?: string | null;
}

export interface DetailedQuotationType {
  id?: string;
  quotationNo: string;
  productName: string;
  customerName?: string | null;
  productType: string;
  formType?: string | null;
  contentAmount?: number | null;
  packageUnit: number;
  intakeGuide?: string | null;
  productionQty: number;
  unitWeight: number;
  totalWeight: number;
  yieldRate: number;
  actualQty: number;
  packagingMethod?: string | null;
  inspectionCost: number;
  managementCost: number;
  deliveryCost: number;
  designCost: number;
  onetimeCost: number;
  profitRate: number;
  note?: string | null;
  materials: DetailedMaterialItemType[];
  supplies: DetailedSupplyItemType[];
  processes: DetailedProcessItemType[];
}
