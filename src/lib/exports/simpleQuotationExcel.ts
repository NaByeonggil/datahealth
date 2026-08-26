import { DEFAULT_COMPANY_INFO, CompanyInfoType } from "@/lib/company/supplier";
import * as XLSX from "xlsx";

interface QuotationItem {
  category: string;
  materialName: string;
  theoryAmount: number;
  actualAmount: number;
  kgUnitPrice: number;
  materialCost: number;
  origin?: string | null;
}

interface QuotationLine {
  no: string;
  productName: string;
  displayLabel: string;
  packageUnit: number;
  bottleBoxCost: number;
  setCount: number;
  unit?: string | null;
  packagingMethod?: string | null;
  manufacturingCost: number;
  subtotal: number;
  supplyAmount: number;
  vatAmount: number;
}

interface QuotationProduct {
  name: string;
  materialCostPerUnit: number;
  subMaterialCostPerUnit: number;
  processingCostPerUnit: number;
  perUnitCost: number;
  items?: unknown[];
}

interface QuotationData {
  quotationNo: string;
  productName: string;
  customerName: string;
  productNames?: string;
  productTypeNames?: string;
  productSpecs?: string;
  dosages?: string;
  note: string;
  products: QuotationProduct[];
  lines: QuotationLine[];
  supplyAmount: number;
  vatAmount: number;
  totalCost: number;
  sumOptions?: boolean;
  company?: CompanyInfoType;
}

export function exportSimpleQuotationExcel(data: QuotationData) {
  const rows: (string | number)[][] = [];

  const co = data.company ?? DEFAULT_COMPANY_INFO;

  // Title
  rows.push(["견 적 서"]);
  rows.push([]);

  // 공급자(자사) 정보 — 설정 > 회사 에서 관리한다
  rows.push(["[공급자]"]);
  rows.push(["상호", co.companyName, "", "대표자", co.ceo]);
  rows.push(["사업자번호", co.bizNo, "", "FAX", co.fax]);
  rows.push(["담당자", co.manager, "", "전화", co.tel]);
  rows.push(["이메일", co.email, "", "업태", co.bizType]);
  rows.push(["주소", co.address, "", "종목", co.bizItem]);
  rows.push([]);

  // Basic info
  rows.push(["견적번호", data.quotationNo || "-", "", "제품명", data.productNames || data.productName]);
  rows.push(["고객사명", data.customerName || "-", "", "제품제형", data.productTypeNames || ""]);
  rows.push(["제품규격", data.productSpecs || "", "", "섭취방법", data.dosages || ""]);
  rows.push([]);

  // 제품마다 배합 + 1정당 단가
  data.products.forEach((pr, pi) => {
    rows.push([`[제품 ${pi + 1}] ${pr.name}`]);
    rows.push(["No", "구분", "주/부원료", "원료명", "이론량(mg)", "실투여량(g)", "Kg당단가(원)", "원료비(원)", "원산지"]);
    (pr.items ?? []).forEach((raw, i) => {
      const item = raw as {
        category: string; role?: string | null; materialName: string;
        theoryAmount: number; actualAmount: number; kgUnitPrice: number;
        materialCost: number; origin?: string | null;
      };
      rows.push([
        i + 1, item.category, item.role || "주원료", item.materialName,
        item.theoryAmount, Number(item.actualAmount.toFixed(4)),
        item.kgUnitPrice, Math.round(item.materialCost), item.origin || "",
      ]);
    });
    rows.push(["1정당 단가", "원료비", Math.round(pr.materialCostPerUnit),
      "부원료비", Math.round(pr.subMaterialCostPerUnit),
      "공임비", Math.round(pr.processingCostPerUnit),
      "합계", Math.round(pr.perUnitCost)]);
    rows.push([]);
  });

  // 품목 표
  rows.push(["[품목]"]);
  rows.push(["No.", "품목", "규격", "세트수", "단위", "1박스원가", "공급가액", "세액"]);
  data.lines.forEach((l) => {
    rows.push([
      l.no, l.productName, l.packagingMethod || l.displayLabel,
      l.setCount, l.unit || "박스",
      Math.round(l.subtotal), Math.round(l.supplyAmount), Math.round(l.vatAmount),
    ]);
  });
  if (data.sumOptions) {
    rows.push(["합계", "", "", "", "", "", Math.round(data.supplyAmount), Math.round(data.vatAmount)]);
    rows.push(["총원가", Math.round(data.totalCost)]);
  } else {
    rows.push(["※ 위 포장 옵션 중 택일"]);
  }
  rows.push([]);

  // Note
  if (data.note) {
    rows.push(["비고", data.note]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "견적서");

  const filename = data.quotationNo
    ? `견적서_${data.quotationNo}.xlsx`
    : `견적서_${data.productName}.xlsx`;
  XLSX.writeFile(wb, filename);
}
