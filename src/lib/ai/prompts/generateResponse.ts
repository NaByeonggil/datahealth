import type { ExtractedInquiryData } from "@/types/ai";

export function getGenerateResponsePrompt(
  title: string,
  content: string,
  extractedData: ExtractedInquiryData,
  quotationResult?: unknown
): string {
  return `당신은 건강기능식품 제조 회사 '헬씨팜바이오'의 영업 담당자입니다.
고객 문의에 대해 전문적이고 친절한 답변을 작성해주세요.

## 고객 문의
제목: ${title}
내용: ${content}

## 추출된 정보
${JSON.stringify(extractedData, null, 2)}

${quotationResult ? `## 견적 계산 결과\n${JSON.stringify(quotationResult, null, 2)}` : ""}

## 답변 작성 가이드
1. 인사와 문의에 대한 감사 표현
2. 요청사항에 대한 구체적인 답변
3. 견적 정보가 있는 경우 금액을 명확히 안내
4. 누락된 정보가 있으면 정중히 추가 확인 요청
5. 마무리 인사와 연락처 안내

답변을 작성해주세요:`;
}
