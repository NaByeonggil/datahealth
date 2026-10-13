// AI 프로바이더 공통 인터페이스 정의
//
// 메시지 형식은 OpenAI 표준(tools / tool_calls / tool 역할)을 기준으로 한다.
// llama.cpp · Ollama · LM Studio 같은 로컬 서버가 모두 이 형식을 받는다.

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** assistant 가 도구를 부른 턴 */
  tool_calls?: ToolCall[];
  /** tool 역할일 때 — 어떤 호출의 결과인지 */
  tool_call_id?: string;
  name?: string;
}

export interface JsonSchema {
  type: string;
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
}

export interface FunctionDef {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, JsonSchema>;
    required?: string[];
  };
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  tools?: FunctionDef[];
  tool_choice?: "auto" | "none";
  /** JSON 객체 하나만 출력하도록 강제 (분류·추출용) */
  json?: boolean;
  /**
   * false 면 추론(thinking)을 끈다. Gemma 류는 추론이 max_tokens 를 다 써서
   * 본문이 빈 채로 끝나는 일이 있어, 짧은 정형 출력에는 끄는 편이 안전하다.
   */
  thinking?: boolean;
  max_tokens?: number;
  temperature?: number;
  /** 로그에 남길 작업 종류: chat, classify, extract, function_call, generate_response */
  taskType?: string;
  /** 로그에 남길 관련 문의/세션 ID */
  relatedId?: string;
}

export interface ChatCompletionResponse {
  content: string | null;
  tool_calls: ToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  provider: string;
  /** 실제로 호출한 모델명 (서버에 올라와 있는 모델로 자동 대체될 수 있다) */
  model: string;
}
