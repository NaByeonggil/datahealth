import { prisma } from "@/lib/prisma";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  FunctionDef,
  ToolCall,
} from "./aiProvider";

type Provider = {
  id: string;
  providerName: string;
  displayName: string;
  baseUrl: string;
  apiKey: string | null;
  modelName: string;
  maxTokens: number;
  temperature: number;
};

/** 서버가 켜져 있는지 확인하는 데 쓰는 시간. 꺼진 PC 를 오래 기다리지 않는다. */
const PROBE_TIMEOUT_MS = 3000;
/** 응답 생성 제한 시간. 로컬 모델은 첫 호출(모델 적재)이 느리다. */
const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 180_000;
const MODEL_CACHE_MS = 60_000;

/** AI 서버에 닿지 못함 — PC 가 꺼져 있거나 LLM 서버가 안 떠 있다 */
export class AiUnavailableError extends Error {}

class AiHttpError extends Error {
  constructor(public status: number, public body: string) {
    super(`API error: ${status} ${body.slice(0, 500)}`);
  }
}

const isClaude = (p: Provider) => p.providerName === "claude";
const baseUrlOf = (p: Provider) => p.baseUrl.replace(/\/+$/, "");

function headersOf(p: Provider): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isClaude(p)) {
    if (p.apiKey) headers["x-api-key"] = p.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (p.apiKey) {
    headers["Authorization"] = `Bearer ${p.apiKey}`;
  }
  return headers;
}

// ── 서버 확인 ────────────────────────────────────────────────

const modelCache = new Map<string, { models: string[]; at: number }>();

/**
 * 서버가 떠 있는지 확인하고, 올라와 있는 모델 목록을 돌려준다.
 * 닿지 않으면 AiUnavailableError.
 */
async function probeServer(p: Provider, fresh = false): Promise<string[]> {
  if (isClaude(p)) return [];

  const key = `${p.id}|${baseUrlOf(p)}`;
  const cached = modelCache.get(key);
  if (!fresh && cached && Date.now() - cached.at < MODEL_CACHE_MS) return cached.models;

  let res: Response;
  try {
    res = await fetch(`${baseUrlOf(p)}/models`, {
      headers: headersOf(p),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch {
    modelCache.delete(key);
    throw new AiUnavailableError(`${p.displayName} 서버(${baseUrlOf(p)})에 연결할 수 없습니다.`);
  }

  let models: string[] = [];
  if (res.ok) {
    try {
      const data = await res.json();
      const list: { id?: string; name?: string; model?: string }[] = data.data ?? data.models ?? [];
      models = list
        .map((m) => m.id ?? m.name ?? m.model)
        .filter((v): v is string => typeof v === "string");
    } catch { /* 목록을 못 읽어도 서버는 떠 있다 */ }
  }
  modelCache.set(key, { models, at: Date.now() });
  return models;
}

/** 설정된 모델명이 서버에 없으면, 서버에 실제로 올라와 있는 모델을 쓴다 */
function resolveModel(p: Provider, served: string[]): string {
  if (served.length === 0 || served.includes(p.modelName)) return p.modelName;
  return served[0];
}

/** 지금 쓸 수 있는 프로바이더가 하나라도 있는가 (로그를 남기지 않는 가벼운 확인) */
export async function isAiAvailable(): Promise<boolean> {
  const providers = await prisma.aiSetting.findMany({
    where: { isActive: true },
    orderBy: { priority: "asc" },
  });
  for (const p of providers) {
    if (isClaude(p)) {
      if (p.apiKey) return true;
      continue;
    }
    try {
      await probeServer(p);
      return true;
    } catch { /* 다음 프로바이더 */ }
  }
  return false;
}

// ── 도구 호출: 텍스트 방식 (서버가 tools 를 못 받을 때) ─────────

/** tools 형식을 거절한 프로바이더 — 이후로는 프롬프트 방식으로 부른다 */
const promptModeProviders = new Set<string>();

function toolPrompt(tools: FunctionDef[], allowCall: boolean): string {
  if (!allowCall) return "\n\n지금은 도구를 호출하지 말고, 지금까지의 결과로 최종 답변만 작성하세요.";
  const list = tools
    .map((t) => `- ${t.name}: ${t.description}\n  인자: ${JSON.stringify(t.parameters)}`)
    .join("\n");
  return `

## 도구 호출 형식
아래 도구를 쓸 수 있습니다.
${list}

도구가 필요하면 다른 말 없이 아래 JSON 한 개만 출력하세요.
\`\`\`json
{"name": "도구이름", "arguments": {"인자": "값"}}
\`\`\`
도구 결과를 받은 뒤 더 필요한 도구가 없으면 한국어로 최종 답변을 작성하세요.`;
}

/** 모델이 글로 적어낸 도구 호출(JSON)을 읽어낸다. Gemma 류는 tool_calls 대신 본문에 적는 일이 있다. */
function parseTextToolCalls(text: string, toolNames: string[]): ToolCall[] {
  const candidates: string[] = [];
  for (const m of text.matchAll(/```(?:json|tool_call|tool_code)?\s*([\s\S]*?)```/g)) candidates.push(m[1]);
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) candidates.push(trimmed);
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) candidates.push(brace[0]);

  for (const candidate of candidates) {
    let parsed: unknown;
    try { parsed = JSON.parse(candidate.trim()); } catch { continue; }

    const calls: ToolCall[] = [];
    for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const fn = obj.function && typeof obj.function === "object" ? (obj.function as Record<string, unknown>) : obj;
      const name = fn.name ?? obj.tool ?? obj.function;
      if (typeof name !== "string" || !toolNames.includes(name)) continue;
      const args = fn.arguments ?? fn.parameters ?? fn.args ?? {};
      calls.push({
        id: `call_${Date.now()}_${calls.length}`,
        name,
        arguments: typeof args === "string" ? args : JSON.stringify(args),
      });
    }
    if (calls.length > 0) return calls;
  }
  return [];
}

// ── 메시지 변환 ──────────────────────────────────────────────

type WireMessage = Record<string, unknown> & { role: string; content: unknown };

/** 같은 역할이 연달아 오면 합친다. Gemma 템플릿은 user/assistant 가 번갈아 와야 한다. */
function pushMerged(out: WireMessage[], role: string, content: string) {
  const last = out[out.length - 1];
  if (last && last.role === role && typeof last.content === "string" && !last.tool_calls) {
    last.content = `${last.content}\n\n${content}`;
  } else {
    out.push({ role, content });
  }
}

function toOpenAiMessages(messages: ChatMessage[]): WireMessage[] {
  const out: WireMessage[] = [];
  for (const m of messages) {
    if (m.role === "assistant" && m.tool_calls?.length) {
      out.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });
    } else if (m.role === "tool") {
      out.push({ role: "tool", tool_call_id: m.tool_call_id, name: m.name, content: m.content });
    } else {
      pushMerged(out, m.role, m.content);
    }
  }
  return out;
}

/** 도구 호출을 본문 텍스트로 풀어 쓴 메시지 — tools 를 못 받는 서버용 */
function toPromptModeMessages(messages: ChatMessage[], tools: FunctionDef[], allowCall: boolean): WireMessage[] {
  const out: WireMessage[] = [];
  const suffix = toolPrompt(tools, allowCall);
  const hasSystem = messages.some((m) => m.role === "system");
  if (!hasSystem) out.push({ role: "system", content: suffix.trim() });

  for (const m of messages) {
    if (m.role === "system") {
      pushMerged(out, "system", m.content + suffix);
    } else if (m.role === "assistant" && m.tool_calls?.length) {
      const calls = m.tool_calls
        .map((tc) => `\`\`\`json\n{"name": "${tc.name}", "arguments": ${tc.arguments || "{}"}}\n\`\`\``)
        .join("\n");
      pushMerged(out, "assistant", calls);
    } else if (m.role === "tool") {
      pushMerged(out, "user", `[도구 결과: ${m.name ?? ""}]\n${m.content}`);
    } else {
      pushMerged(out, m.role, m.content);
    }
  }
  return out;
}

// ── 호출 ─────────────────────────────────────────────────────

async function postJson(url: string, p: Provider, body: unknown): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: headersOf(p),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`${p.displayName} 응답 시간 초과 (${Math.round(REQUEST_TIMEOUT_MS / 1000)}초)`);
    }
    modelCache.clear();
    throw new AiUnavailableError(`${p.displayName} 서버(${baseUrlOf(p)})에 연결할 수 없습니다.`);
  }
  if (!res.ok) throw new AiHttpError(res.status, await res.text());
  return res.json();
}

async function callOpenAiCompatible(
  p: Provider,
  model: string,
  request: ChatCompletionRequest,
  mode: "native" | "prompt"
): Promise<ChatCompletionResponse> {
  const tools = request.tools ?? [];
  const allowCall = request.tool_choice !== "none";

  const body: Record<string, unknown> = {
    model,
    messages:
      mode === "prompt" && tools.length > 0
        ? toPromptModeMessages(request.messages, tools, allowCall)
        : toOpenAiMessages(request.messages),
    max_tokens: request.max_tokens ?? p.maxTokens,
    temperature: request.temperature ?? p.temperature,
  };
  if (mode === "native" && tools.length > 0) {
    body.tools = tools.map((f) => ({ type: "function", function: f }));
    body.tool_choice = request.tool_choice ?? "auto";
  }
  if (request.json) body.response_format = { type: "json_object" };
  // llama.cpp 계열 전용 옵션 — OpenAI 본가는 모르는 필드를 거절한다
  if (request.thinking === false && p.providerName !== "openai") {
    body.chat_template_kwargs = { enable_thinking: false };
  }

  const data = await postJson(`${baseUrlOf(p)}/chat/completions`, p, body);
  const choice = (data.choices as { message?: Record<string, unknown> }[] | undefined)?.[0];
  if (!choice) throw new Error("No choice in response");

  let content = (choice.message?.content as string | null | undefined) || null;
  const rawCalls = (choice.message?.tool_calls ?? []) as {
    id?: string;
    function?: { name?: string; arguments?: unknown };
  }[];
  let toolCalls: ToolCall[] = rawCalls
    .filter((tc) => typeof tc.function?.name === "string")
    .map((tc, i) => ({
      id: tc.id ?? `call_${Date.now()}_${i}`,
      name: tc.function!.name as string,
      arguments:
        typeof tc.function!.arguments === "string"
          ? tc.function!.arguments
          : JSON.stringify(tc.function!.arguments ?? {}),
    }));

  // tool_calls 없이 본문에 호출 JSON 을 적어낸 경우
  if (toolCalls.length === 0 && tools.length > 0 && allowCall && content) {
    toolCalls = parseTextToolCalls(content, tools.map((t) => t.name));
    if (toolCalls.length > 0) content = null;
  }

  // 추론만 하다 토큰을 다 쓴 경우 — 빈 답을 성공으로 넘기지 않는다
  if (!content && toolCalls.length === 0) {
    throw new Error(`${p.displayName} 가 빈 응답을 돌려줬습니다 (max_tokens 부족 가능).`);
  }

  return {
    content,
    tool_calls: toolCalls,
    usage: data.usage as ChatCompletionResponse["usage"],
    provider: p.providerName,
    model,
  };
}

function safeParseObject(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

async function callClaude(p: Provider, request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  type Block = Record<string, unknown>;
  const messages: { role: "user" | "assistant"; content: Block[] }[] = [];
  const push = (role: "user" | "assistant", blocks: Block[]) => {
    if (blocks.length === 0) return;
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content.push(...blocks);
    else messages.push({ role, content: blocks });
  };

  for (const m of request.messages) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      push("user", [{ type: "tool_result", tool_use_id: m.tool_call_id, content: m.content }]);
    } else if (m.role === "assistant") {
      const blocks: Block[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const tc of m.tool_calls ?? []) {
        blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: safeParseObject(tc.arguments) });
      }
      push("assistant", blocks);
    } else if (m.content) {
      push("user", [{ type: "text", text: m.content }]);
    }
  }

  const body: Record<string, unknown> = {
    model: p.modelName,
    max_tokens: request.max_tokens ?? p.maxTokens,
    temperature: request.temperature ?? p.temperature,
    messages,
  };
  const system = request.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  if (system) body.system = system;
  if (request.tools?.length) {
    body.tools = request.tools.map((f) => ({ name: f.name, description: f.description, input_schema: f.parameters }));
    body.tool_choice = { type: request.tool_choice === "none" ? "none" : "auto" };
  }

  const data = await postJson(`${baseUrlOf(p)}/messages`, p, body);
  const blocks = (data.content ?? []) as { type: string; text?: string; id?: string; name?: string; input?: unknown }[];
  const text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  const usage = data.usage as { input_tokens: number; output_tokens: number } | undefined;

  return {
    content: text || null,
    tool_calls: blocks
      .filter((b) => b.type === "tool_use")
      .map((b) => ({ id: b.id ?? "", name: b.name ?? "", arguments: JSON.stringify(b.input ?? {}) })),
    usage: usage
      ? {
          prompt_tokens: usage.input_tokens,
          completion_tokens: usage.output_tokens,
          total_tokens: usage.input_tokens + usage.output_tokens,
        }
      : undefined,
    provider: p.providerName,
    model: p.modelName,
  };
}

/** tools 형식 자체를 서버가 못 받아서 난 오류인가 */
function isToolFormatError(error: unknown): boolean {
  return (
    error instanceof AiHttpError &&
    error.status >= 400 &&
    error.status <= 501 &&
    /tool|jinja|template|function/i.test(error.body)
  );
}

async function callProvider(p: Provider, request: ChatCompletionRequest, freshProbe = false): Promise<ChatCompletionResponse> {
  if (isClaude(p)) return callClaude(p, request);

  const model = resolveModel(p, await probeServer(p, freshProbe));
  const useTools = (request.tools?.length ?? 0) > 0;

  if (useTools && !promptModeProviders.has(p.id)) {
    try {
      return await callOpenAiCompatible(p, model, request, "native");
    } catch (error) {
      if (!isToolFormatError(error)) throw error;
      promptModeProviders.add(p.id);
    }
  }
  return callOpenAiCompatible(p, model, request, useTools ? "prompt" : "native");
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

  const taskType = request.taskType ?? "chat";
  const relatedId = request.relatedId ?? null;
  const errors: Error[] = [];
  const firstProvider = providers[0].providerName;

  for (const provider of providers) {
    const startTime = Date.now();
    const isFallback = provider.providerName !== firstProvider;

    try {
      const response = await callProvider(provider, request);

      await prisma.aiProcessingLog.create({
        data: {
          taskType,
          relatedId,
          providerUsed: provider.providerName,
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          latencyMs: Date.now() - startTime,
          isSuccess: true,
          isFallback,
          fallbackFrom: isFallback ? firstProvider : null,
          functionCalls: response.tool_calls.length > 0 ? JSON.stringify(response.tool_calls.map((t) => t.name)) : null,
        },
      });

      return { ...response, isFallback, fallbackFrom: isFallback ? firstProvider : undefined };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);

      await prisma.aiProcessingLog.create({
        data: {
          taskType,
          relatedId,
          providerUsed: provider.providerName,
          latencyMs: Date.now() - startTime,
          isSuccess: false,
          isFallback,
          fallbackFrom: isFallback ? firstProvider : null,
          errorMessage: err.message,
        },
      });
    }
  }

  const allOffline: boolean = errors.every((e) => e instanceof AiUnavailableError);
  if (allOffline) {
    throw new AiUnavailableError(
      `AI 서버에 연결할 수 없습니다. AI PC가 켜져 있고 LLM 서버가 실행 중인지 확인해주세요. (${errors.map((e) => e.message).join(" / ")})`
    );
  }
  throw new Error(`모든 AI 프로바이더 호출 실패: ${errors[errors.length - 1]?.message}`);
}

// 연결 테스트
export async function testProviderConnection(providerId: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const provider = await prisma.aiSetting.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error("프로바이더를 찾을 수 없습니다.");

  const startTime = Date.now();

  try {
    const response = await callProvider(
      provider,
      { messages: [{ role: "user", content: "Hello, respond with 'OK' only." }], max_tokens: 10, temperature: 0, thinking: false },
      true
    );

    const latencyMs = Date.now() - startTime;

    await prisma.aiSetting.update({
      where: { id: providerId },
      data: { lastTestedAt: new Date(), lastTestResult: "success" },
    });

    return { success: true, message: `연결 성공 · 모델: ${response.model}`, latencyMs };
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
