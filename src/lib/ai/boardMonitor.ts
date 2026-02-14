import { prisma } from "@/lib/prisma";
import { chatCompletion } from "./aiClient";
import { runFunctionCallingLoop } from "./functionCalling";
import { getClassifyInquiryPrompt } from "./prompts/classifyInquiry";
import { getExtractInfoPrompt } from "./prompts/extractInfo";
import { getGenerateResponsePrompt } from "./prompts/generateResponse";
import { CHAT_SYSTEM_PROMPT } from "./prompts/chatSystem";
import type { ExtractedInquiryData } from "@/types/ai";

// JSON 파싱 헬퍼
function parseJsonResponse(text: string): Record<string, unknown> | null {
  try {
    // JSON 블록 추출 시도
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch {
    return null;
  }
}

// 1단계: 문의 분류
async function classifyInquiry(title: string, content: string) {
  const prompt = getClassifyInquiryPrompt(title, content);
  const response = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    max_tokens: 256,
    temperature: 0.1,
  });

  const parsed = parseJsonResponse(response.content ?? "");
  return {
    inquiryType: (parsed?.inquiryType as string) ?? "simple",
    priority: (parsed?.priority as string) ?? "normal",
    confidence: (parsed?.confidence as number) ?? 0.5,
  };
}

// 2단계: 핵심 정보 추출
async function extractInfo(title: string, content: string): Promise<ExtractedInquiryData> {
  const prompt = getExtractInfoPrompt(title, content);
  const response = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
    temperature: 0.1,
  });

  const parsed = parseJsonResponse(response.content ?? "");
  return {
    materials: (parsed?.materials as ExtractedInquiryData["materials"]) ?? [],
    productType: (parsed?.productType as string) ?? undefined,
    productionQty: (parsed?.productionQty as number) ?? undefined,
    packageUnit: (parsed?.packageUnit as number) ?? undefined,
    missingInfo: (parsed?.missingInfo as string[]) ?? [],
    additionalNotes: (parsed?.additionalNotes as string) ?? undefined,
  };
}

// 3단계: 견적 문의 시 Function Calling으로 비용 계산
async function calculateQuotation(extractedData: ExtractedInquiryData) {
  if (!extractedData.materials?.length && !extractedData.productType) return null;

  const userMessage = `다음 정보로 견적을 산출해주세요:
- 원료: ${JSON.stringify(extractedData.materials)}
- 제형: ${extractedData.productType ?? "미지정"}
- 생산수량: ${extractedData.productionQty ?? "미지정"}
- 포장단위: ${extractedData.packageUnit ?? "미지정"}

필요한 함수를 순서대로 호출하여 견적을 계산해주세요.`;

  const result = await runFunctionCallingLoop([
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ]);

  return {
    content: result.finalContent,
    functionCalls: result.functionCalls,
  };
}

// 4단계: 답변 생성
async function generateResponse(
  title: string,
  content: string,
  extractedData: ExtractedInquiryData,
  quotationResult?: unknown
): Promise<string> {
  const prompt = getGenerateResponsePrompt(title, content, extractedData, quotationResult);
  const response = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
    temperature: 0.7,
  });

  return response.content ?? "답변을 생성하지 못했습니다.";
}

// 전체 파이프라인: 문의 처리
export async function processInquiry(inquiryId: string): Promise<void> {
  const inquiry = await prisma.boardInquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) throw new Error("문의를 찾을 수 없습니다.");

  // 처리 중 상태로 변경
  await prisma.boardInquiry.update({
    where: { id: inquiryId },
    data: { status: "ai_processing" },
  });

  try {
    // 1. 분류
    const classification = await classifyInquiry(inquiry.title, inquiry.content);

    // 2. 정보 추출
    const extractedData = await extractInfo(inquiry.title, inquiry.content);

    // 3. 견적 계산 (견적 문의인 경우)
    let quotationResult = null;
    if (classification.inquiryType === "quotation" || classification.inquiryType === "urgent") {
      quotationResult = await calculateQuotation(extractedData);
    }

    // 4. 답변 생성
    const aiResponse = await generateResponse(
      inquiry.title,
      inquiry.content,
      extractedData,
      quotationResult
    );

    // 5. 결과 저장
    const status = classification.confidence < 0.7 ? "human_review" : "ai_completed";

    await prisma.boardInquiry.update({
      where: { id: inquiryId },
      data: {
        status,
        inquiryType: classification.inquiryType,
        priority: classification.priority,
        confidence: classification.confidence,
        extractedData: JSON.stringify(extractedData),
        aiResponse,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    // 실패 시 human_review로 설정
    await prisma.boardInquiry.update({
      where: { id: inquiryId },
      data: {
        status: "human_review",
        aiResponse: `AI 처리 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
        processedAt: new Date(),
      },
    });
  }
}

// 대기중인 문의 자동 처리 (폴링용)
export async function processAllPending(): Promise<{ processed: number; errors: number }> {
  const pendingInquiries = await prisma.boardInquiry.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  let processed = 0;
  let errors = 0;

  for (const inquiry of pendingInquiries) {
    try {
      await processInquiry(inquiry.id);
      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}
