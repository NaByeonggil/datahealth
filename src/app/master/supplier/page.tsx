"use client";

import MasterCrudPage from "@/components/master/MasterCrudPage";

export default function SupplierPage() {
  return (
    <MasterCrudPage
      title="공급사 관리"
      apiUrl="/api/suppliers"
      searchPlaceholder="공급사명, 코드 검색"
      columns={[
        { key: "code", label: "공급사코드" },
        { key: "name", label: "공급사명" },
        { key: "contact", label: "연락처" },
        { key: "manager", label: "담당자" },
        { key: "_count", label: "원료수", render: (_, row) => {
          const count = row._count as { materials: number } | undefined;
          return count?.materials ?? 0;
        }},
        { key: "isActive", label: "상태", type: "badge" },
      ]}
      fields={[
        { key: "code", label: "공급사코드", required: true },
        { key: "name", label: "공급사명", required: true },
        { key: "contact", label: "연락처" },
        { key: "manager", label: "담당자" },
        { key: "address", label: "주소" },
        { key: "email", label: "이메일" },
        { key: "isActive", label: "상태", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}
