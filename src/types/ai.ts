// AI 프로바이더 설정 타입
export interface AiSettingType {
  id: string;
  providerName: string;
  displayName: string;
  baseUrl: string;
  apiKey?: string | null;
  modelName: string;
  priority: number;
  isActive: boolean;
  maxTokens: number;
  temperature: number;
  description?: string | null;
  lastTestedAt?: string | null;
  lastTestResult?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 문의 유형
export type InquiryType = "quotation" | "product" | "simple" | "spam" | "urgent";

// 문의 상태
export type InquiryStatus = "pending" | "ai_processing" | "ai_completed" | "human_review" | "responded" | "closed";

// 문의 우선순위
export type InquiryPriority = "low" | "normal" | "high" | "urgent";

// 문의 게시판 타입
export interface BoardInquiryType {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorEmail?: string | null;
  authorPhone?: string | null;
  status: InquiryStatus;
  inquiryType?: InquiryType | null;
  priority: InquiryPriority;
  confidence?: number | null;
  extractedData?: string | null;
  aiResponse?: string | null;
  adminResponse?: string | null;
  processedAt?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// AI 채팅 세션 타입
export interface AiChatSessionType {
  id: string;
  title: string;
  summary?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: AiChatMessageType[];
}

// AI 채팅 메시지 타입
export interface AiChatMessageType {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "function";
  content: string;
  functionName?: string | null;
  functionArgs?: string | null;
  functionResult?: string | null;
  tokenCount: number;
  createdAt: string;
}

// AI 처리 로그 타입
export interface AiProcessingLogType {
  id: string;
  taskType: string;
  providerUsed: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  isSuccess: boolean;
  isFallback: boolean;
  fallbackFrom?: string | null;
  errorMessage?: string | null;
  relatedId?: string | null;
  functionCalls?: string | null;
  createdAt: string;
}

// AI 문의에서 추출된 데이터
export interface ExtractedInquiryData {
  materials?: { name: string; quantity?: string }[];
  productType?: string;
  productionQty?: number;
  packageUnit?: number;
  missingInfo?: string[];
  additionalNotes?: string;
}

// 함수 호출 로그
export interface FunctionCallLog {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
  durationMs: number;
}
