"use client";

import MasterCrudPage from "@/components/master/MasterCrudPage";

export default function SupplyPage() {
  return (
    <MasterCrudPage
      title="자재 관리"
      apiUrl="/api/supplies"
      searchPlaceholder="자재명, 코드 검색"
      columns={[
        { key: "code", label: "자재코드" },
        { key: "name", label: "자재명" },
        { key: "unit", label: "단위" },
        { key: "unitPrice", label: "단가(원)", type: "number" },
        { key: "description", label: "설명" },
        { key: "isActive", label: "상태", type: "badge" },
      ]}
      fields={[
        { key: "code", label: "자재코드", required: true },
        { key: "name", label: "자재명", required: true },
        { key: "unit", label: "단위", defaultValue: "EA" },
        { key: "unitPrice", label: "단가(원)", type: "number", defaultValue: 0 },
        { key: "description", label: "설명" },
        { key: "isActive", label: "상태", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}
