import "server-only";
/**
 * مخزن بيانات الإدارة (مفتاح ← قيمة JSON).
 * - إذا ضُبط SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY: جدول Supabase باسم kv (key text primary key, value jsonb, updated_at timestamptz).
 * - وإلا: ملف محلي data/store.json (للتشغيل المحلي والخوادم ذات القرص القابل للكتابة).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Question } from "@/content/types";

export interface AiSettings {
  enabled: boolean;
  model: string;
  effort: "low" | "medium" | "high";
  maxOutputTokens: number;
  /** حد أقصى لعدد الطلبات لكل جهاز/عنوان في الساعة */
  perClientHourly: number;
  /** حد يومي إجمالي لعدد الطلبات للتحكم في التكلفة */
  dailyLimit: number;
  extraInstructions: string;
}

export interface Announcement { id: string; title: string; body: string; tone: "info" | "warn" | "ok"; date: string; active: boolean }
export interface TeacherExam { id: string; title: string; lessonIds: string[]; count: number; minutes: number; difficulty: number[]; active: boolean; createdAt: string }
export interface LessonNote { lessonId: string; teacherNote: string; extraExplanation: string; extraExample?: { problem: string; solution: string } }
export interface UsageDay { date: string; tutorRequests: number; tutorErrors: number }

export interface StoreShape {
  ai: AiSettings;
  announcements: Announcement[];
  questions: Question[];
  hiddenQuestions: string[];
  exams: TeacherExam[];
  lessonNotes: LessonNote[];
  usage: UsageDay[];
  hiddenGames: string[];
}

export const DEFAULT_AI: AiSettings = {
  enabled: true,
  model: process.env.AI_MODEL || "claude-opus-5-5",
  effort: "low",
  maxOutputTokens: 4000,
  perClientHourly: 30,
  dailyLimit: 2000,
  extraInstructions: "",
};

const DEFAULTS: StoreShape = { ai: DEFAULT_AI, announcements: [], questions: [], hiddenQuestions: [], exams: [], lessonNotes: [], usage: [], hiddenGames: [] };

const FILE = path.join(process.cwd(), "data", "store.json");

export function storeBackend(): "supabase" | "file" {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "file";
}

async function sbFetch(pathname: string, init: RequestInit = {}) {
  const url = `${process.env.SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${pathname}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // مفاتيح Supabase الجديدة (sb_secret_…) تُرسل في apikey فقط؛ أما المفتاح القديم (JWT) فيُرسل أيضاً في Authorization
  const auth: Record<string, string> = key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {};
  return fetch(url, { ...init, headers: { apikey: key, ...auth, "Content-Type": "application/json", ...(init.headers ?? {}) }, cache: "no-store" });
}

let fileCache: Partial<StoreShape> | null = null;

async function readFileStore(): Promise<Partial<StoreShape>> {
  if (fileCache) return fileCache;
  try {
    fileCache = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    fileCache = {};
  }
  return fileCache!;
}

export async function getKey<K extends keyof StoreShape>(key: K): Promise<StoreShape[K]> {
  try {
    if (storeBackend() === "supabase") {
      const res = await sbFetch(`kv?key=eq.${encodeURIComponent(key)}&select=value`);
      if (res.ok) {
        const rows = (await res.json()) as { value: StoreShape[K] }[];
        if (rows[0]) return mergeDefault(key, rows[0].value);
      }
      return DEFAULTS[key];
    }
    const data = await readFileStore();
    return mergeDefault(key, data[key] as StoreShape[K] | undefined);
  } catch {
    return DEFAULTS[key];
  }
}

function mergeDefault<K extends keyof StoreShape>(key: K, v: StoreShape[K] | undefined): StoreShape[K] {
  if (v === undefined || v === null) return DEFAULTS[key];
  if (key === "ai") return { ...DEFAULT_AI, ...(v as AiSettings) } as StoreShape[K];
  return v;
}

export async function setKey<K extends keyof StoreShape>(key: K, value: StoreShape[K]): Promise<{ ok: boolean; error?: string }> {
  try {
    if (storeBackend() === "supabase") {
      const res = await sbFetch("kv", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
      });
      return res.ok ? { ok: true } : { ok: false, error: `Supabase: ${res.status}` };
    }
    const data = { ...(await readFileStore()), [key]: value };
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
    fileCache = data;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "تعذّر الحفظ: نظام الملفات غير قابل للكتابة على هذا الخادم. فعّل Supabase (انظر README)." + (e instanceof Error ? ` (${(e as NodeJS.ErrnoException).code ?? e.message})` : "") };
  }
}

export async function bumpUsage(field: "tutorRequests" | "tutorErrors") {
  const today = new Date().toISOString().slice(0, 10);
  const usage = await getKey("usage");
  const day = usage.find((u) => u.date === today);
  const next = day ? usage.map((u) => (u.date === today ? { ...u, [field]: u[field] + 1 } : u)) : [{ date: today, tutorRequests: 0, tutorErrors: 0, [field]: 1 }, ...usage];
  await setKey("usage", next.slice(0, 120));
  return (next.find((u) => u.date === today)?.tutorRequests ?? 0);
}
