import { NextResponse } from "next/server";
import { checkPassword, createSession, SESSION_COOKIE, SESSION_MAX_AGE, adminConfigured, type Role } from "@/lib/server/auth";

export const runtime = "nodejs";

// إبطاء محاولات التخمين: حد بسيط لكل عنوان
const attempts = new Map<string, { n: number; until: number }>();

export async function GET() {
  return NextResponse.json(adminConfigured());
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) return NextResponse.json({ error: "محاولات كثيرة. انتظر دقائق ثم حاول مجدداً." }, { status: 429 });

  const cfg = adminConfigured();
  if (!cfg.secret || (!cfg.admin && !cfg.teacher)) {
    return NextResponse.json({ error: "لوحة الإدارة غير مهيأة: يجب ضبط SESSION_SECRET (32 حرفاً على الأقل) و ADMIN_PASSWORD (8 أحرف على الأقل) في متغيرات البيئة على الخادم." }, { status: 503 });
  }
  let body: { role?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const role: Role = body.role === "teacher" ? "teacher" : "admin";
  const ok = typeof body.password === "string" && body.password.length <= 200 && (await checkPassword(role, body.password));
  if (!ok) {
    const cur = attempts.get(ip) ?? { n: 0, until: 0 };
    cur.n++;
    if (cur.n >= 5) { cur.until = Date.now() + 5 * 60_000; cur.n = 0; }
    attempts.set(ip, cur);
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
  attempts.delete(ip);
  const token = await createSession(role);
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, token!, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_MAX_AGE });
  return res;
}
