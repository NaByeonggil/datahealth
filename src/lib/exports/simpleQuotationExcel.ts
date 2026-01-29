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

interface QuotationData {
  quotationNo: string;
  productName: string;
  customerName: string;
  packageUnit: number;
  bottleBoxCost: number;
  setCount: number;
  processingCostPerUnit: number;
  note: string;
  items: QuotationItem[];
  totalMaterialCost: number;
  processingCost: number;
  subtotal: number;
  totalAmount: number;
}

export function exportSimpleQuotationExcel(data: QuotationData) {
  const rows: (string | number)[][] = [];

  // Title
  rows.push(["견 적 서"]);
  rows.push([]);

  // Basic info
  rows.push(["견적번호", data.quotationNo || "-", "", "제품명", data.productName]);
  rows.push(["고객사명", data.customerName || "-", "", "포장단위", data.packageUnit]);
  rows.push(["병+박스 비용", data.bottleBoxCost, "", "세트수", data.setCount]);
  rows.push([]);

  // Material table header
  rows.push(["No", "구분", "원료명", "이론량(mg)", "실투여량(g)", "Kg당단가(원)", "원료비(원)", "원산지"]);

  // Material rows
  data.items.forEach((item, i) => {
    rows.push([
      i + 1,
      item.category,
      item.materialName,
      item.theoryAmount,
      Number(item.actualAmount.toFixed(4)),
      item.kgUnitPrice,
      Math.round(item.materialCost),
      item.origin || "",
    ]);
  });

  rows.push([]);

  // Price calculation
  rows.push(["원료비 합계", Math.round(data.totalMaterialCost)]);
  rows.push(["가공비", Math.round(data.processingCost)]);
  rows.push(["병+박스", data.bottleBoxCost]);
  rows.push(["합계", Math.round(data.subtotal)]);
  rows.push(["세트합계", Math.round(data.totalAmount)]);
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
