"use client";

import MasterCrudPage from "@/components/master/MasterCrudPage";

export default function CustomerPage() {
  return (
    <MasterCrudPage
      title="고객사 관리"
      apiUrl="/api/customers"
      searchPlaceholder="고객사명, 코드 검색"
      columns={[
        { key: "code", label: "고객사코드" },
        { key: "name", label: "고객사명" },
        { key: "contact", label: "연락처" },
        { key: "manager", label: "담당자" },
        { key: "isActive", label: "상태", type: "badge" },
      ]}
      fields={[
        { key: "code", label: "고객사코드", required: true },
        { key: "name", label: "고객사명", required: true },
        { key: "contact", label: "연락처" },
        { key: "manager", label: "담당자" },
        { key: "address", label: "주소" },
        { key: "email", label: "이메일" },
        { key: "note", label: "비고" },
        { key: "isActive", label: "상태", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}
