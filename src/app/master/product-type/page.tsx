"use client";

import MasterCrudPage from "@/components/master/MasterCrudPage";

export default function ProductTypePage() {
  return (
    <MasterCrudPage
      title="제품유형 관리"
      apiUrl="/api/product-types"
      searchPlaceholder="유형명, 코드 검색"
      columns={[
        { key: "code", label: "유형코드" },
        { key: "name", label: "유형명" },
        { key: "processingCost", label: "가공비(원)", type: "number" },
        { key: "sortOrder", label: "순서", type: "number" },
        { key: "description", label: "설명" },
        { key: "isActive", label: "상태", type: "badge" },
      ]}
      fields={[
        { key: "code", label: "유형코드", required: true },
        { key: "name", label: "유형명", required: true },
        { key: "processingCost", label: "기본 가공비(원)", type: "number", required: true },
        { key: "sortOrder", label: "순서", type: "number", defaultValue: 0 },
        { key: "description", label: "설명" },
        { key: "isActive", label: "상태", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}
