/**
 * 역할과 권한.
 *
 * 화면에서 숨기는 것만으로는 권한이 아니다 — 실제 차단은 서버(미들웨어 + API)에서 한다.
 * 이 파일은 클라이언트에서도 import 하므로 DB 를 건드리지 않는다.
 */

export const ROLES = ["admin", "manager", "sales"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  manager: "매니저",
  sales: "영업담당",
};

export const ROLE_DESCRIPTION: Record<string, string> = {
  admin: "모든 기능 + 계정·권한 관리",
  manager: "모든 기능. 원가·마진을 보고 마스터 단가를 고칠 수 있습니다.",
  sales: "견적서 작성·발송까지. 원가·마진·원료단가는 보이지 않습니다.",
};

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/** 원가·마진·원료단가를 볼 수 있는가 — 권한 분기의 중심축 */
export function canViewCost(role: string): boolean {
  return role === "admin" || role === "manager";
}

/** 마스터(원료·자재·임가공·제품유형 등)를 고칠 수 있는가 */
export function canEditMaster(role: string): boolean {
  return role === "admin" || role === "manager";
}

/** 계정·권한을 관리할 수 있는가 */
export function canManageUsers(role: string): boolean {
  return role === "admin";
}

/** 상세견적서(원가계산서)에 접근할 수 있는가 — 시트 자체가 원가표다 */
export function canAccessDetailedQuotation(role: string): boolean {
  return canViewCost(role);
}

/** 권한 안내 화면에 그대로 뿌리는 표 */
export const CAPABILITY_MATRIX: {
  label: string;
  detail?: string;
  allow: (role: string) => boolean;
}[] = [
  { label: "일반견적서 조회·작성·발송", allow: () => true },
  { label: "견적서 복제", allow: () => true },
  { label: "배합 템플릿 사용", allow: () => true },
  {
    label: "원가·마진 열람",
    detail: "1정당 원료비·공임비, 기업이윤, 원료 단가",
    allow: canViewCost,
  },
  { label: "상세견적서(원가계산서)", detail: "시트 전체가 원가표다", allow: canAccessDetailedQuotation },
  { label: "마스터 관리", detail: "원료·자재·임가공비·제품유형 단가 수정", allow: canEditMaster },
  { label: "단가 이력·변동 알림", allow: canViewCost },
  { label: "임포트 센터", allow: canEditMaster },
  { label: "AI 어시스턴트", allow: canViewCost },
  { label: "계정·권한 관리", allow: canManageUsers },
  { label: "회사정보·견적서 문구 설정", allow: canManageUsers },
];
