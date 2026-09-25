/**
 * 비밀번호 해싱 — node 내장 scrypt 를 쓴다.
 *
 * bcrypt/argon2 는 네이티브 빌드가 필요해 설치·배포가 번거롭다. scrypt 는 Node 표준
 * 라이브러리이고 메모리 하드해서 이 규모에는 충분하다.
 *
 * 저장 형식: scrypt$N$r$p$<salt hex>$<hash hex>
 * 파라미터를 함께 적어두므로 나중에 세기를 올려도 옛 해시를 그대로 검증할 수 있다.
 */
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number }
) => Promise<Buffer>;

const N = 16384; // 2^14 — 기본값
const R = 8;
const P = 1;
const KEYLEN = 64;
// scrypt 기본 maxmem(32MB)은 N=16384,r=8 에서 아슬아슬하다. 넉넉히 준다.
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** 형식이 깨졌거나 맞지 않으면 false. 예외를 던지지 않는다(로그인 실패로 다룬다). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [, n, r, p, saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");

    const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM,
    });

    // 길이가 다르면 timingSafeEqual 이 던진다 — 먼저 거른다
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** 너무 약한 비밀번호를 막는다. 맞으면 null, 아니면 사유 문구 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (password.length > 200) return "비밀번호가 너무 깁니다.";
  if (/^\d+$/.test(password)) return "숫자로만 이루어진 비밀번호는 쓸 수 없습니다.";
  return null;
}
