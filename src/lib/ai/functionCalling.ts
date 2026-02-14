import type { FunctionDef, ChatMessage } from "./aiProvider";
import { chatCompletion } from "./aiClient";
import { searchRawMaterials } from "./functions/searchRawMaterials";
import { getMaterialPrice } from "./functions/getMaterialPrice";
import { calculateProcessingCost } from "./functions/calculateProcessingCost";
import { calculatePackagingCost } from "./functions/calculatePackagingCost";
import { generateQuotation } from "./functions/generateQuotation";
import type { FunctionCallLog } from "@/types/ai";

// 함수 정의 (JSON Schema)
export const functionDefinitions: FunctionDef[] = [
  {
    name: "search_raw_materials",
    description: "원료 데이터베이스에서 원료를 검색합니다. 이름, 코드, 사양으로 검색 가능합니다.",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "검색 키워드 (원료명, 코드, 사양)" },
        category: { type: "string", description: "카테고리 필터 (건기식, 일반식품)" },
      },
      required: ["keyword"],
    },
  },
  {
    name: "get_material_price",
    description: "특정 원료의 단가를 조회하고, 수량에 따른 비용을 계산합니다.",
    parameters: {
      type: "object",
      properties: {
        materialName: { type: "string", description: "원료명 또는 코드" },
        quantityKg: { type: "number", description: "수량 (kg)" },
      },
      required: ["materialName"],
    },
  },
  {
    name: "calculate_processing_cost",
    description: "제형(제품유형)별 가공비를 계산합니다. 정제, 캅셀, 분말스틱 등의 가공비를 산출합니다.",
    parameters: {
      type: "object",
      properties: {
        productTypeName: { type: "string", description: "제품유형명 (예: 정제, 경질캅셀, 분말스틱)" },
        productionQty: { type: "number", description: "생산 수량" },
      },
      required: ["productTypeName", "productionQty"],
    },
  },
  {
    name: "calculate_packaging_cost",
    description: "포장 부자재 비용을 산출합니다. 자재 마스터 데이터를 기반으로 계산합니다.",
    parameters: {
      type: "object",
      properties: {
        productionQty: { type: "number", description: "생산 수량" },
        packageUnit: { type: "number", description: "포장 단위 (1박스당 개수)" },
      },
      required: ["productionQty"],
    },
  },
  {
    name: "generate_quotation",
    description: "원료비, 가공비, 부자재비를 합산하여 최종 견적을 생성합니다.",
    parameters: {
      type: "object",
      properties: {
        productName: { type: "string", description: "제품명" },
        materialCosts: {
          type: "array",
          items: { type: "object", description: "{ name, quantityKg, unitPrice, totalCost }" },
          description: "원료별 비용 목록",
        },
        processingCostPerUnit: { type: "number", description: "단위당 가공비" },
        productionQty: { type: "number", description: "생산 수량" },
        packagingCost: { type: "number", description: "총 부자재비" },
        profitRate: { type: "number", description: "이윤율 (%)" },
      },
      required: ["productName", "materialCosts", "processingCostPerUnit", "productionQty", "packagingCost"],
    },
  },
];

// 함수 실행기
const functionExecutors: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  search_raw_materials: (args) => searchRawMaterials(args as { keyword: string; category?: string }),
  get_material_price: (args) => getMaterialPrice(args as { materialName: string; quantityKg?: number }),
  calculate_processing_cost: (args) => calculateProcessingCost(args as { productTypeName: string; productionQty: number }),
  calculate_packaging_cost: (args) => calculatePackagingCost(args as { productionQty: number; packageUnit?: number }),
  generate_quotation: (args) => generateQuotation(args as Parameters<typeof generateQuotation>[0]),
};

export async function executeFunction(name: string, argsJson: string): Promise<{ result: unknown; durationMs: number }> {
  const executor = functionExecutors[name];
  if (!executor) throw new Error(`Unknown function: ${name}`);

  const args = JSON.parse(argsJson);
  const startTime = Date.now();
  const result = await executor(args);
  const durationMs = Date.now() - startTime;

  return { result, durationMs };
}

// Function Calling 루프: AI 호출 → 함수 실행 → 반복 (최대 maxIterations 회)
export async function runFunctionCallingLoop(
  messages: ChatMessage[],
  maxIterations: number = 5
): Promise<{ finalContent: string; functionCalls: FunctionCallLog[]; messages: ChatMessage[] }> {
  const allMessages = [...messages];
  const functionCalls: FunctionCallLog[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const response = await chatCompletion({
      messages: allMessages,
      functions: functionDefinitions,
      function_call: "auto",
    });

    if (response.function_call) {
      // AI가 함수 호출 요청
      const { name, arguments: argsJson } = response.function_call;
      const parsedArgs = JSON.parse(argsJson);

      const { result, durationMs } = await executeFunction(name, argsJson);

      functionCalls.push({ name, args: parsedArgs, result, durationMs });

      // 함수 호출 및 결과를 메시지에 추가
      allMessages.push({
        role: "assistant",
        content: ``,
        name,
      });
      allMessages.push({
        role: "function",
        content: JSON.stringify(result),
        name,
      });
    } else {
      // 텍스트 응답 → 루프 종료
      return {
        finalContent: response.content ?? "",
        functionCalls,
        messages: allMessages,
      };
    }
  }

  // 최대 반복 도달 시 마지막 텍스트 응답 시도
  const finalResponse = await chatCompletion({
    messages: allMessages,
    function_call: "none",
  });

  return {
    finalContent: finalResponse.content ?? "최대 함수 호출 횟수에 도달했습니다.",
    functionCalls,
    messages: allMessages,
  };
}
