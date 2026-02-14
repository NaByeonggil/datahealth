// AI 프로바이더 공통 인터페이스 정의

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  name?: string; // function role일 때 함수명
}

export interface FunctionParameter {
  type: string;
  description?: string;
  enum?: string[];
}

export interface FunctionDef {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, FunctionParameter | { type: string; items?: FunctionParameter; description?: string }>;
    required?: string[];
  };
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  functions?: FunctionDef[];
  function_call?: "auto" | "none" | { name: string };
  max_tokens?: number;
  temperature?: number;
}

export interface FunctionCallResponse {
  name: string;
  arguments: string; // JSON string
}

export interface ChatCompletionResponse {
  content: string | null;
  function_call?: FunctionCallResponse;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  provider: string;
}
