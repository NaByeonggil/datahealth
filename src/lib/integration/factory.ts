/**
 * 홈페이지(factory, factory.cancerwith.kr)와의 연동.
 *
 * 두 앱은 같은 서버의 같은 도커 네트워크에 있고, 서로를 부를 때 로그인 대신
 * 공유 비밀키(INTEGRATION_SECRET)로 만든 서명을 확인한다.
 * 같은 규칙이 factory 의 src/lib/datahealth.ts 에 있다 — 한쪽을 고치면 다른 쪽도 고친다.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** 요청 시각 허용 오차 — 가로챈 요청을 나중에 다시 보내는 것을 막는다 */
const MAX_SKEW_MS = 5 * 60 * 1000;

export const factorySiteUrl = () =>
  (process.env.FACTORY_SITE_URL || "https://factory.cancerwith.kr").replace(/\/+$/, "");

function secret(): string | null {
  const value = process.env.INTEGRATION_SECRET;
  return value && value.length >= 32 ? value : null;
}

export const integrationConfigured = () => secret() !== null;

function hmac(payload: string): string {
  return createHmac("sha256", secret() ?? "").update(payload).digest("hex");
}

function sameSignature(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * API 요청 서명 확인.
 * 서명 대상: `<시각>.<METHOD>.<경로>.<본문>`
 */
export function verifyRequestSignature(request: Request, path: string, body: string): boolean {
  if (!secret()) return false;
  const timestamp = request.headers.get("x-integration-timestamp") ?? "";
  const signature = request.headers.get("x-integration-signature") ?? "";
  if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) return false;
  return sameSignature(signature, hmac(`${timestamp}.${request.method}.${path}.${body}`));
}

// ── 자동 로그인 토큰 ────────────────────────────────────────

export interface SsoClaims {
  email: string;
  name: string;
  role: string;
  /** 만료 시각 (ms) */
  exp: number;
  /** 한 번만 쓰이게 하는 난수 */
  nonce: string;
}

/** 이미 쓴 토큰 — 주소창·기록에 남은 링크로 다시 들어오지 못하게 한다 */
const usedNonces = new Map<string, number>();

/** `<base64url(claims)>.<서명>` 형식의 토큰을 확인하고, 한 번 쓰면 폐기한다 */
export function consumeSsoToken(token: string): SsoClaims | null {
  if (!secret()) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !sameSignature(signature, hmac(`sso.${encoded}`))) return null;

  let claims: SsoClaims;
  try {
    claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const now = Date.now();
  if (typeof claims.exp !== "number" || claims.exp < now || claims.exp - now > MAX_SKEW_MS) return null;
  if (!claims.nonce || !claims.email) return null;

  for (const [nonce, exp] of usedNonces) if (exp < now) usedNonces.delete(nonce);
  if (usedNonces.has(claims.nonce)) return null;
  usedNonces.set(claims.nonce, claims.exp);

  return claims;
}

/**
 * 홈페이지 계정 → 이쪽 계정.
 * SSO_USER_MAP="홈페이지이메일:아이디,..." 에 적힌 짝만 통과시킨다.
 * 원가가 걸린 시스템이라, 짝이 없는 계정을 알아서 만들어 주지 않는다.
 */
export function mappedUsername(email: string): string | null {
  const pairs = (process.env.SSO_USER_MAP ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  for (const pair of pairs) {
    const idx = pair.lastIndexOf(":");
    if (idx <= 0) continue;
    if (pair.slice(0, idx).trim().toLowerCase() === email.trim().toLowerCase()) return pair.slice(idx + 1).trim();
  }
  return null;
}
