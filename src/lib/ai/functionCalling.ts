import type { FunctionDef, ChatMessage } from "./aiProvider";
import { chatCompletion } from "./aiClient";
import { searchRawMaterials } from "./functions/searchRawMaterials";
import { getMaterialPrice } from "./functions/getMaterialPrice";
import { calculateProcessingCost } from "./functions/calculateProcessingCost";
import { calculatePackagingCost } from "./functions/calculatePackagingCost";
import { generateQuotation } from "./functions/generateQuotation";
import type { FunctionCallLog } from "@/types/ai";

/** 도구 결과를 모델에 돌려줄 때의 상한. 로컬 모델은 컨텍스트가 작다. */
const MAX_RESULT_CHARS = 4000;

// 함수 정의 (JSON Schema) — 작은 모델도 틀리지 않게 인자를 최소로 둔다
export const functionDefinitions: FunctionDef[] = [
  {
    name: "search_raw_materials",
    description: "원료 마스터에서 원료를 검색합니다. 원료명·코드·사양으로 찾고, 후보의 코드와 단가를 돌려줍니다.",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "검색 키워드 (원료명, 코드, 사양)" },
      },
      required: ["keyword"],
    },
  },
  {
    name: "get_material_price",
    description: "원료 하나의 kg당 단가를 조회하고 수량에 따른 원료비를 계산합니다. 후보가 여러 개면 후보 목록을 돌려줍니다.",
    parameters: {
      type: "object",
      properties: {
        materialName: { type: "string", description: "원료명 또는 원료 코드" },
        quantityKg: { type: "number", description: "투입량 (kg)" },
      },
      required: ["materialName"],
    },
  },
  {
    name: "calculate_processing_cost",
    description:
      "제형·용기별 가공비(임가공비)를 조회합니다. 사용자가 말한 제형이나 용기 표현을 바꾸지 말고 그대로 넘깁니다. " +
      "바이알·몰드병·파우치 같은 용기도 그대로 넘깁니다 (예: '20ml 바이알'을 '액상스틱'으로 바꾸지 않습니다).",
    parameters: {
      type: "object",
      properties: {
        productTypeName: { type: "string", description: "사용자가 말한 제형 또는 용기 그대로 (예: 정제, 경질캅셀, 20ml 바이알, 액상 파우치)" },
        productionQty: { type: "number", description: "생산 수량 (개)" },
      },
      required: ["productTypeName", "productionQty"],
    },
  },
  {
    name: "calculate_packaging_cost",
    description:
      "부자재 세트 기준으로 부자재비를 계산합니다. 사용자가 용기를 말했으면(예: 20ml 바이알) packagingName 에 그대로 넣습니다. " +
      "용기를 전혀 모를 때만 packagingName 없이 호출해 세트 목록을 받습니다.",
    parameters: {
      type: "object",
      properties: {
        productionQty: { type: "number", description: "생산 수량 (개)" },
        packagingName: { type: "string", description: "부자재 세트명 또는 용기 규격 (예: 20ml 바이알)" },
      },
      required: ["productionQty"],
    },
  },
  {
    name: "generate_quotation",
    description: "원료비, 가공비, 부자재비를 합산해 최종 견적(총액·개당 단가)을 계산합니다. 앞선 도구 결과의 숫자를 그대로 넣습니다.",
    parameters: {
      type: "object",
      properties: {
        productName: { type: "string", description: "제품명" },
        materialCosts: {
          type: "array",
          description: "원료별 투입량과 단가",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "원료명" },
              quantityKg: { type: "number", description: "투입량 (kg)" },
              unitPrice: { type: "number", description: "kg당 단가 (원)" },
            },
            required: ["name", "quantityKg", "unitPrice"],
          },
        },
        processingCostPerUnit: { type: "number", description: "개당 가공비 (원)" },
        productionQty: { type: "number", description: "생산 수량 (개)" },
        packagingCost: { type: "number", description: "총 부자재비 (원). 모르면 0" },
        profitRate: { type: "number", description: "이윤율 (%). 기본 5" },
      },
      required: ["productName", "materialCosts", "processingCostPerUnit", "productionQty"],
    },
  },
];

// 함수 실행기
const functionExecutors: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  search_raw_materials: (args) => searchRawMaterials(args as { keyword: string }),
  get_material_price: (args) => getMaterialPrice(args as { materialName: string; quantityKg?: number }),
  calculate_processing_cost: (args) => calculateProcessingCost(args as { productTypeName: string; productionQty: number }),
  calculate_packaging_cost: (args) => calculatePackagingCost(args as { productionQty: number; packagingName?: string }),
  generate_quotation: (args) => generateQuotation(args as Parameters<typeof generateQuotation>[0]),
};

function parseArgs(argsJson: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(argsJson || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 함수 실행. 모델이 없는 함수를 부르거나 인자를 잘못 줘도 예외를 던지지 않고
 * 오류 내용을 결과로 돌려준다 — 모델이 보고 고쳐 부를 수 있게.
 */
export async function executeFunction(
  name: string,
  argsJson: string
): Promise<{ args: Record<string, unknown>; result: unknown; durationMs: number }> {
  const startTime = Date.now();
  const executor = functionExecutors[name];
  const args = parseArgs(argsJson);

  let result: unknown;
  if (!executor) {
    result = { error: `'${name}' 도구는 없습니다. 사용 가능: ${Object.keys(functionExecutors).join(", ")}` };
  } else if (!args) {
    result = { error: "인자가 올바른 JSON 객체가 아닙니다. 다시 호출하세요." };
  } else {
    try {
      result = await executor(args);
    } catch (error) {
      result = { error: `도구 실행 실패: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  return { args: args ?? {}, result, durationMs: Date.now() - startTime };
}

type Result = Record<string, unknown> | undefined;

/** 원료 단가와 가공비까지 확인했는데 합산(generate_quotation)을 건너뛰었는가 */
function skippedQuotation(calls: FunctionCallLog[]): boolean {
  const ok = (name: string) => calls.some((c) => c.name === name && (c.result as Result)?.found === true);
  return ok("get_material_price") && ok("calculate_processing_cost") && !calls.some((c) => c.name === "generate_quotation");
}

/**
 * 합산 결과를 코드가 직접 적은 표.
 * 모델이 숫자를 옮겨 적다 자릿수를 틀리는 일이 있어, 답변 끝에 계산값 원본을 붙인다.
 */
function quotationSummary(calls: FunctionCallLog[]): string {
  const last = [...calls].reverse().find((c) => c.name === "generate_quotation");
  const s = (last?.result as Result)?.summary as Record<string, number> | undefined;
  if (!s) return "";
  const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
  return [
    "",
    "",
    "---",
    "[시스템 계산값 — 위 본문과 다르면 이 값이 맞습니다]",
    `원료비 ${won(s.totalMaterialCost)} + 가공비 ${won(s.totalProcessingCost)} + 부자재비 ${won(s.packagingCost)} = 원가 ${won(s.subtotal)}`,
    `이윤(${s.profitRate}%) ${won(s.profitAmount)} → 총액(VAT 별도) ${won(s.totalAmount)}`,
    `생산수량 ${s.productionQty.toLocaleString("ko-KR")}개 · 개당 ${won(s.unitPrice)}(VAT 별도) · 제안 단가 ${won(s.unitPriceIncVat)}(VAT 포함)`,
  ].join("\n");
}

function toToolContent(result: unknown): string {
  const text = JSON.stringify(result);
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}…(이하 생략)` : text;
}

// Function Calling 루프: AI 호출 → 함수 실행 → 반복 (최대 maxIterations 회)
export async function runFunctionCallingLoop(
  messages: ChatMessage[],
  options: { maxIterations?: number; relatedId?: string } = {}
): Promise<{ finalContent: string; functionCalls: FunctionCallLog[]; messages: ChatMessage[] }> {
  const { maxIterations = 6, relatedId } = options;
  const allMessages = [...messages];
  const functionCalls: FunctionCallLog[] = [];
  const seen = new Map<string, unknown>();
  let nudged = false;

  for (let i = 0; i < maxIterations; i++) {
    const response = await chatCompletion({
      messages: allMessages,
      tools: functionDefinitions,
      tool_choice: "auto",
      taskType: "function_call",
      relatedId,
    });

    if (response.tool_calls.length === 0) {
      // 합산을 건너뛰고 직접 계산해 답하려 하면 한 번 되돌려 보낸다
      if (!nudged && skippedQuotation(functionCalls)) {
        nudged = true;
        allMessages.push({ role: "assistant", content: response.content ?? "" });
        allMessages.push({
          role: "user",
          content: "(시스템) 총액과 개당 단가를 직접 계산하지 마세요. 지금까지 확인한 단가로 generate_quotation 을 호출한 뒤, 그 결과로 다시 답하세요.",
        });
        continue;
      }
      // 텍스트 응답 → 루프 종료
      return {
        finalContent: (response.content ?? "") + quotationSummary(functionCalls),
        functionCalls,
        messages: allMessages,
      };
    }

    allMessages.push({ role: "assistant", content: response.content ?? "", tool_calls: response.tool_calls });

    let ranNew = false;
    for (const call of response.tool_calls) {
      const signature = `${call.name}|${call.arguments}`;
      let result = seen.get(signature);

      if (result === undefined) {
        const executed = await executeFunction(call.name, call.arguments);
        result = executed.result;
        seen.set(signature, result);
        functionCalls.push({ name: call.name, args: executed.args, result, durationMs: executed.durationMs });
        ranNew = true;
      }

      allMessages.push({ role: "tool", tool_call_id: call.id, name: call.name, content: toToolContent(result) });
    }

    // 같은 호출만 되풀이하면 더 돌려도 나올 게 없다
    if (!ranNew) break;
  }

  // 최대 반복 도달 시 도구 없이 최종 답변만 받는다
  const finalResponse = await chatCompletion({
    messages: allMessages,
    tools: functionDefinitions,
    tool_choice: "none",
    taskType: "function_call",
    relatedId,
  });

  return {
    finalContent: (finalResponse.content ?? "최대 함수 호출 횟수에 도달했습니다.") + quotationSummary(functionCalls),
    functionCalls,
    messages: allMessages,
  };
}
