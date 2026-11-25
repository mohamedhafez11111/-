"use client";
import Link from "next/link";
import { useState } from "react";
import { PageHeader, Empty } from "@/components/ui/bits";
import { useLocal } from "@/lib/storage";
import { LESSONS, LESSON_BY_ID, QUESTION_BY_ID } from "@/content";
import { MathText } from "@/components/ui/MathText";
import { Icon } from "@/components/ui/Icon";
import { PracticeQuestion } from "@/components/questions/QuestionCard";
import { plainMath } from "@/components/ui/MathText";

interface Note { id: string; title: string; body: string; lessonId?: string; kind: "note" | "rule" | "mistake" | "later"; ts: number }

const TABS = [
  { id: "notes", t: "ملاحظاتي" }, { id: "rules", t: "قوانيني المهمة" }, { id: "summaries", t: "الملخصات المحفوظة" }, { id: "lesson", t: "ملاحظات الدروس" },
  { id: "hard", t: "الأسئلة الصعبة" }, { id: "mistakes", t: "أخطائي" }, { id: "later", t: "مسائل للمراجعة لاحقاً" }, { id: "bookmarks", t: "العلامات المرجعية" },
] as const;

export default function NotesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("notes");
  const [notes, setNotes] = useLocal<Note[]>("notes", []);
  const [summaries, setSummaries] = useLocal<Record<string, string>>("summaries", {});
  const [lessonNotes] = useLocal<Record<string, string>>("lesson-notes", {});
  const [hard, setHard] = useLocal<string[]>("hard", []);
  const [mistakes, setMistakes] = useLocal<string[]>("mistakes", []);
  const [bookmarks, setBookmarks] = useLocal<string[]>("bookmarks", []);
  const [draft, setDraft] = useState<{ title: string; body: string; lessonId: string }>({ title: "", body: "", lessonId: "" });
  const [practice, setPractice] = useState<string | null>(null);

  const kindOf = tab === "rules" ? "rule" : tab === "mistakes" ? "mistake" : tab === "later" ? "later" : "note";
  const listOf = (k: Note["kind"]) => notes.filter((n) => n.kind === k);
  const add = () => {
    if (!draft.title.trim() && !draft.body.trim()) return;
    setNotes([{ id: Date.now().toString(36), title: draft.title.trim() || "بدون عنوان", body: draft.body, lessonId: draft.lessonId || undefined, kind: kindOf, ts: Date.now() }, ...notes]);
    setDraft({ title: "", body: "", lessonId: "" });
  };

  const exportAll = () => {
    const text = [
      "ملاحظاتي – منصة الرياضيات التفاعلية (الصف العاشر)",
      "",
      ...(["note", "rule", "mistake", "later"] as const).flatMap((k) => [`== ${({ note: "ملاحظات", rule: "قوانين", mistake: "أخطاء وقعت فيها", later: "مسائل للمراجعة" })[k]} ==`, ...listOf(k).map((n) => `• ${n.title}${n.lessonId ? ` [${n.lessonId}]` : ""}\n${n.body}`), ""]),
      "== الملخصات ==", ...Object.values(summaries), "",
      "== ملاحظات الدروس ==", ...Object.entries(lessonNotes).filter(([, v]) => v.trim()).map(([k, v]) => `[${k}] ${v}`), "",
      "== الأسئلة الصعبة ==", ...hard.map((id) => QUESTION_BY_ID[id] ? `• ${plainMath(QUESTION_BY_ID[id].prompt)}` : ""),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ملاحظاتي-رياضيات-العاشر.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const noteForm = (placeholder: string) => (
    <div className="card no-print space-y-2 p-4">
      <input className="input" placeholder="العنوان" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <textarea className="input min-h-[90px]" placeholder={placeholder} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
      <div className="flex flex-wrap gap-2">
        <select className="input max-w-xs" value={draft.lessonId} onChange={(e) => setDraft({ ...draft, lessonId: e.target.value })} aria-label="الدرس المرتبط">
          <option value="">بدون درس محدد</option>{LESSONS.map((l) => <option key={l.id} value={l.id}>{l.id} {l.title}</option>)}
        </select>
        <button className="btn btn-primary" onClick={add}><Icon name="plus" size={18} /> أضف</button>
      </div>
      <p className="text-xs muted">يمكنك كتابة الرموز: \frac{"{"}أ{"}"}{"{"}ب{"}"} للكسر، و ^ للأس.</p>
    </div>
  );

  const noteList = (k: Note["kind"]) => (
    listOf(k).length === 0 ? <Empty title="لا يوجد شيء بعد" icon="notes" /> : (
      <div className="grid gap-3 sm:grid-cols-2">
        {listOf(k).map((n) => (
          <div key={n.id} className="card space-y-1 p-4">
            <div className="flex items-start justify-between gap-2"><div className="font-bold">{n.title}</div><button className="no-print muted" onClick={() => setNotes(notes.filter((x) => x.id !== n.id))} aria-label="حذف"><Icon name="trash" size={16} /></button></div>
            {n.lessonId && <Link href={`/lessons/${n.lessonId}`} className="chip bg-brand-50 text-brand-700">{n.lessonId} {LESSON_BY_ID[n.lessonId]?.title}</Link>}
            <MathText as="div" className="whitespace-pre-wrap text-sm" text={n.body} />
            <div className="text-xs muted">{new Date(n.ts).toLocaleDateString("ar-OM")}</div>
          </div>
        ))}
      </div>
    )
  );

  const qList = (ids: string[], remove: (id: string) => void) => (
    ids.length === 0 ? <Empty title="القائمة فارغة" icon="bank">تُضاف الأسئلة هنا عند حفظها أو الإجابة عنها إجابة خاطئة.</Empty> : (
      <div className="space-y-3">
        {ids.map((id) => QUESTION_BY_ID[id]).filter(Boolean).map((q) => (
          <div key={q.id} className="card p-4">
            {practice === q.id ? <PracticeQuestion question={q} compact /> : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1"><span className="chip ml-2 bg-black/5">الدرس {q.lessonId}</span><MathText text={q.prompt} /></div>
                <div className="no-print flex gap-1.5"><button className="btn btn-soft !min-h-[38px] text-sm" onClick={() => setPractice(q.id)}>حلّه الآن</button><button className="btn btn-ghost !min-h-[38px] text-sm" onClick={() => remove(q.id)}>إزالة</button></div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  );

  return (
    <div>
      <PageHeader icon="notes" title="ملخصاتي وملاحظاتي" subtitle="مساحتك الشخصية: تُحفظ على هذا الجهاز فقط. يمكنك تصديرها كملف نصي أو طباعتها.">
        <button className="btn btn-ghost" onClick={exportAll}><Icon name="download" size={18} /> تصدير</button>
        <button className="btn btn-ghost" onClick={() => window.print()}><Icon name="print" size={18} /> طباعة</button>
      </PageHeader>
      <div className="no-print mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`chip shrink-0 !px-4 !py-2 ${tab === t.id ? "bg-brand-600 text-white" : "bg-black/5 dark:bg-white/10"}`}>{t.t}</button>)}
      </div>
      <div className="space-y-4">
        {tab === "notes" && (<>{noteForm("اكتب ملاحظتك…")}{noteList("note")}</>)}
        {tab === "rules" && (<>
          {noteForm("مثال: الميل = \\frac{ص_2 - ص_1}{س_2 - س_1}")}
          {noteList("rule")}
          <details className="card p-4"><summary className="cursor-pointer font-bold">أضف قانوناً من الدروس</summary>
            <div className="mt-3 space-y-2">{LESSONS.flatMap((l) => l.rules.map((r, i) => (
              <div key={l.id + i} className="flex items-center justify-between gap-2 rounded-lg border line p-2 text-sm">
                <span><span className="chip bg-black/5">{l.id}</span> <b>{r.title}: </b><MathText text={r.text} /></span>
                <button className="btn btn-soft !min-h-[34px] shrink-0 !px-3 text-xs" onClick={() => setNotes([{ id: Date.now().toString(36) + i, title: r.title, body: r.text, lessonId: l.id, kind: "rule", ts: Date.now() }, ...notes])}>أضف</button>
              </div>
            )))}</div>
          </details>
        </>)}
        {tab === "summaries" && (Object.keys(summaries).length === 0 ? <Empty title="لا توجد ملخصات محفوظة" icon="notes">احفظ ملخص أي درس من نهاية صفحة الدرس.</Empty> : (
          <div className="grid gap-3 sm:grid-cols-2">{Object.entries(summaries).map(([id, t]) => (
            <div key={id} className="card p-4"><div className="mb-1 flex justify-between"><Link href={`/lessons/${id}`} className="font-bold text-brand-600">{id} {LESSON_BY_ID[id]?.title}</Link><button className="no-print muted" onClick={() => { const n = { ...summaries }; delete n[id]; setSummaries(n); }} aria-label="حذف"><Icon name="trash" size={16} /></button></div><pre className="whitespace-pre-wrap font-sans text-sm">{t}</pre></div>
          ))}</div>
        ))}
        {tab === "lesson" && (Object.values(lessonNotes).every((v) => !v?.trim()) ? <Empty title="لا توجد ملاحظات دروس" icon="notes">اكتب ملاحظاتك في قسم الملخص داخل كل درس.</Empty> : (
          <div className="grid gap-3 sm:grid-cols-2">{Object.entries(lessonNotes).filter(([, v]) => v?.trim()).map(([id, v]) => (
            <div key={id} className="card p-4"><Link href={`/lessons/${id}#summary`} className="font-bold text-brand-600">{id} {LESSON_BY_ID[id]?.title}</Link><p className="mt-1 whitespace-pre-wrap text-sm">{v}</p></div>
          ))}</div>
        ))}
        {tab === "hard" && qList(hard, (id) => setHard(hard.filter((x) => x !== id)))}
        {tab === "mistakes" && (<>
          {qList(mistakes, (id) => setMistakes(mistakes.filter((x) => x !== id)))}
          <h3 className="pt-2 font-bold">أخطاء أريد تذكّرها</h3>
          {noteForm("اكتب الخطأ الذي وقعت فيه والطريقة الصحيحة…")}
          {noteList("mistake")}
        </>)}
        {tab === "later" && (<>{noteForm("اكتب المسألة التي تريد مراجعتها لاحقاً…")}{noteList("later")}</>)}
        {tab === "bookmarks" && (bookmarks.length === 0 ? <Empty title="لا توجد علامات مرجعية" icon="bookmark">أضف علامة مرجعية من أعلى صفحة أي درس.</Empty> : (
          <div className="grid gap-2 sm:grid-cols-2">{bookmarks.map((id) => (
            <div key={id} className="card flex items-center justify-between p-4"><Link href={`/lessons/${id}`} className="font-bold">{id} {LESSON_BY_ID[id]?.title}</Link><button className="muted" onClick={() => setBookmarks(bookmarks.filter((b) => b !== id))} aria-label="إزالة"><Icon name="trash" size={16} /></button></div>
          ))}</div>
        ))}
      </div>
    </div>
  );
}
