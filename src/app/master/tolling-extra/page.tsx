"use client";

import MasterCrudPage from "@/components/master/MasterCrudPage";

export default function TollingExtraPage() {
  return (
    <MasterCrudPage
      title="추가 공정비"
      apiUrl="/api/tolling/extras"
      searchPlaceholder="항목명, 업체, 제형 검색"
      columns={[
        { key: "name", label: "항목" },
        { key: "vendorName", label: "업체" },
        { key: "formName", label: "제형/유형" },
        {
          key: "calcType",
          label: "계산 방식",
          render: (v) =>
            ({ per_unit: "개당", per_lot: "건당", percent: "정률(%)" }[String(v)] || String(v)),
        },
        {
          key: "amount",
          label: "금액",
          render: (v, row) =>
            row.calcType === "percent"
              ? `${Number(v)}%`
              : `${Number(v).toLocaleString("ko-KR")}원`,
        },
        { key: "condition", label: "조건" },
        { key: "sourceFile", label: "출처" },
        { key: "isCurrent", label: "현행", type: "badge" },
      ]}
      fields={[
        { key: "name", label: "항목명", required: true },
        { key: "code", label: "코드" },
        { key: "vendorName", label: "업체명" },
        { key: "formName", label: "제형/유형" },
        {
          key: "calcType",
          label: "계산 방식",
          type: "select",
          defaultValue: "per_unit",
          options: [
            { value: "per_unit", label: "개당" },
            { value: "per_lot", label: "건당(일회성)" },
            { value: "percent", label: "정률(%)" },
          ],
        },
        { key: "amount", label: "금액 / 비율", type: "number", required: true },
        { key: "percentBase", label: "정률 기준 (예: cost_subtotal)" },
        { key: "isOptional", label: "선택 항목", type: "checkbox", defaultValue: true },
        { key: "condition", label: "적용 조건" },
        { key: "effectiveDate", label: "기준일 (YYYY-MM-DD)" },
        { key: "isCurrent", label: "현행", type: "checkbox", defaultValue: true },
        { key: "note", label: "비고", type: "textarea" },
      ]}
    />
  );
}
