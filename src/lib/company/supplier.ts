/**
 * 견적서에 찍히는 공급자(자사) 정보.
 *
 * 실제 값은 DB(CompanyInfo, 1행)에 있고 `설정 > 회사` 화면에서 수정한다.
 * 여기 있는 값은 DB가 비었을 때만 쓰는 초기값/폴백이다.
 */
export interface CompanyInfoType {
  companyName: string;
  ceo: string;
  bizNo: string;
  manager: string;
  tel: string;
  fax: string;
  email: string;
  address: string;
  bizType: string;
  bizItem: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfoType = {
  companyName: "주식회사 상상바이오",
  ceo: "최무신,박균배",
  bizNo: "360-86-02016",
  manager: "박균배 약사, 나병길 약사",
  tel: "02-6956-0956",
  fax: "02-6956-0856",
  email: "sangsangbio@gmail.com",
  address: "서울특별시 강동구 성내로3길 37 (성내동) 6층",
  bizType: "도소매",
  bizItem: "건강기능식품",
};

/** 하위호환 — 기존 import 처를 위해 유지 */
export const SUPPLIER_INFO = DEFAULT_COMPANY_INFO;
