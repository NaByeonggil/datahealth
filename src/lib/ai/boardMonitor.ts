import { prisma } from "@/lib/prisma";
import { chatCompletion, isAiAvailable, AiUnavailableError } from "./aiClient";
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
async function classifyInquiry(inquiryId: string, title: string, content: string) {
  const prompt = getClassifyInquiryPrompt(title, content);
  const response = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    max_tokens: 256,
    temperature: 0.1,
    json: true,
    thinking: false,
    taskType: "classify",
    relatedId: inquiryId,
  });

  const parsed = parseJsonResponse(response.content ?? "");
  return {
    inquiryType: (parsed?.inquiryType as string) ?? "simple",
    priority: (parsed?.priority as string) ?? "normal",
    confidence: (parsed?.confidence as number) ?? 0.5,
  };
}

// 2단계: 핵심 정보 추출
async function extractInfo(inquiryId: string, title: string, content: string): Promise<ExtractedInquiryData> {
  const prompt = getExtractInfoPrompt(title, content);
  const response = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
    temperature: 0.1,
    json: true,
    thinking: false,
    taskType: "extract",
    relatedId: inquiryId,
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
async function calculateQuotation(inquiryId: string, extractedData: ExtractedInquiryData) {
  if (!extractedData.materials?.length && !extractedData.productType) return null;

  const userMessage = `다음 정보로 견적을 산출해주세요:
- 원료: ${JSON.stringify(extractedData.materials)}
- 제형: ${extractedData.productType ?? "미지정"}
- 생산수량: ${extractedData.productionQty ?? "미지정"}
- 포장단위: ${extractedData.packageUnit ?? "미지정"}

필요한 함수를 순서대로 호출하여 견적을 계산해주세요.`;

  const result = await runFunctionCallingLoop(
    [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    { relatedId: inquiryId }
  );

  // 합산까지 간 경우에만 내부 참고용 숫자를 남긴다. 단가·이윤율 같은 세부는 남기지 않는다.
  const quote = [...result.functionCalls].reverse().find((f) => f.name === "generate_quotation");
  const summary = (quote?.result as { summary?: Record<string, number> } | undefined)?.summary;
  if (!summary) return null;
  return {
    totalAmount: summary.totalAmount,
    unitPrice: summary.unitPrice,
    productionQty: summary.productionQty,
  };
}

// 4단계: 답변 생성
async function generateResponse(
  inquiryId: string,
  title: string,
  content: string,
  extractedData: ExtractedInquiryData
): Promise<string> {
  const prompt = getGenerateResponsePrompt(title, content, extractedData);
  const response = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.7,
    thinking: false,
    taskType: "generate_response",
    relatedId: inquiryId,
  });

  return response.content ?? "답변을 생성하지 못했습니다.";
}

export interface ProcessResult {
  ok: boolean;
  /** AI 서버가 꺼져 있어 손대지 않고 그대로 둠 */
  offline?: boolean;
  error?: string;
}

// 전체 파이프라인: 문의 처리
export async function processInquiry(inquiryId: string): Promise<ProcessResult> {
  const inquiry = await prisma.boardInquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) throw new Error("문의를 찾을 수 없습니다.");

  // 처리 중 상태로 변경 — 조건부로 잡아, 접수 직후 처리와 폴링이 같은 문의를 두 번 돌리지 않게 한다
  const claimed = await prisma.boardInquiry.updateMany({
    where: { id: inquiryId, status: { in: ["pending", "human_review"] } },
    data: { status: "ai_processing" },
  });
  if (claimed.count === 0) return { ok: false, error: "이미 처리 중이거나 처리가 끝난 문의입니다." };

  try {
    // 1. 분류
    const classification = await classifyInquiry(inquiryId, inquiry.title, inquiry.content);

    // 2. 정보 추출
    const extractedData = await extractInfo(inquiryId, inquiry.title, inquiry.content);

    // 3. 견적 계산 (견적 문의인 경우)
    // 내부 참고용 추정 견적. 고객 답변 초안에는 넣지 않는다 — 초안을 쓰는 모델에게
    // 단가나 금액을 보여주면, 하지 말라고 해도 답변에 옮겨 적는다.
    let internalEstimate = null;
    if (classification.inquiryType === "quotation" || classification.inquiryType === "urgent") {
      internalEstimate = await calculateQuotation(inquiryId, extractedData);
    }

    // 4. 답변 생성 — 스팸에는 답하지 않는다
    if (classification.inquiryType === "spam") {
      await prisma.boardInquiry.update({
        where: { id: inquiryId },
        data: {
          status: classification.confidence < 0.7 ? "human_review" : "closed",
          inquiryType: "spam",
          priority: "low",
          confidence: classification.confidence,
          aiResponse: "스팸으로 분류되어 답변을 생성하지 않았습니다.",
          processedAt: new Date(),
        },
      });
      return { ok: true };
    }

    const aiResponse = await generateResponse(
      inquiryId,
      inquiry.title,
      inquiry.content,
      extractedData
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
        extractedData: JSON.stringify(internalEstimate ? { ...extractedData, internalEstimate } : extractedData),
        aiResponse,
        processedAt: new Date(),
      },
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // AI 서버가 꺼져 있는 것은 문의의 문제가 아니다 — 원래 상태로 되돌려 다음에 다시 처리한다
    if (error instanceof AiUnavailableError) {
      await prisma.boardInquiry.update({ where: { id: inquiryId }, data: { status: inquiry.status } });
      return { ok: false, offline: true, error: message };
    }

    // 그 밖의 실패는 사람이 보도록 넘긴다
    await prisma.boardInquiry.update({
      where: { id: inquiryId },
      data: {
        status: "human_review",
        aiResponse: `AI 처리 중 오류 발생: ${message}`,
        processedAt: new Date(),
      },
    });
    return { ok: false, error: message };
  }
}

/** 폴링이 겹쳐 같은 문의를 두 번 돌리지 않도록 */
let monitorRunning = false;

// 대기중인 문의 자동 처리 (폴링용)
export async function processAllPending(): Promise<{ processed: number; errors: number; offline?: boolean; busy?: boolean }> {
  if (monitorRunning) return { processed: 0, errors: 0, busy: true };
  monitorRunning = true;
  try {
    // AI PC 가 꺼져 있으면 문의를 건드리지 않고 조용히 넘어간다
    if (!(await isAiAvailable())) return { processed: 0, errors: 0, offline: true };
    return await runPending();
  } finally {
    monitorRunning = false;
  }
}

/** 처리 도중 서버가 내려가 "AI 처리중"에 멈춘 문의를 되살리는 기준 */
const STALE_PROCESSING_MS = 10 * 60 * 1000;

async function runPending(): Promise<{ processed: number; errors: number; offline?: boolean }> {
  await prisma.boardInquiry.updateMany({
    where: { status: "ai_processing", updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) } },
    data: { status: "pending" },
  });

  const pendingInquiries = await prisma.boardInquiry.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  let processed = 0;
  let errors = 0;

  for (const inquiry of pendingInquiries) {
    try {
      const result = await processInquiry(inquiry.id);
      if (result.offline) return { processed, errors, offline: true };
      if (result.ok) processed++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}
