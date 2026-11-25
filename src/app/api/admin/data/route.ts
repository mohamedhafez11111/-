import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/server/auth";
import { getKey, setKey, storeBackend, type StoreShape } from "@/lib/server/store";
import { LESSON_BY_ID, SKILL_BY_ID } from "@/content";
import type { Question } from "@/content/types";
import { GAME_IDS } from "@/components/games/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function session() {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

export async function GET() {
  const s = await session();
  if (!s) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const [ai, announcements, questions, hiddenQuestions, exams, lessonNotes, usage, hiddenGames] = await Promise.all([
    getKey("ai"), getKey("announcements"), getKey("questions"), getKey("hiddenQuestions"), getKey("exams"), getKey("lessonNotes"), getKey("usage"), getKey("hiddenGames"),
  ]);
  return NextResponse.json({
    role: s.role,
    status: { backend: storeBackend(), aiKey: !!process.env.ANTHROPIC_API_KEY, teacherAccount: !!process.env.TEACHER_PASSWORD },
    ai, announcements, questions, hiddenQuestions, exams, lessonNotes, usage, hiddenGames,
  });
}

const str = (v: unknown, max = 5000) => typeof v === "string" && v.length <= max;
const isArr = (v: unknown, max = 2000): v is unknown[] => Array.isArray(v) && v.length <= max;

/** التحقق من صحة البيانات في الخادم قبل الحفظ */
function validate(key: keyof StoreShape, value: unknown): string | null {
  switch (key) {
    case "ai": {
      const v = value as StoreShape["ai"];
      if (typeof v !== "object" || !v) return "إعدادات غير صالحة";
      if (typeof v.enabled !== "boolean" || !str(v.model, 80) || !/^[a-z0-9.\-]+$/.test(v.model)) return "اسم النموذج غير صالح";
      if (!["low", "medium", "high"].includes(v.effort)) return "مستوى الجهد غير صالح";
      if (!(v.maxOutputTokens >= 256 && v.maxOutputTokens <= 16000)) return "الحد الأقصى للرموز بين 256 و 16000";
      if (!(v.perClientHourly >= 1 && v.perClientHourly <= 500)) return "حد الساعة بين 1 و 500";
      if (!(v.dailyLimit >= 1 && v.dailyLimit <= 100000)) return "الحد اليومي غير صالح";
      if (!str(v.extraInstructions, 3000)) return "التعليمات الإضافية طويلة جداً";
      return null;
    }
    case "announcements":
      if (!isArr(value, 50)) return "قائمة غير صالحة";
      for (const a of value as StoreShape["announcements"]) if (!str(a.id, 40) || !str(a.title, 200) || !str(a.body, 3000) || !["info", "warn", "ok"].includes(a.tone)) return "إعلان غير صالح";
      return null;
    case "questions":
      if (!isArr(value, 1000)) return "قائمة غير صالحة";
      for (const q of value as Question[]) {
        if (!str(q.id, 60) || !q.id.startsWith("t-")) return "معرّف سؤال غير صالح";
        if (!LESSON_BY_ID[q.lessonId]) return `درس غير موجود: ${q.lessonId}`;
        if (!SKILL_BY_ID[q.skill] || SKILL_BY_ID[q.skill].lessonId !== q.lessonId) return "المهارة لا تنتمي إلى الدرس";
        if (![1, 2, 3, 4].includes(q.difficulty) || !str(q.prompt, 3000) || !str(q.explanation, 3000)) return "بيانات سؤال غير صالحة";
        if (!["mcq", "tf", "numeric", "short"].includes(q.type)) return "نوع السؤال غير مدعوم من لوحة الإدارة";
        if (q.type === "mcq" && (!isArr(q.options, 6) || q.options.length < 2 || !(q.answer >= 0 && q.answer < q.options.length))) return "خيارات غير صالحة";
        if (q.type === "numeric" && !Number.isFinite(q.answer)) return "الإجابة الرقمية غير صالحة";
        if (q.type === "short" && (!isArr(q.accept, 10) || !q.accept.length)) return "الإجابات المقبولة مطلوبة";
      }
      return null;
    case "hiddenQuestions":
      return isArr(value, 2000) && (value as unknown[]).every((x) => str(x, 60)) ? null : "قائمة غير صالحة";
    case "hiddenGames":
      return isArr(value, 20) && (value as string[]).every((x) => (GAME_IDS as string[]).includes(x)) ? null : "قائمة غير صالحة";
    case "exams":
      if (!isArr(value, 100)) return "قائمة غير صالحة";
      for (const e of value as StoreShape["exams"]) {
        if (!str(e.id, 40) || !str(e.title, 200) || !isArr(e.lessonIds, 30) || !e.lessonIds.length || e.lessonIds.some((l) => !LESSON_BY_ID[l])) return "اختبار غير صالح";
        if (!(e.count >= 3 && e.count <= 50) || !(e.minutes >= 0 && e.minutes <= 180)) return "عدد الأسئلة أو الزمن غير صالح";
      }
      return null;
    case "lessonNotes":
      if (!isArr(value, 100)) return "قائمة غير صالحة";
      for (const n of value as StoreShape["lessonNotes"]) if (!LESSON_BY_ID[n.lessonId] || !str(n.teacherNote, 5000) || !str(n.extraExplanation, 8000)) return "ملاحظة غير صالحة";
      return null;
    default:
      return "مفتاح غير مسموح";
  }
}

export async function PUT(req: Request) {
  const s = await session();
  if (!s) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  // حماية من CSRF: الطلب يجب أن يأتي من الأصل نفسه
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "طلب مرفوض" }, { status: 403 });

  let body: { key?: keyof StoreShape; value?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const key = body.key;
  const allowed: (keyof StoreShape)[] = ["ai", "announcements", "questions", "hiddenQuestions", "exams", "lessonNotes", "hiddenGames"];
  if (!key || !allowed.includes(key)) return NextResponse.json({ error: "مفتاح غير مسموح" }, { status: 400 });
  if (key === "ai" && s.role !== "admin") return NextResponse.json({ error: "إعدادات الذكاء الاصطناعي متاحة للمدير فقط" }, { status: 403 });
  const err = validate(key, body.value);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const r = await setKey(key, body.value as never);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
