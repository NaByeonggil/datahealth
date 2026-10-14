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
  company?: string | null;
  source?: "internal" | "factory";
  externalId?: string | null;
  /** 홈페이지 관리자의 이 문의 화면 (source 가 factory 일 때) */
  factoryAdminUrl?: string | null;
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
  /** 고객이 요청한 인증 (HACCP, GMP, 유기농 …). 언급이 없으면 "추후 결정" */
  certification?: string;
  /** 견적 초안에 적용한 기본 조건 — lib/ai/inquiryDefaults */
  quoteBasis?: {
    /** "30정" / "30포" */
    packageUnitLabel: string;
    /** 고객이 포장단위를 적지 않아 기본값을 썼는가 */
    packageUnitAssumed: boolean;
    /** 고객이 적은 수량 (없으면 비움) */
    requestedQty?: number;
    /** 최소 주문수량으로 올려 잡았는가 */
    moqApplied: boolean;
    packagingNote: string;
  };
  missingInfo?: string[];
  additionalNotes?: string;
  /** AI 가 마스터 단가로 뽑은 추정 견적 — 내부 참고용, 고객·홈페이지로 나가지 않는다 */
  internalEstimate?: { totalAmount: number; unitPrice: number; productionQty: number };
}

// 함수 호출 로그
export interface FunctionCallLog {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
  durationMs: number;
}
