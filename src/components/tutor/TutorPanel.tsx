"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { MathText } from "@/components/ui/MathText";
import { readLS, removeLS, useLocal } from "@/lib/storage";
import { LESSON_BY_ID, LESSONS, lc } from "@/content";

interface Msg { role: "user" | "assistant"; content: string; image?: string; ts: number }
interface Chat { id: string; title: string; lessonId?: string; messages: Msg[]; updated: number }

const QUICK = [
  { label: "اشرح بطريقة أبسط", text: "اشرح لي الفكرة الأخيرة بطريقة أبسط مع مثال من الحياة." },
  { label: "أعطني تلميحاً", text: "أعطني تلميحاً فقط دون الحل." },
  { label: "أعطني مثالاً", text: "أعطني مثالاً محلولاً جديداً على هذا الدرس." },
  { label: "اختبرني", text: "اختبرني بسؤال واحد على هذا الدرس وانتظر إجابتي." },
];

/** عرض رد المعلم: فقرات وقوائم مع ترميز الرياضيات */
export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const L = list.ordered ? "ol" : "ul";
    out.push(<L key={out.length} className={`${list.ordered ? "list-decimal" : "list-disc"} space-y-1 pr-6`}>{list.items.map((it, i) => <li key={i}><MathText text={it} /></li>)}</L>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const om = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    const um = /^\s*[-•*]\s+(.*)$/.exec(line);
    if (om) { if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; } list.items.push(om[2]); continue; }
    if (um) { if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; } list.items.push(um[1]); continue; }
    flush();
    if (!line.trim()) continue;
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    out.push(h ? <p key={out.length} className="font-bold"><MathText text={h[1]} /></p> : <p key={out.length}><MathText text={line} /></p>);
  }
  flush();
  return <div className="space-y-2 leading-7">{out}</div>;
}

async function resizeImage(file: File, max = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function TutorChat({ fullPage = false, onClose }: { fullPage?: boolean; onClose?: () => void }) {
  const path = usePathname() ?? "";
  const m = /^\/lessons\/([0-9]-[0-9])/.exec(path);
  const [lessonId, setLessonId] = useState<string | undefined>(m?.[1]);
  const [chats, setChats] = useLocal<Chat[]>("tutor-chats", []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [online, setOnline] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    if (process.env.NEXT_PUBLIC_STATIC === "1") setStatus({ available: false, reason: "static" });
    else fetch("/api/tutor").then((r) => r.json()).then(setStatus).catch(() => setStatus({ available: false, reason: "offline" }));
    const pre = readLS<string>("tutor-prefill", "");
    if (pre) { setInput(pre); removeLS("tutor-prefill"); }
  }, []);

  const active = chats.find((c) => c.id === activeId) ?? null;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [active?.messages.length, busy]);

  const send = async (text: string) => {
    if ((!text.trim() && !image) || busy) return;
    const userMsg: Msg = { role: "user", content: text.trim(), image: image ?? undefined, ts: Date.now() };
    let chat = active;
    if (!chat) {
      chat = { id: Date.now().toString(36), title: text.trim().slice(0, 40) || "مسألة بصورة", lessonId, messages: [], updated: Date.now() };
      setActiveId(chat.id);
    }
    const msgs = [...chat.messages, userMsg];
    const base: Chat = { ...chat, messages: msgs, updated: Date.now() };
    setChats((cs) => [base, ...cs.filter((c) => c.id !== base.id)].slice(0, 30));
    setInput(""); setImage(null); setBusy(true);
    let acc = "";
    const update = (content: string) => setChats((cs) => cs.map((c) => (c.id === base.id ? { ...c, messages: [...msgs, { role: "assistant", content, ts: Date.now() }] } : c)));
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // لا نرسل صوراً قديمة مع كل طلب لتقليل الحجم والتكلفة
        body: JSON.stringify({ lessonId: base.lessonId, messages: msgs.map((mm, i) => ({ role: mm.role, content: mm.content, image: i === msgs.length - 1 ? mm.image : undefined })) }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "تعذّر الاتصال بالمعلم الذكي." }));
        update(`⚠️ ${err.error ?? "تعذّر الاتصال"}`);
      } else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          update(acc);
        }
        if (!acc.trim()) update("⚠️ لم يصل رد. حاول مرة أخرى.");
      }
    } catch {
      update("⚠️ لا يوجد اتصال بالإنترنت. المعلم الذكي يحتاج إلى اتصال.");
    } finally {
      setBusy(false);
    }
  };

  const unavailable = status && !status.available;
  const canSend = !busy && online && !unavailable;

  return (
    <div className={`flex h-full flex-col ${fullPage ? "card min-h-[70vh]" : ""}`}>
      <div className="flex items-center justify-between gap-2 border-b line p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white"><Icon name="bot" size={20} /></span>
          <div>
            <div className="font-bold">المعلم الذكي</div>
            <div className="text-xs muted">رياضيات الصف العاشر · الفصل الأول</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost !min-h-[38px] !px-3 text-sm" onClick={() => setActiveId(null)} title="محادثة جديدة"><Icon name="plus" size={18} /> جديدة</button>
          {onClose && <button className="btn btn-ghost !min-h-[38px] !px-3" onClick={onClose} aria-label="إغلاق"><Icon name="close" /></button>}
        </div>
      </div>

      <div className="border-b line px-3 py-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="muted shrink-0">الدرس:</span>
          <select className="input !min-h-[36px] !py-1 text-sm" value={lessonId ?? ""} onChange={(e) => setLessonId(e.target.value || undefined)}>
            <option value="">عام (كل المنهج)</option>
            {LESSONS.map((l) => <option key={l.id} value={l.id}>{lc(l.id)} {l.title}</option>)}
          </select>
        </label>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {unavailable && (
          <div className="rounded-xl border-2 border-warn-500 bg-warn-50 p-4 text-sm text-warn-700 dark:bg-warn-700/20 dark:text-warn-50">
            <div className="mb-1 font-bold">المعلم الذكي غير متاح حالياً</div>
            {status?.reason === "no-key" && <p>لم يتم ربط خدمة الذكاء الاصطناعي بعد (لم يُضبط مفتاح الخدمة على الخادم). يمكن لمسؤول المنصة تفعيلها بإضافة المفتاح في إعدادات الاستضافة.</p>}
            {status?.reason === "disabled" && <p>أوقف المعلم الخدمة مؤقتاً من لوحة الإدارة.</p>}
            {status?.reason === "static" && <p>هذه هي النسخة المبسّطة من المنصة (دون خادم)، والمعلم الذكي يعمل فقط في النسخة الكاملة المنشورة مع خادم ومفتاح خدمة الذكاء الاصطناعي.</p>}
            {status?.reason === "offline" && <p>تعذّر الوصول إلى الخادم. تحقّق من اتصالك بالإنترنت.</p>}
            <p className="mt-2">في هذه الأثناء يمكنك استخدام الأمثلة المحلولة والتلميحات في الدروس.</p>
          </div>
        )}
        {!online && <div className="rounded-xl bg-warn-50 p-3 text-sm text-warn-700">أنت غير متصل بالإنترنت؛ المعلم الذكي يحتاج إلى اتصال.</div>}
        {!active && !unavailable && (
          <div className="space-y-3 text-sm">
            <p>مرحباً! أنا معلمك الذكي. اسألني عن أي فكرة في دروس الفصل الأول، أو أرسل مسألة (نصاً أو صورة) وسأساعدك خطوة بخطوة.</p>
            {lessonId && <p className="rounded-lg bg-brand-50 p-2 text-brand-800 dark:bg-brand-900/40 dark:text-white">سأركّز على درس {lc(lessonId)}: {LESSON_BY_ID[lessonId]?.title}</p>}
            {chats.length > 0 && (
              <div>
                <div className="mb-1 font-semibold">محادثاتك السابقة (محفوظة على هذا الجهاز):</div>
                <ul className="space-y-1">
                  {chats.slice(0, 8).map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <button className="flex-1 truncate rounded-lg px-2 py-1.5 text-right hover:bg-black/5 dark:hover:bg-white/5" onClick={() => { setActiveId(c.id); setLessonId(c.lessonId); }}>💬 {c.title}</button>
                      <button className="muted" onClick={() => setChats((cs) => cs.filter((x) => x.id !== c.id))} aria-label="حذف المحادثة"><Icon name="trash" size={16} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {active?.messages.map((mm, i) => (
          <div key={i} className={`flex ${mm.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-[15px] ${mm.role === "user" ? "bg-brand-600 text-white" : "bg-black/5 dark:bg-white/10"}`}>
              {mm.image && <img src={mm.image} alt="صورة المسألة" className="mb-2 max-h-48 rounded-lg" />}
              {mm.role === "assistant" ? <RichText text={mm.content} /> : <p className="whitespace-pre-wrap">{mm.content}</p>}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-end"><div className="rounded-2xl bg-black/5 px-4 py-2 text-sm muted dark:bg-white/10">يكتب…</div></div>}
        <div ref={endRef} />
      </div>

      <div className="border-t line p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {QUICK.map((qk) => <button key={qk.label} className="chip shrink-0 bg-brand-50 !py-1.5 text-brand-700 disabled:opacity-50 dark:bg-brand-900/40 dark:text-white" disabled={!canSend} onClick={() => send(qk.text)}>{qk.label}</button>)}
        </div>
        {image && (
          <div className="mb-2 flex items-center gap-2 text-sm"><img src={image} alt="" className="h-12 rounded" /> <button className="text-bad-500" onClick={() => setImage(null)}>إزالة الصورة</button></div>
        )}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <button type="button" className="btn btn-ghost !px-3" onClick={() => fileRef.current?.click()} disabled={!canSend} aria-label="إرفاق صورة مسألة" title="إرفاق صورة مسألة"><Icon name="camera" /></button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImage(await resizeImage(f)); e.target.value = ""; }} />
          <textarea className="input max-h-40 min-h-[44px] flex-1 resize-y" rows={1} value={input} placeholder={unavailable ? "المعلم الذكي غير متاح" : "اكتب سؤالك هنا…"} disabled={!canSend}
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
          <button type="submit" className="btn btn-primary !px-4" disabled={!canSend || (!input.trim() && !image)} aria-label="إرسال"><Icon name="send" /></button>
        </form>
        <p className="mt-1.5 text-[11px] muted">قد يخطئ الذكاء الاصطناعي أحياناً؛ تحقّق من الحل وراجع الكتاب. المحادثات تُحفظ على جهازك فقط.</p>
      </div>
    </div>
  );
}

export function TutorPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="المعلم الذكي">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col surface shadow-2xl anim-pop">
        <TutorChat onClose={onClose} />
      </div>
    </div>
  );
}

