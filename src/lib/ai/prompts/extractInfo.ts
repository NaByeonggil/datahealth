export function getExtractInfoPrompt(title: string, content: string): string {
  return `당신은 건강기능식품 견적 전문가입니다.
다음 고객 문의에서 견적에 필요한 핵심 정보를 추출해주세요.

## 문의 내용
제목: ${title}
내용: ${content}

## 추출할 정보
- materials: 원료 목록 (이름, 수량)
- productType: 제형 (정제, 캅셀, 분말스틱, 액상스틱, 파우치, 젤리)
- productionQty: 생산 수량
- packageUnit: 포장 단위 (한 통·한 박스에 담는 정/포 수). 고객이 적지 않았으면 null
- certification: 고객이 요청한 인증 (HACCP, GMP, 유기농, 할랄 등). 고객이 직접 언급한 경우에만 적고, 없으면 null
- missingInfo: 견적에 필요하지만 누락된 정보. 포장단위·생산수량·인증 여부·포장 디자인·부자재 사양은 기본 조건으로 처리하므로 여기에 넣지 않습니다

## 응답 형식 (JSON만 출력)
{
  "materials": [{"name": "원료명", "quantity": "수량 (예: 50kg)"}],
  "productType": "제형명 또는 null",
  "productionQty": 숫자 또는 null,
  "packageUnit": 숫자 또는 null,
  "certification": "인증명 또는 null",
  "missingInfo": ["누락 정보 1", "누락 정보 2"],
  "additionalNotes": "기타 참고 사항"
}`;
}
