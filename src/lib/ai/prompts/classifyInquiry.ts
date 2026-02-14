export function getClassifyInquiryPrompt(title: string, content: string): string {
  return `당신은 건강기능식품 제조 회사의 문의 분류 전문가입니다.
다음 고객 문의를 분석하여 JSON으로 분류해주세요.

## 분류 기준
- quotation: 견적 요청, 가격 문의, 비용 산출 관련
- product: 제품 문의, 성분 문의, 제형 문의
- simple: 단순 문의, 배송, 일반 질문
- spam: 스팸, 광고, 무관한 내용
- urgent: 긴급 견적, 납기 촉박, 급한 요청

## 우선순위 기준
- urgent: 긴급 표현 포함, 납기 언급
- high: 대량 주문, VIP 고객 표현
- normal: 일반적인 문의
- low: 정보성 문의, 참고용

## 문의 내용
제목: ${title}
내용: ${content}

## 응답 형식 (JSON만 출력)
{
  "inquiryType": "quotation|product|simple|spam|urgent",
  "priority": "low|normal|high|urgent",
  "confidence": 0.0~1.0,
  "reason": "분류 근거 한 줄 설명"
}`;
}
