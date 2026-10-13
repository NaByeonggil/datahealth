/** 홈페이지(factory) 게시판을 읽어온 모양 — factory 의 /api/integration/board, .../thread 응답 */

export const FACTORY_BOARD_LABELS = {
  food: "건기식 생산문의",
  pet: "펫제품 생산문의",
} as const;
export type FactoryBoardKey = keyof typeof FACTORY_BOARD_LABELS;

/** 홈페이지의 문의 처리 단계 */
export const FACTORY_STATUS_LABELS: Record<string, string> = {
  NEW: "접수", CONTACTED: "상담중", QUOTED: "견적발송", CONTRACTED: "계약", CLOSED: "종료", SPAM: "스팸",
};

export interface FactoryBoardItem {
  id: string;
  no: number;
  title: string;
  serviceType: string;
  name: string;
  company: string | null;
  status: string;
  /** 운영자 답변이 한 번이라도 달렸는가 */
  answered: boolean;
  /** 답변 뒤에 고객이 다시 글을 남겼는가 */
  customerWaiting: boolean;
  replyCount: number;
  createdAt: string;
}

export interface FactoryBoardPage {
  items: FactoryBoardItem[];
  total: number;
  /** 이 게시판에서 아직 답변이 없는 문의 수 */
  waitingCount: number;
  page: number;
  pageCount: number;
}

interface FactoryFile { filename: string; size: number }

export interface FactoryReply {
  id: string;
  authorType: "CUSTOMER" | "ADMIN";
  authorName: string;
  body: string;
  createdAt: string;
  files: FactoryFile[];
}

export interface FactoryThread {
  id: string;
  title: string;
  serviceType: string;
  /** 홈페이지에서 이 문의가 실린 게시판 경로 (/quote, /quote/pet …) */
  board: string;
  status: string;
  name: string;
  company: string | null;
  formulations: string[];
  packagings: string[];
  quantity: string | null;
  budget: string | null;
  targetDate: string | null;
  targetAudience: string | null;
  healthConcern: string | null;
  materialType: string | null;
  ownedAssets: string[];
  targetPrice: string | null;
  message: string | null;
  /** 고객이 이메일을 남겼는가 (메일 알림을 보낼 수 있는가) */
  hasEmail: boolean;
  createdAt: string;
  files: FactoryFile[];
  /** 답글 스레드 이전 방식으로 등록된 공개 답변 */
  answer: { body: string; authorName: string | null; createdAt: string | null } | null;
  replies: FactoryReply[];
  /** 이쪽 문의 게시판의 같은 문의 (AI 분석 화면) */
  boardInquiryId: string | null;
  aiDraft: string | null;
  factoryAdminUrl: string;
}
