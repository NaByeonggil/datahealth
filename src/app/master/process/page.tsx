"use client";

import MasterCrudPage from "@/components/master/MasterCrudPage";

export default function ProcessPage() {
  return (
    <MasterCrudPage
      title="공정 관리"
      apiUrl="/api/processes"
      searchPlaceholder="공정명, 코드 검색"
      columns={[
        { key: "code", label: "공정코드" },
        { key: "name", label: "공정명" },
        { key: "costPerUnit", label: "단가(원)", type: "number" },
        { key: "sortOrder", label: "순서", type: "number" },
        { key: "description", label: "설명" },
        { key: "isActive", label: "상태", type: "badge" },
      ]}
      fields={[
        { key: "code", label: "공정코드", required: true },
        { key: "name", label: "공정명", required: true },
        { key: "costPerUnit", label: "단가(원)", type: "number", defaultValue: 0 },
        { key: "sortOrder", label: "순서", type: "number", defaultValue: 0 },
        { key: "description", label: "설명" },
        { key: "isActive", label: "상태", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}
