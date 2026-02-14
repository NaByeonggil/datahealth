import { prisma } from "@/lib/prisma";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
} from "./aiProvider";

// 프로바이더별 API 호출
async function callProvider(
  provider: { providerName: string; baseUrl: string; apiKey: string | null; modelName: string; maxTokens: number; temperature: number },
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const isOpenAI = provider.providerName === "openai";
  const isClaude = provider.providerName === "claude";

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (isClaude) {
    if (provider.apiKey) headers["x-api-key"] = provider.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;
  }

  const maxTokens = request.max_tokens ?? provider.maxTokens;
  const temperature = request.temperature ?? provider.temperature;

  if (isClaude) {
    // Anthropic Messages API
    const systemMsg = request.messages.find((m) => m.role === "system");
    const nonSystemMsgs = request.messages.filter((m) => m.role !== "system");

    const claudeMessages = nonSystemMsgs.map((m) => ({
      role: m.role === "function" ? "user" : m.role === "assistant" ? "assistant" : "user",
      content: m.role === "function" ? `[함수 결과: ${m.name}]\n${m.content}` : m.content,
    }));

    // Build tools from functions
    const tools = request.functions?.map((f) => ({
      name: f.name,
      description: f.description,
      input_schema: f.parameters,
    }));

    const body: Record<string, unknown> = {
      model: provider.modelName,
      max_tokens: maxTokens,
      temperature,
      messages: claudeMessages,
    };
    if (systemMsg) body.system = systemMsg.content;
    if (tools && tools.length > 0) body.tools = tools;

    const res = await fetch(`${provider.baseUrl}/messages`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Claude API error: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
    const toolBlock = data.content?.find((b: { type: string }) => b.type === "tool_use");

    return {
      content: textBlock?.text ?? null,
      function_call: toolBlock ? { name: toolBlock.name, arguments: JSON.stringify(toolBlock.input) } : undefined,
      usage: data.usage ? { prompt_tokens: data.usage.input_tokens, completion_tokens: data.usage.output_tokens, total_tokens: data.usage.input_tokens + data.usage.output_tokens } : undefined,
      provider: provider.providerName,
    };
  }

  // OpenAI-compatible API (OpenAI / llama.cpp)
  const body: Record<string, unknown> = {
    model: provider.modelName,
    messages: request.messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.name ? { name: m.name } : {}),
    })),
    max_tokens: maxTokens,
    temperature,
  };

  if (request.functions && request.functions.length > 0) {
    if (isOpenAI) {
      // OpenAI uses tools format
      body.tools = request.functions.map((f) => ({ type: "function", function: f }));
      if (request.function_call) {
        body.tool_choice = request.function_call === "auto" ? "auto" : request.function_call === "none" ? "none" : { type: "function", function: { name: (request.function_call as { name: string }).name } };
      }
    } else {
      // llama.cpp uses functions format directly
      body.functions = request.functions;
      if (request.function_call) body.function_call = request.function_call;
    }
  }

  const url = `${provider.baseUrl}/chat/completions`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const choice = data.choices?.[0];
  if (!choice) throw new Error("No choice in response");

  let functionCall = choice.message?.function_call;
  // OpenAI tools format
  if (!functionCall && choice.message?.tool_calls?.[0]) {
    const tc = choice.message.tool_calls[0];
    functionCall = { name: tc.function.name, arguments: tc.function.arguments };
  }

  return {
    content: choice.message?.content ?? null,
    function_call: functionCall,
    usage: data.usage,
    provider: provider.providerName,
  };
}

// 메인 AI 클라이언트: 프로바이더를 우선순위 순으로 시도하고 폴백
export async function chatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse & { isFallback: boolean; fallbackFrom?: string }> {
  const providers = await prisma.aiSetting.findMany({
    where: { isActive: true },
    orderBy: { priority: "asc" },
  });

  if (providers.length === 0) {
    throw new Error("활성화된 AI 프로바이더가 없습니다. AI 설정을 확인해주세요.");
  }

  let lastError: Error | null = null;
  let firstProvider: string | null = null;

  for (const provider of providers) {
    if (!firstProvider) firstProvider = provider.providerName;
    const startTime = Date.now();

    try {
      const response = await callProvider(provider, request);
      const latencyMs = Date.now() - startTime;

      // 로그 기록
      await prisma.aiProcessingLog.create({
        data: {
          taskType: "chat",
          providerUsed: provider.providerName,
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          latencyMs,
          isSuccess: true,
          isFallback: provider.providerName !== firstProvider,
          fallbackFrom: provider.providerName !== firstProvider ? firstProvider : null,
        },
      });

      return {
        ...response,
        isFallback: provider.providerName !== firstProvider!,
        fallbackFrom: provider.providerName !== firstProvider! ? firstProvider! : undefined,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      lastError = error instanceof Error ? error : new Error(String(error));

      // 실패 로그 기록
      await prisma.aiProcessingLog.create({
        data: {
          taskType: "chat",
          providerUsed: provider.providerName,
          latencyMs,
          isSuccess: false,
          isFallback: provider.providerName !== firstProvider,
          fallbackFrom: provider.providerName !== firstProvider ? firstProvider : null,
          errorMessage: lastError.message,
        },
      });
    }
  }

  throw new Error(`모든 AI 프로바이더 호출 실패: ${lastError?.message}`);
}

// 연결 테스트
export async function testProviderConnection(providerId: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const provider = await prisma.aiSetting.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error("프로바이더를 찾을 수 없습니다.");

  const startTime = Date.now();

  try {
    await callProvider(provider, {
      messages: [{ role: "user", content: "Hello, respond with 'OK' only." }],
      max_tokens: 10,
      temperature: 0,
    });

    const latencyMs = Date.now() - startTime;

    await prisma.aiSetting.update({
      where: { id: providerId },
      data: { lastTestedAt: new Date(), lastTestResult: "success" },
    });

    return { success: true, message: "연결 성공", latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);

    await prisma.aiSetting.update({
      where: { id: providerId },
      data: { lastTestedAt: new Date(), lastTestResult: "failed" },
    });

    return { success: false, message, latencyMs };
  }
}
