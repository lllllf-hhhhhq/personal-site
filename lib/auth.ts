import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/** 后台会话 Cookie 名称 */
export const SESSION_COOKIE = "ps_admin_session";
/** 会话有效期：8 小时 */
export const SESSION_MAX_AGE = 60 * 60 * 8;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境必须配置长度不少于 16 位的 SESSION_SECRET");
  }
  return "local-development-only-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** 生成「到期时间戳.签名」格式的会话令牌 */
export function createSessionToken(): string {
  const payload = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  try {
    if (!safeEqual(signature, sign(payload))) return false;
  } catch {
    return false;
  }

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/** 未配置 ADMIN_PASSWORD 时一律拒绝登录，避免出现默认口令 */
export function checkPassword(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (typeof input !== "string" || input.length === 0) return false;
  return safeEqual(input, expected);
}

/** 在 Route Handler 中判断当前请求是否已登录 */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
