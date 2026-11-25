/**
 * واجهة المعلم الذكي — تعمل في الخادم فقط.
 * مفتاح ANTHROPIC_API_KEY لا يُرسل إلى المتصفح أبداً.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getKey, bumpUsage } from "@/lib/server/store";
import { buildSystemPrompt, LESSON_IDS } from "@/lib/server/tutorPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InMsg = { role: "user" | "assistant"; content: string; image?: string };

// حد بسيط للطلبات لكل عميل (في الذاكرة) لحماية التكلفة
const hits = new Map<string, number[]>();
function rateLimited(id: string, perHour: number): boolean {
  const now = Date.now();
  const arr = (hits.get(id) ?? []).filter((t) => now - t < 3600_000);
  if (arr.length >= perHour) { hits.set(id, arr); return true; }
  arr.push(now);
  hits.set(id, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

function clientId(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

export async function GET() {
  const ai = await getKey("ai");
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return Response.json({
    available: hasKey && ai.enabled,
    reason: !hasKey ? "no-key" : !ai.enabled ? "disabled" : null,
  });
}

const IMG_RE = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

export async function POST(req: Request) {
  const ai = await getKey("ai");
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "المعلم الذكي غير مفعّل: لم يُضبط مفتاح خدمة الذكاء الاصطناعي على الخادم." }, { status: 503 });
  }
  if (!ai.enabled) return Response.json({ error: "أوقف المعلم الذكي مؤقتاً من لوحة الإدارة." }, { status: 503 });
  if (rateLimited(clientId(req), ai.perClientHourly)) {
    return Response.json({ error: "وصلت إلى الحد الأقصى لعدد الأسئلة في الساعة. حاول بعد قليل، وراجع الدرس في هذه الأثناء." }, { status: 429 });
  }

  let body: { messages?: InMsg[]; lessonId?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return Response.json({ error: "لا توجد رسالة" }, { status: 400 });

  const todayCount = await bumpUsage("tutorRequests");
  if (todayCount > ai.dailyLimit) return Response.json({ error: "تم بلوغ الحد اليومي لاستخدام المعلم الذكي في المنصة. حاول غداً." }, { status: 429 });

  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of msgs) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const text = String(m.content ?? "").slice(0, 4000);
    if (m.role === "user" && m.image) {
      const match = IMG_RE.exec(m.image);
      if (match && m.image.length < 6_000_000) {
        messages.push({ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: match[1] as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: match[2] } },
          { type: "text", text: text || "اشرح لي هذه المسألة خطوة بخطوة دون إعطاء الإجابة النهائية مباشرة." },
        ] });
        continue;
      }
    }
    if (text.trim()) messages.push({ role: m.role, content: text });
  }
  // يجب أن تبدأ المحادثة برسالة من المستخدم
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) return Response.json({ error: "لا توجد رسالة" }, { status: 400 });

  const lessonId = body.lessonId && LESSON_IDS.has(body.lessonId) ? body.lessonId : undefined;
  const client = new Anthropic();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const s = client.beta.messages.stream({
          model: ai.model,
          max_tokens: ai.maxOutputTokens,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: ai.effort },
          system: [{ type: "text", text: buildSystemPrompt(lessonId, ai.extraInstructions), cache_control: { type: "ephemeral" } }],
          messages,
        });
        for await (const ev of s) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") controller.enqueue(encoder.encode(ev.delta.text));
        }
        const final = await s.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\nعذراً، لا أستطيع المساعدة في هذا الطلب. لنعد إلى أسئلة الرياضيات!"));
        if (final.stop_reason === "max_tokens") controller.enqueue(encoder.encode("\n\n(تم اختصار الرد لطوله. اطلب «أكمل» للمتابعة.)"));
      } catch (e) {
        await bumpUsage("tutorErrors").catch(() => {});
        let msg = "تعذّر الاتصال بخدمة الذكاء الاصطناعي الآن. حاول مرة أخرى بعد قليل.";
        if (e instanceof Anthropic.AuthenticationError) msg = "مفتاح خدمة الذكاء الاصطناعي غير صالح. يرجى إبلاغ المعلم.";
        else if (e instanceof Anthropic.RateLimitError) msg = "الخدمة مشغولة حالياً (تجاوز حد الطلبات). حاول بعد دقيقة.";
        else if (e instanceof Anthropic.NotFoundError) msg = "اسم النموذج المضبوط في الإعدادات غير متاح. يرجى إبلاغ المعلم.";
        else if (e instanceof Anthropic.BadRequestError) msg = "تعذّر معالجة الطلب (قد تكون الصورة كبيرة أو غير مدعومة).";
        controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
