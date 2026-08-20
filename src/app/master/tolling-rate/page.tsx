"use client";

import MasterCrudPage from "@/components/master/MasterCrudPage";

const fmt = (v: unknown) => (v == null ? "-" : Number(v).toLocaleString("ko-KR"));

export default function TollingRatePage() {
  return (
    <MasterCrudPage
      title="임가공비 단가"
      apiUrl="/api/tolling/rates"
      searchPlaceholder="제형, 업체, 규격 검색"
      columns={[
        { key: "vendorName", label: "업체" },
        { key: "formName", label: "제형/유형" },
        { key: "specLabel", label: "규격" },
        {
          key: "qtyMin",
          label: "수량구간",
          render: (_v, row) =>
            `${fmt(row.qtyMin)} ~ ${row.qtyMax ? fmt(row.qtyMax) : "이상"}`,
        },
        {
          key: "unitCost",
          label: "단가",
          render: (v, row) => `${fmt(v)}원 / ${
            { per_unit: "개", per_case: "case", per_bottle: "병", per_tablet: "정" }[
              String(row.costBasis)
            ] || "개"
          }`,
        },
        {
          key: "supplyMode",
          label: "납품",
          render: (v) =>
            ({ bulk: "벌크", semi: "반제품", finished: "완제품" }[String(v)] || String(v)),
        },
        {
          key: "effectiveDate",
          label: "기준일",
          render: (v) => (v ? new Date(String(v)).toLocaleDateString("ko-KR") : "-"),
        },
        { key: "sourceFile", label: "출처" },
        { key: "isCurrent", label: "현행", type: "badge" },
      ]}
      fields={[
        { key: "vendorName", label: "업체명", required: true },
        { key: "formName", label: "제형/유형", required: true },
        { key: "formCode", label: "제형코드" },
        { key: "specLabel", label: "규격 (예: 10~15g)" },
        { key: "specMin", label: "규격 최소", type: "number" },
        { key: "specMax", label: "규격 최대", type: "number" },
        {
          key: "specUnit",
          label: "규격 단위",
          type: "select",
          options: [
            { value: "", label: "-" },
            { value: "g", label: "g" },
            { value: "ml", label: "ml" },
            { value: "mg", label: "mg" },
          ],
        },
        { key: "qtyMin", label: "수량구간 시작", type: "number", defaultValue: 0 },
        { key: "qtyMax", label: "수량구간 끝 (비우면 이상)", type: "number" },
        { key: "unitCost", label: "단가(원)", type: "number", required: true },
        {
          key: "costBasis",
          label: "단가 기준",
          type: "select",
          defaultValue: "per_unit",
          options: [
            { value: "per_unit", label: "개당" },
            { value: "per_case", label: "case당" },
            { value: "per_bottle", label: "병당" },
            { value: "per_tablet", label: "정당" },
          ],
        },
        {
          key: "supplyMode",
          label: "납품 방식",
          type: "select",
          defaultValue: "bulk",
          options: [
            { value: "bulk", label: "벌크" },
            { value: "semi", label: "반제품" },
            { value: "finished", label: "완제품" },
          ],
        },
        { key: "vendorPrice", label: "납품가(업체)", type: "number" },
        { key: "ownMargin", label: "자사 마진", type: "number" },
        { key: "includesProfit", label: "이윤 포함", type: "checkbox", defaultValue: false },
        { key: "includesVat", label: "VAT 포함", type: "checkbox", defaultValue: false },
        { key: "isNegotiable", label: "협의 가능(NEGO)", type: "checkbox", defaultValue: false },
        { key: "isConfidential", label: "대외비", type: "checkbox", defaultValue: false },
        { key: "effectiveDate", label: "기준일 (YYYY-MM-DD)" },
        { key: "isCurrent", label: "현행 단가", type: "checkbox", defaultValue: true },
        { key: "note", label: "비고", type: "textarea" },
      ]}
    />
  );
}
