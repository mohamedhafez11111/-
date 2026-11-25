/**
 * جلسات الإدارة: ملف تعريف ارتباط موقّع بـ HMAC-SHA256 (Web Crypto) يعمل في Edge وNode.
 * كلمات المرور تُقرأ من متغيرات البيئة في الخادم فقط ولا تُرسل إلى المتصفح.
 */
export type Role = "admin" | "teacher";
export const SESSION_COOKIE = "m10_session";
const MAX_AGE = 8 * 60 * 60; // 8 ساعات

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export function sessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSession(role: Role): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload = b64url(enc.encode(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + MAX_AGE })));
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifySession(token: string | undefined | null): Promise<{ role: Role } | null> {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sig, await hmac(payload, secret))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { role: Role; exp: number };
    if (data.exp < Date.now() / 1000) return null;
    if (data.role !== "admin" && data.role !== "teacher") return null;
    return { role: data.role };
  } catch {
    return null;
  }
}

/** مقارنة كلمة المرور بزمن ثابت عبر مقارنة البصمات */
export async function checkPassword(role: Role, password: string): Promise<boolean> {
  const expected = role === "admin" ? process.env.ADMIN_PASSWORD : process.env.TEACHER_PASSWORD;
  if (!expected || expected.length < 8) return false;
  const secret = sessionSecret() ?? "m10";
  const [a, b] = await Promise.all([hmac(password, secret), hmac(expected, secret)]);
  return safeEqual(a, b);
}

export const SESSION_MAX_AGE = MAX_AGE;

export function adminConfigured() {
  return {
    secret: !!sessionSecret(),
    admin: !!process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8,
    teacher: !!process.env.TEACHER_PASSWORD && process.env.TEACHER_PASSWORD.length >= 8,
  };
}
