"use client";
import { useEffect, useMemo, useState } from "react";
import { LESSONS, LESSON_BY_ID, BANK_QUESTIONS, UNITS, SKILLS, lc } from "@/content";
import { CURRICULUM_NOTES } from "@/content/curriculum";
import type { Question } from "@/content/types";
import { DIFFICULTY_LABEL, QTYPE_LABEL } from "@/content/types";
import type { StoreShape, Announcement, TeacherExam, LessonNote } from "@/lib/server/store";
import { GAME_META, GAME_IDS } from "@/components/games/meta";
import { PageHeader } from "@/components/ui/bits";
import { MathText, plainMath } from "@/components/ui/MathText";
import { Icon } from "@/components/ui/Icon";
import { stats as progStats, type ProgressState, EMPTY_PROGRESS, skillMastery } from "@/lib/progress";

type Data = Omit<StoreShape, never> & { role: "admin" | "teacher"; status: { backend: string; aiKey: boolean; teacherAccount: boolean } };
const TABS = [
  ["overview", "نظرة عامة"], ["lessons", "الدروس والشروحات"], ["questions", "الأسئلة"], ["exams", "الاختبارات"],
  ["announcements", "الإعلانات"], ["games", "الألعاب والأنشطة"], ["reports", "التقارير والتصدير"], ["ai", "إعدادات الذكاء الاصطناعي"],
] as const;

function download(name: string, content: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function AdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("overview");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const load = () => fetch("/api/admin/data").then(async (r) => { if (r.status === 401) { window.location.assign("/admin/login"); return; } setData(await r.json()); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async <K extends keyof StoreShape>(key: K, value: StoreShape[K]) => {
    const r = await fetch("/api/admin/data", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setMsg({ ok: true, t: "تم الحفظ ✔" }); setData((d) => (d ? { ...d, [key]: value } : d)); }
    else setMsg({ ok: false, t: j.error ?? "تعذّر الحفظ" });
    setTimeout(() => setMsg(null), 4000);
    return r.ok;
  };
  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.assign("/admin/login"); };

  if (!data) return <div className="p-8 text-center muted">جارٍ التحميل…</div>;
  return (
    <div>
      <PageHeader icon="admin" title="لوحة إدارة المعلم" subtitle={`مسجّل الدخول بصفة: ${data.role === "admin" ? "المدير" : "المعلم"}. التعديلات تظهر للطلاب فوراً دون إعادة بناء التطبيق.`}>
        <button className="btn btn-ghost" onClick={logout}>تسجيل الخروج</button>
      </PageHeader>
      {msg && <div className={`card mb-3 p-3 text-sm font-semibold ${msg.ok ? "text-ok-700" : "text-bad-700"}`} role="status">{msg.t}</div>}
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.filter(([k]) => k !== "ai" || data.role === "admin").map(([k, t]) => <button key={k} onClick={() => setTab(k)} className={`chip shrink-0 !px-4 !py-2 ${tab === k ? "bg-brand-600 text-white" : "bg-black/5 dark:bg-white/10"}`}>{t}</button>)}
      </div>
      {tab === "overview" && <Overview data={data} />}
      {tab === "lessons" && <LessonsAdmin notes={data.lessonNotes} save={(v) => save("lessonNotes", v)} />}
      {tab === "questions" && <QuestionsAdmin data={data} save={save} />}
      {tab === "exams" && <ExamsAdmin exams={data.exams} save={(v) => save("exams", v)} />}
      {tab === "announcements" && <AnnouncementsAdmin list={data.announcements} save={(v) => save("announcements", v)} />}
      {tab === "games" && <GamesAdmin hidden={data.hiddenGames} save={(v) => save("hiddenGames", v)} />}
      {tab === "reports" && <Reports data={data} />}
      {tab === "ai" && data.role === "admin" && <AiAdmin data={data} save={(v) => save("ai", v)} />}
    </div>
  );
}

function Overview({ data }: { data: Data }) {
  const today = data.usage[0];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4"><div className="text-sm muted">خدمة الذكاء الاصطناعي</div><div className={`font-bold ${data.status.aiKey ? "text-ok-700" : "text-bad-700"}`}>{data.status.aiKey ? (data.ai.enabled ? "مفعّلة" : "موقوفة من الإعدادات") : "غير مربوطة (لا يوجد مفتاح)"}</div></div>
        <div className="card p-4"><div className="text-sm muted">تخزين بيانات الإدارة</div><div className="font-bold">{data.status.backend === "supabase" ? "Supabase (سحابي)" : "ملف محلي على الخادم"}</div></div>
        <div className="card p-4"><div className="text-sm muted">أسئلة البنك</div><div className="font-bold">{BANK_QUESTIONS.length} أصلية + {data.questions.length} من المعلم</div></div>
        <div className="card p-4"><div className="text-sm muted">طلبات المعلم الذكي اليوم</div><div className="font-bold">{today?.date === new Date().toISOString().slice(0, 10) ? today.tutorRequests : 0}</div></div>
      </div>
      {data.status.backend === "file" && <div className="card border-r-4 border-r-warn-500 p-4 text-sm">التخزين الحالي ملف على الخادم. في الاستضافة السحابية مثل Vercel يكون نظام الملفات للقراءة فقط، لذلك فعّل Supabase لحفظ تعديلات الإدارة (راجع README).</div>}
      <div className="card p-5">
        <h2 className="mb-2 font-bold">ملاحظات المطابقة مع الكتابين (للمراجعة)</h2>
        <ul className="list-disc space-y-1 pr-6 text-sm">{CURRICULUM_NOTES.map((n, i) => <li key={i}>{n}</li>)}{LESSONS.flatMap((l) => (l.reviewNotes ?? []).map((n, i) => <li key={l.id + i}>الدرس {l.id}: {n}</li>))}</ul>
      </div>
      <div className="card p-5 text-sm">
        <h2 className="mb-2 font-bold">عن بيانات الطلاب</h2>
        <p>المنصة مفتوحة دون تسجيل، ويُحفظ تقدم كل طالب على جهازه فقط؛ لذلك لا تتوفر في الخادم تقارير فردية عن الطلاب. يستطيع الطالب تصدير ملف تقدمه من صفحة «إنجازاتي» وإرساله إليك، ويمكنك عرضه في تبويب «التقارير والتصدير».</p>
      </div>
    </div>
  );
}

function LessonsAdmin({ notes, save }: { notes: LessonNote[]; save: (v: LessonNote[]) => Promise<boolean> }) {
  const [id, setId] = useState(LESSONS[0].id);
  const cur = notes.find((n) => n.lessonId === id) ?? { lessonId: id, teacherNote: "", extraExplanation: "", extraExample: { problem: "", solution: "" } };
  const [draft, setDraft] = useState<LessonNote>(cur);
  useEffect(() => { setDraft(notes.find((n) => n.lessonId === id) ?? { lessonId: id, teacherNote: "", extraExplanation: "", extraExample: { problem: "", solution: "" } }); }, [id, notes]);
  const l = LESSON_BY_ID[id];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3 p-5">
        <select className="input" value={id} onChange={(e) => setId(e.target.value)}>{LESSONS.map((x) => <option key={x.id} value={x.id}>{lc(x.id)} {x.title}</option>)}</select>
        <p className="text-xs muted">المحتوى الأساسي للدروس مطابق للكتاب ومراجَع في الكود. أضف هنا شرحاً إضافياً أو ملاحظة أو مثالاً محلولاً يظهر للطلاب أعلى صفحة الدرس.</p>
        <label className="block"><span className="mb-1 block text-sm font-semibold">ملاحظة المعلم</span><textarea className="input min-h-[80px]" value={draft.teacherNote} onChange={(e) => setDraft({ ...draft, teacherNote: e.target.value })} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">شرح إضافي (يدعم \frac و ^)</span><textarea className="input min-h-[120px]" value={draft.extraExplanation} onChange={(e) => setDraft({ ...draft, extraExplanation: e.target.value })} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">مثال محلول إضافي: المسألة</span><textarea className="input" value={draft.extraExample?.problem ?? ""} onChange={(e) => setDraft({ ...draft, extraExample: { problem: e.target.value, solution: draft.extraExample?.solution ?? "" } })} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">الحل</span><textarea className="input" value={draft.extraExample?.solution ?? ""} onChange={(e) => setDraft({ ...draft, extraExample: { problem: draft.extraExample?.problem ?? "", solution: e.target.value } })} /></label>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => save([...notes.filter((n) => n.lessonId !== id), { ...draft, extraExample: draft.extraExample?.problem ? draft.extraExample : undefined }])}>حفظ</button>
          <button className="btn btn-ghost" onClick={() => save(notes.filter((n) => n.lessonId !== id))}>حذف إضافات الدرس</button>
        </div>
      </div>
      <div className="card space-y-2 p-5 text-sm">
        <h3 className="font-bold">بنية الدرس {lc(l.id)}: {l.title}</h3>
        <p>كتاب الطالب ص {l.sbPage} · كتاب النشاط ص {l.abPages}</p>
        <p><b>الأهداف:</b> {l.objectives.length} · <b>الأقسام:</b> {l.sections.length} · <b>الأمثلة:</b> {l.examples.length} · <b>المهارات:</b> {l.skills.map((s) => s.name).join("، ")}</p>
        <div className="rounded-lg border line p-3"><b>معاينة الشرح الإضافي:</b><MathText as="div" className="mt-1 whitespace-pre-line" text={draft.extraExplanation || "—"} /></div>
      </div>
    </div>
  );
}

function QuestionsAdmin({ data, save }: { data: Data; save: <K extends keyof StoreShape>(k: K, v: StoreShape[K]) => Promise<boolean> }) {
  const [lesson, setLesson] = useState(LESSONS[0].id);
  const [editing, setEditing] = useState<Question | null>(null);
  const blank = (): Question => ({ id: `t-${Date.now().toString(36)}`, lessonId: lesson, skill: LESSON_BY_ID[lesson].skills[0].id, difficulty: 2, type: "mcq", prompt: "", options: ["", "", "", ""], answer: 0, explanation: "", source: "teacher" });
  const list = [...BANK_QUESTIONS, ...data.questions].filter((q) => q.lessonId === lesson);
  const toggleHide = (id: string) => save("hiddenQuestions", data.hiddenQuestions.includes(id) ? data.hiddenQuestions.filter((x) => x !== id) : [...data.hiddenQuestions, id]);
  const exportQ = (fmt: "json" | "csv") => {
    const all = [...BANK_QUESTIONS, ...data.questions];
    if (fmt === "json") download("بنك-الأسئلة.json", JSON.stringify(all, null, 2), "application/json");
    else download("بنك-الأسئلة.csv", "﻿" + [["المعرف", "الدرس", "المهارة", "الصعوبة", "النوع", "السؤال", "الإجابة", "الشرح"].map(csvCell).join(","), ...all.map((q) => [q.id, q.lessonId, q.skill, q.difficulty, q.type, plainMath(q.prompt), q.type === "mcq" ? plainMath(q.options[q.answer]) : q.type === "numeric" ? q.answer : q.type === "tf" ? (q.answer ? "صح" : "خطأ") : q.type === "short" ? q.accept[0] : "", plainMath(q.explanation)].map(csvCell).join(","))].join("\n"), "text/csv");
  };
  const saveQ = async (q: Question) => {
    const next = data.questions.some((x) => x.id === q.id) ? data.questions.map((x) => (x.id === q.id ? q : x)) : [...data.questions, q];
    if (await save("questions", next)) setEditing(null);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select className="input max-w-sm" value={lesson} onChange={(e) => setLesson(e.target.value)}>{LESSONS.map((l) => <option key={l.id} value={l.id}>{lc(l.id)} {l.title}</option>)}</select>
        <button className="btn btn-primary" onClick={() => setEditing(blank())}><Icon name="plus" size={18} /> سؤال جديد</button>
        <button className="btn btn-ghost" onClick={() => exportQ("csv")}>تصدير CSV</button>
        <button className="btn btn-ghost" onClick={() => exportQ("json")}>تصدير JSON</button>
      </div>
      {editing && <QuestionEditor q={editing} onCancel={() => setEditing(null)} onSave={saveQ} />}
      <div className="space-y-2">
        {list.map((q) => {
          const hidden = data.hiddenQuestions.includes(q.id);
          const teacher = q.id.startsWith("t-");
          return (
            <div key={q.id} className={`card flex flex-wrap items-center gap-3 p-3 ${hidden ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1 text-sm"><span className="chip ml-1 bg-black/5">{DIFFICULTY_LABEL[q.difficulty]}</span><span className="chip ml-1 bg-black/5">{QTYPE_LABEL[q.type]}</span>{teacher && <span className="chip ml-1 bg-purple-50 text-purple-700">من المعلم</span>}<MathText text={q.prompt} /></div>
              <div className="flex gap-1.5">
                {teacher && <button className="btn btn-soft !min-h-[36px] text-xs" onClick={() => setEditing(q)}>تعديل</button>}
                {teacher && <button className="btn btn-ghost !min-h-[36px] text-xs" onClick={() => save("questions", data.questions.filter((x) => x.id !== q.id))}>حذف</button>}
                <button className="btn btn-ghost !min-h-[36px] text-xs" onClick={() => toggleHide(q.id)}>{hidden ? "إظهار" : "إخفاء عن الطلاب"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionEditor({ q, onSave, onCancel }: { q: Question; onSave: (q: Question) => void; onCancel: () => void }) {
  const [d, setD] = useState<Question>(q);
  const skills = SKILLS.filter((s) => s.lessonId === d.lessonId);
  const setType = (t: string) => {
    const base = { id: d.id, lessonId: d.lessonId, skill: d.skill, difficulty: d.difficulty, prompt: d.prompt, explanation: d.explanation, hint: d.hint, source: "teacher" as const };
    if (t === "mcq") setD({ ...base, type: "mcq", options: ["", "", "", ""], answer: 0 });
    if (t === "tf") setD({ ...base, type: "tf", answer: true });
    if (t === "numeric") setD({ ...base, type: "numeric", answer: 0 });
    if (t === "short") setD({ ...base, type: "short", accept: [""], mode: "text" });
  };
  return (
    <div className="card space-y-3 border-2 border-brand-300 p-5">
      <div className="grid gap-2 sm:grid-cols-4">
        <select className="input" value={d.lessonId} onChange={(e) => setD({ ...d, lessonId: e.target.value, skill: LESSON_BY_ID[e.target.value].skills[0].id })}>{LESSONS.map((l) => <option key={l.id} value={l.id}>{l.id}</option>)}</select>
        <select className="input" value={d.skill} onChange={(e) => setD({ ...d, skill: e.target.value })}>{skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select className="input" value={d.difficulty} onChange={(e) => setD({ ...d, difficulty: Number(e.target.value) as 1 | 2 | 3 | 4 })}>{([1, 2, 3, 4] as const).map((x) => <option key={x} value={x}>{DIFFICULTY_LABEL[x]}</option>)}</select>
        <select className="input" value={d.type} onChange={(e) => setType(e.target.value)}><option value="mcq">اختيار من متعدد</option><option value="tf">صح أو خطأ</option><option value="numeric">إجابة رقمية</option><option value="short">إجابة قصيرة</option></select>
      </div>
      <label className="block"><span className="mb-1 block text-sm font-semibold">نص السؤال</span><textarea className="input" value={d.prompt} onChange={(e) => setD({ ...d, prompt: e.target.value })} /></label>
      <div className="rounded-lg bg-black/[0.03] p-2 text-sm">معاينة: <MathText text={d.prompt || "—"} /></div>
      {d.type === "mcq" && d.options.map((o, i) => (
        <label key={i} className="flex items-center gap-2"><input type="radio" name="ans" checked={d.answer === i} onChange={() => setD({ ...d, answer: i })} className="h-5 w-5 accent-brand-600" aria-label={`الخيار ${i + 1} صحيح`} /><input className="input" value={o} placeholder={`الخيار ${i + 1}`} onChange={(e) => setD({ ...d, options: d.options.map((x, j) => (j === i ? e.target.value : x)) })} /></label>
      ))}
      {d.type === "tf" && <div className="flex gap-2"><button className={`chip !py-2 ${d.answer ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setD({ ...d, answer: true })}>صح</button><button className={`chip !py-2 ${!d.answer ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setD({ ...d, answer: false })}>خطأ</button></div>}
      {d.type === "numeric" && <div className="flex gap-2"><input type="number" className="input w-40" value={d.answer} onChange={(e) => setD({ ...d, answer: Number(e.target.value) })} aria-label="الإجابة" /><input className="input w-40" placeholder="الوحدة (اختياري)" value={d.unit ?? ""} onChange={(e) => setD({ ...d, unit: e.target.value || undefined })} /><input type="number" className="input w-40" placeholder="هامش الخطأ" value={d.tolerance ?? ""} onChange={(e) => setD({ ...d, tolerance: e.target.value ? Number(e.target.value) : undefined })} /></div>}
      {d.type === "short" && (<><input className="input" placeholder="الإجابات المقبولة مفصولة بـ ;" value={d.accept.join(";")} onChange={(e) => setD({ ...d, accept: e.target.value.split(";").map((x) => x.trim()).filter(Boolean) })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.mode === "expr"} onChange={(e) => setD({ ...d, mode: e.target.checked ? "expr" : "text" })} className="h-5 w-5 accent-brand-600" /> عبارة جبرية (قبول الصور المكافئة)</label></>)}
      <label className="block"><span className="mb-1 block text-sm font-semibold">الشرح والحل</span><textarea className="input" value={d.explanation} onChange={(e) => setD({ ...d, explanation: e.target.value })} /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">تلميح (اختياري)</span><input className="input" value={d.hint ?? ""} onChange={(e) => setD({ ...d, hint: e.target.value || undefined })} /></label>
      <div className="flex gap-2"><button className="btn btn-primary" onClick={() => onSave(d)}>حفظ السؤال</button><button className="btn btn-ghost" onClick={onCancel}>إلغاء</button></div>
    </div>
  );
}

function ExamsAdmin({ exams, save }: { exams: TeacherExam[]; save: (v: TeacherExam[]) => Promise<boolean> }) {
  const [d, setD] = useState<TeacherExam>({ id: "", title: "", lessonIds: [], count: 10, minutes: 20, difficulty: [1, 2, 3], active: true, createdAt: "" });
  const add = () => { if (!d.title || !d.lessonIds.length) return; save([...exams, { ...d, id: Date.now().toString(36), createdAt: new Date().toISOString() }]); setD({ ...d, title: "", lessonIds: [] }); };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3 p-5">
        <h3 className="font-bold">إنشاء اختبار</h3>
        <input className="input" placeholder="عنوان الاختبار" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border line p-2 text-sm">
          {UNITS.map((u) => <div key={u.id}><div className="font-semibold">الوحدة {u.number}</div>{u.lessonIds.map((id) => <label key={id} className="flex items-center gap-2 pr-3"><input type="checkbox" className="accent-brand-600" checked={d.lessonIds.includes(id)} onChange={(e) => setD({ ...d, lessonIds: e.target.checked ? [...d.lessonIds, id] : d.lessonIds.filter((x) => x !== id) })} />{lc(id)} {LESSON_BY_ID[id].title}</label>)}</div>)}
        </div>
        <div className="grid grid-cols-2 gap-2"><label className="text-sm">عدد الأسئلة<input type="number" className="input" value={d.count} onChange={(e) => setD({ ...d, count: Number(e.target.value) })} /></label><label className="text-sm">الزمن (دقيقة)<input type="number" className="input" value={d.minutes} onChange={(e) => setD({ ...d, minutes: Number(e.target.value) })} /></label></div>
        <div className="flex flex-wrap gap-1.5">{([1, 2, 3, 4] as const).map((x) => <button key={x} className={`chip !py-1.5 ${d.difficulty.includes(x) ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setD({ ...d, difficulty: d.difficulty.includes(x) ? d.difficulty.filter((y) => y !== x) : [...d.difficulty, x] })}>{DIFFICULTY_LABEL[x]}</button>)}</div>
        <button className="btn btn-primary" onClick={add} disabled={!d.title || !d.lessonIds.length}>إضافة الاختبار</button>
      </div>
      <div className="space-y-2">
        {exams.length === 0 && <p className="muted">لا توجد اختبارات بعد.</p>}
        {exams.map((e) => (
          <div key={e.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div><b>{e.title}</b><div className="muted">الدروس: {e.lessonIds.map(lc).join("، ")} · {e.count} سؤالاً · {e.minutes} دقيقة</div></div>
            <div className="flex gap-1.5">
              <button className="btn btn-soft !min-h-[36px] text-xs" onClick={() => save(exams.map((x) => (x.id === e.id ? { ...x, active: !x.active } : x)))}>{e.active ? "إيقاف" : "تفعيل"}</button>
              <button className="btn btn-ghost !min-h-[36px] text-xs" onClick={() => save(exams.filter((x) => x.id !== e.id))}>حذف</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnouncementsAdmin({ list, save }: { list: Announcement[]; save: (v: Announcement[]) => Promise<boolean> }) {
  const [d, setD] = useState<Announcement>({ id: "", title: "", body: "", tone: "info", date: new Date().toISOString().slice(0, 10), active: true });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3 p-5">
        <h3 className="font-bold">إعلان جديد</h3>
        <input className="input" placeholder="العنوان" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        <textarea className="input min-h-[100px]" placeholder="النص" value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />
        <div className="flex gap-2"><select className="input" value={d.tone} onChange={(e) => setD({ ...d, tone: e.target.value as Announcement["tone"] })}><option value="info">معلومة</option><option value="warn">تنبيه</option><option value="ok">تهنئة</option></select><input type="date" className="input" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></div>
        <button className="btn btn-primary" disabled={!d.title} onClick={() => { save([{ ...d, id: Date.now().toString(36) }, ...list]); setD({ ...d, title: "", body: "" }); }}>نشر</button>
      </div>
      <div className="space-y-2">{list.map((a) => (
        <div key={a.id} className="card p-3 text-sm"><div className="flex justify-between gap-2"><b>{a.title}</b><span className="muted">{a.date}</span></div><p className="whitespace-pre-line">{a.body}</p>
          <div className="mt-2 flex gap-1.5"><button className="btn btn-soft !min-h-[34px] text-xs" onClick={() => save(list.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)))}>{a.active ? "إخفاء" : "إظهار"}</button><button className="btn btn-ghost !min-h-[34px] text-xs" onClick={() => save(list.filter((x) => x.id !== a.id))}>حذف</button></div></div>
      ))}</div>
    </div>
  );
}

function GamesAdmin({ hidden, save }: { hidden: string[]; save: (v: string[]) => Promise<boolean> }) {
  return (
    <div className="space-y-3">
      <p className="text-sm muted">تحكم في الألعاب الظاهرة للطلاب. الألعاب مرتبطة بمهارات المنهج وتعمل دون اتصال. لإضافة أسئلة تظهر في الدروس والاختبارات استخدم تبويب «الأسئلة»، ولإضافة نشاط أو شرح لدرس استخدم «الدروس والشروحات».</p>
      <div className="grid gap-2 sm:grid-cols-2">{GAME_IDS.map((id) => (
        <label key={id} className="card flex items-center justify-between gap-3 p-3"><span>{GAME_META[id].emoji} {GAME_META[id].title}</span><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={!hidden.includes(id)} onChange={(e) => save(e.target.checked ? hidden.filter((x) => x !== id) : [...hidden, id])} aria-label={`إظهار ${GAME_META[id].title}`} /></label>
      ))}</div>
    </div>
  );
}

function Reports({ data }: { data: Data }) {
  const [student, setStudent] = useState<{ name: string; p: ProgressState } | null>(null);
  const [err, setErr] = useState("");
  const load = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== "math10-oman" || !j.data?.progress) throw new Error();
      setStudent({ name: f.name, p: { ...EMPTY_PROGRESS, ...j.data.progress } }); setErr("");
    } catch { setErr("الملف غير صالح. يجب أن يكون ملف نسخة احتياطية من صفحة «إنجازاتي»."); }
  };
  const st = student ? progStats(student.p) : null;
  const totals = useMemo(() => data.usage.reduce((a, u) => ({ r: a.r + u.tutorRequests, e: a.e + u.tutorErrors }), { r: 0, e: 0 }), [data.usage]);
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="mb-2 font-bold">استخدام المعلم الذكي (آخر الأيام)</h3>
        {data.usage.length === 0 ? <p className="text-sm muted">لا توجد بيانات استخدام بعد.</p> : (
          <table className="w-full text-center text-sm"><thead><tr className="bg-black/5"><th className="p-2">التاريخ</th><th className="p-2">الطلبات</th><th className="p-2">الأخطاء</th></tr></thead>
            <tbody>{data.usage.slice(0, 14).map((u) => <tr key={u.date} className="border-b line"><td className="p-2">{u.date}</td><td className="p-2">{u.tutorRequests}</td><td className="p-2">{u.tutorErrors}</td></tr>)}</tbody></table>
        )}
        <p className="mt-2 text-sm">المجموع: {totals.r} طلباً، {totals.e} خطأ.</p>
        <button className="btn btn-ghost mt-2" onClick={() => download("استخدام-المعلم-الذكي.csv", "﻿" + ["التاريخ,الطلبات,الأخطاء", ...data.usage.map((u) => `${u.date},${u.tutorRequests},${u.tutorErrors}`)].join("\n"), "text/csv")}>تصدير CSV</button>
      </div>
      <div className="card space-y-3 p-5">
        <h3 className="font-bold">عرض تقرير طالب من ملف تقدمه</h3>
        <p className="text-sm muted">لا تُرفع الملفات إلى الخادم؛ تُقرأ في متصفحك فقط.</p>
        <input type="file" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); }} />
        {err && <p className="text-sm text-bad-700">{err}</p>}
        {student && st && (
          <div className="space-y-2 text-sm">
            <p><b>{student.name}</b>: نقاط الخبرة {student.p.xp} · دروس مكتملة {st.lessonsCompleted}/{LESSONS.length} · محاولات {st.attempts} · دقة {Math.round(st.accuracy * 100)}%</p>
            <table className="w-full text-sm"><thead><tr className="bg-black/5"><th className="p-1 text-right">المهارة</th><th className="p-1">الإتقان</th></tr></thead>
              <tbody>{SKILLS.filter((s) => student.p.skills[s.id]).map((s) => <tr key={s.id} className="border-b line"><td className="p-1">{lc(s.lessonId)} {s.name}</td><td className="p-1 text-center">{Math.round((skillMastery(student.p, s.id) ?? 0) * 100)}%</td></tr>)}</tbody></table>
            <p><b>الاختبارات:</b> {student.p.exams.map((e) => `${e.title} (${Math.round(e.pct)}%)`).join("، ") || "—"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AiAdmin({ data, save }: { data: Data; save: (v: StoreShape["ai"]) => Promise<boolean> }) {
  const [d, setD] = useState(data.ai);
  return (
    <div className="card max-w-2xl space-y-3 p-5">
      {!data.status.aiKey && <div className="rounded-xl bg-warn-50 p-3 text-sm text-warn-700">لم يُضبط مفتاح ANTHROPIC_API_KEY على الخادم، لذا المعلم الذكي غير متاح للطلاب مهما كانت هذه الإعدادات. يُضاف المفتاح في متغيرات بيئة الاستضافة ولا يُحفظ هنا.</div>}
      <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={d.enabled} onChange={(e) => setD({ ...d, enabled: e.target.checked })} /> تفعيل المعلم الذكي للطلاب</label>
      <label className="block text-sm"><span className="mb-1 block font-semibold">النموذج</span><input className="input ltr" dir="ltr" value={d.model} onChange={(e) => setD({ ...d, model: e.target.value.trim() })} /><span className="text-xs muted">الافتراضي claude-opus-5-5. يمكن اختيار نموذج أقل تكلفة مثل claude-sonnet-5-5 أو claude-haiku-5-5.</span></label>
      <label className="block text-sm"><span className="mb-1 block font-semibold">مستوى الجهد (عمق التفكير والتكلفة)</span><select className="input" value={d.effort} onChange={(e) => setD({ ...d, effort: e.target.value as typeof d.effort })}><option value="low">منخفض (أسرع وأقل تكلفة)</option><option value="medium">متوسط</option><option value="high">مرتفع</option></select></label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm">أقصى طول للرد (رموز)<input type="number" className="input" value={d.maxOutputTokens} onChange={(e) => setD({ ...d, maxOutputTokens: Number(e.target.value) })} /></label>
        <label className="text-sm">حد الطلبات لكل جهاز/ساعة<input type="number" className="input" value={d.perClientHourly} onChange={(e) => setD({ ...d, perClientHourly: Number(e.target.value) })} /></label>
        <label className="text-sm">الحد اليومي الإجمالي<input type="number" className="input" value={d.dailyLimit} onChange={(e) => setD({ ...d, dailyLimit: Number(e.target.value) })} /></label>
      </div>
      <label className="block text-sm"><span className="mb-1 block font-semibold">تعليمات إضافية للمعلم الذكي</span><textarea className="input min-h-[100px]" value={d.extraInstructions} onChange={(e) => setD({ ...d, extraInstructions: e.target.value })} placeholder="مثال: ركّز هذا الأسبوع على الوحدة الرابعة…" /></label>
      <button className="btn btn-primary" onClick={() => save(d)}>حفظ الإعدادات</button>
    </div>
  );
}
