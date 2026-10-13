/**
 * 고객 문의 접수(로그인 없는 공개 폼)에서 쓰는 것들.
 *
 * 공개 API 는 누구나 부를 수 있다. 그래서 입력은 전부 여기서 검증하고,
 * 고객에게 돌려주는 값도 여기서 정한 것만 내보낸다 — AI 분석 결과나
 * 내부 메모는 절대 나가지 않는다.
 */
import { randomInt } from "node:crypto";

// ── 접수번호 ────────────────────────────────────────────────

/** 헷갈리는 글자(0/O, 1/I/L)를 뺀 31자 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** HP-XXXX-XXXX */
export function generateReceiptNo(): string {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `HP-${pick()}-${pick()}`;
}

/** 고객이 소문자·공백·하이픈 없이 적어도 같은 번호로 읽는다 */
export function normalizeReceiptNo(input: unknown): string | null {
  const raw = String(input ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  // 본문 8자에도 H·P 가 나올 수 있어 길이로 접두어 유무를 가린다
  const body = raw.length === 10 && raw.startsWith("HP") ? raw.slice(2) : raw;
  if (body.length !== 8) return null;
  return `HP-${body.slice(0, 4)}-${body.slice(4)}`;
}

export const normalizeEmail = (input: unknown) => String(input ?? "").trim().toLowerCase();

// ── 입력 검증 ───────────────────────────────────────────────

export interface PublicInquiryInput {
  authorName: string;
  company: string | null;
  authorEmail: string;
  authorPhone: string | null;
  title: string;
  content: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePublicInquiry(
  body: Record<string, unknown>
): { ok: true; data: PublicInquiryInput } | { ok: false; error: string } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const authorName = str(body.authorName);
  const company = str(body.company);
  const authorEmail = normalizeEmail(body.authorEmail);
  const authorPhone = str(body.authorPhone);
  const title = str(body.title);
  const content = str(body.content);

  if (!authorName || authorName.length > 50) return { ok: false, error: "이름을 50자 이내로 입력해주세요." };
  if (company.length > 100) return { ok: false, error: "회사명은 100자 이내로 입력해주세요." };
  if (!EMAIL_RE.test(authorEmail) || authorEmail.length > 200) return { ok: false, error: "이메일 주소를 확인해주세요." };
  if (authorPhone.length > 30) return { ok: false, error: "연락처는 30자 이내로 입력해주세요." };
  if (!title || title.length > 150) return { ok: false, error: "제목을 150자 이내로 입력해주세요." };
  if (content.length < 10) return { ok: false, error: "문의 내용을 10자 이상 입력해주세요." };
  if (content.length > 5000) return { ok: false, error: "문의 내용은 5,000자 이내로 입력해주세요." };
  if (body.consent !== true) return { ok: false, error: "개인정보 수집·이용에 동의해주세요." };

  return {
    ok: true,
    data: { authorName, company: company || null, authorEmail, authorPhone: authorPhone || null, title, content },
  };
}

// ── 고객에게 보여주는 상태 ──────────────────────────────────

/** 내부 상태(AI 처리중·검토 필요 등)는 고객에게 그대로 보여주지 않는다 */
export function publicStatus(status: string): { code: "received" | "answered" | "closed"; label: string } {
  if (status === "responded") return { code: "answered", label: "답변 완료" };
  if (status === "closed") return { code: "closed", label: "종료" };
  return { code: "received", label: "접수 · 담당자 확인 중" };
}

// ── 요청 제한 ───────────────────────────────────────────────

const buckets = new Map<string, number[]>();

/**
 * 메모리 기반 요청 제한. 서버가 한 대라 이걸로 충분하다.
 * 허용되면 true. 창(windowMs) 안에 limit 번을 넘으면 false.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);

  // 오래된 키가 쌓이지 않게 가끔 비운다
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return true;
}

/**
 * 요청한 쪽 주소. nginx 가 X-Real-IP 를 실제 접속 주소로 덮어써서 넘긴다.
 * X-Forwarded-For 의 앞쪽 값은 보내는 쪽이 지어낼 수 있어 믿지 않는다 —
 * 그걸 키로 쓰면 헤더만 바꿔 요청 제한을 피할 수 있다.
 */
export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return forwarded || "unknown";
}
