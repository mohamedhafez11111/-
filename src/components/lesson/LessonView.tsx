"use client";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import type { Block, Lesson, Level, Question, WorkedExample } from "@/content/types";
import { LEVEL_LABEL } from "@/content/types";
import { UNIT_BY_ID, neighbours, questionsOfLesson, LESSON_BY_ID, lc, sc } from "@/content";
import { MathText, plainMath, Num } from "@/components/ui/MathText";
import { Figure } from "@/components/figures/Figure";
import { Icon } from "@/components/ui/Icon";
import { PracticeQuestion } from "@/components/questions/QuestionCard";
import { LessonQuiz } from "./LessonQuiz";
import { LabEmbed } from "@/components/labs/registry";
import { LAB_META } from "@/components/labs/meta";
import { GAME_META } from "@/components/games/meta";
import { openLesson, markSection, useProgress } from "@/lib/progress";
import { useLocal, writeLS } from "@/lib/storage";
import { usePublicContent, UnitBadge } from "@/components/ui/bits";
import { useTutorAvailable } from "@/lib/tutor";

const toneStyle: Record<string, string> = {
  info: "border-brand-400 bg-brand-50 dark:bg-brand-900/30",
  warn: "border-warn-500 bg-warn-50 dark:bg-warn-700/20",
  tip: "border-ok-500 bg-ok-50 dark:bg-ok-700/20",
  prev: "border-purple-400 bg-purple-50 dark:bg-purple-900/20",
};
const toneLabel: Record<string, string> = { info: "ملاحظة", warn: "تنبيه", tip: "مساعدة", prev: "سابقاً" };

function BlockView({ b, level }: { b: Block; level: Level }) {
  switch (b.type) {
    case "p": return <MathText as="p" text={b.text} className="text-[1.05rem]" />;
    case "rule":
      return (
        <div className="rounded-xl border-r-4 border-brand-600 bg-brand-50/70 p-4 dark:bg-brand-900/30">
          <div className="mb-1 font-bold text-brand-800 dark:text-brand-200">📐 {b.title}</div>
          <MathText as="div" text={b.text} className="text-[1.05rem]" />
        </div>
      );
    case "note":
      return (
        <div className={`rounded-xl border-r-4 p-3 text-sm ${toneStyle[b.tone]}`}>
          <b>{toneLabel[b.tone]}: </b><MathText text={b.text} />
        </div>
      );
    case "list": {
      const L = b.ordered ? "ol" : "ul";
      return <L className={`${b.ordered ? "list-decimal" : "list-disc"} space-y-1.5 pr-6`}>{b.items.map((it, i) => <li key={i}><MathText text={it} /></li>)}</L>;
    }
    case "figure":
      return (
        <figure className="rounded-xl border line p-3">
          <Figure fig={b.figure} />
          {b.caption && <figcaption className="mt-2 text-center text-sm muted"><MathText text={b.caption} /></figcaption>}
        </figure>
      );
    case "check":
      return (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-700 dark:text-brand-300"><Icon name="bolt" size={18} /> توقف وفكّر</div>
          <PracticeQuestion question={b.question} compact />
        </div>
      );
    case "widget":
      return (
        <div className="rounded-xl border-2 border-dashed border-brand-300 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold"><Icon name="flask" size={18} /> نشاط تفاعلي: {LAB_META[b.lab].title}</div>
            <Link href={`/labs/${b.lab}`} className="text-sm font-semibold text-brand-600">افتح في المختبر ←</Link>
          </div>
          {b.caption && <p className="mb-2 text-sm muted">{b.caption}</p>}
          <LabEmbed id={b.lab} />
        </div>
      );
    case "steps":
      return (
        <div className="rounded-xl border line p-4">
          <div className="mb-2 font-bold">🪜 {b.title}</div>
          <ol className="list-decimal space-y-1.5 pr-6">{b.steps.map((s, i) => <li key={i}><MathText text={s} /></li>)}</ol>
        </div>
      );
    case "levels":
      return <MathText as="p" text={b[level]} />;
  }
}

function ExampleView({ ex }: { ex: WorkedExample }) {
  const [shown, setShown] = useState(0);
  const all = shown >= ex.steps.length;
  return (
    <div className="rounded-xl border line p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`chip ${ex.level === "basic" ? "bg-ok-50 text-ok-700" : ex.level === "intermediate" ? "bg-brand-50 text-brand-700" : "bg-warn-50 text-warn-700"}`}>{LEVEL_LABEL[ex.level]}</span>
        <h4 className="font-bold">{ex.title}</h4>
      </div>
      <MathText as="p" text={ex.problem} className="mb-3 font-medium" />
      {ex.figure && <div className="mb-3 rounded-lg border line p-2"><Figure fig={ex.figure} /></div>}
      <ol className="space-y-2">
        {ex.steps.slice(0, shown).map((s, i) => (
          <li key={i} className="anim-pop flex gap-3 rounded-lg bg-black/[0.03] p-2.5 dark:bg-white/5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white"><Num>{i + 1}</Num></span>
            <div>
              <MathText text={s.text} />
              {s.why && <div className="mt-0.5 text-sm muted">لماذا؟ <MathText text={s.why} /></div>}
            </div>
          </li>
        ))}
      </ol>
      {all && <div className="anim-pop mt-3 rounded-lg bg-ok-50 p-3 font-semibold text-ok-700 dark:bg-ok-700/20 dark:text-ok-50">✔ الإجابة: <MathText text={ex.answer} /></div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!all && <button className="btn btn-soft !min-h-[40px] text-sm" onClick={() => setShown((v) => v + 1)}>{shown === 0 ? "ابدأ الحل خطوة بخطوة" : "الخطوة التالية"}</button>}
        {!all && <button className="btn btn-ghost !min-h-[40px] text-sm" onClick={() => setShown(ex.steps.length)}>أظهر الحل كاملاً</button>}
        {shown > 0 && <button className="btn btn-ghost !min-h-[40px] text-sm" onClick={() => setShown(0)}>إخفاء</button>}
      </div>
    </div>
  );
}

function Section({ id, title, children, icon }: { id: string; title: React.ReactNode; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24 space-y-4 p-5">
      <h2 className="flex items-center gap-2 text-xl font-bold">{icon}{title}</h2>
      {children}
    </section>
  );
}

const LEVEL_DIFF: Record<Level, number[]> = { basic: [1, 2], intermediate: [2, 3], advanced: [3, 4] };

export function LessonView({ lesson }: { lesson: Lesson }) {
  const unit = UNIT_BY_ID[lesson.unitId];
  const { prev, next } = neighbours(lesson.id);
  const { p } = useProgress();
  const { data: pub } = usePublicContent();
  const [level, setLevel] = useLocal<Level>("level", "basic");
  const [notes, setNotes] = useLocal<Record<string, string>>("lesson-notes", {});
  const [bookmarks, setBookmarks] = useLocal<string[]>("bookmarks", []);
  const [summarySaved, setSummarySaved] = useState(false);
  const tutorOn = useTutorAvailable();

  useEffect(() => { openLesson(lesson.id); }, [lesson.id]);

  const teacherNote = pub.lessonNotes.find((n) => n.lessonId === lesson.id);
  const exercises: Question[] = useMemo(() => {
    const bank = [...questionsOfLesson(lesson.id), ...pub.questions.filter((q) => q.lessonId === lesson.id)].filter((q) => !pub.hiddenQuestions.includes(q.id));
    const d = LEVEL_DIFF[level];
    const primary = bank.filter((q) => d.includes(q.difficulty));
    return primary.length >= 3 ? primary : bank;
  }, [lesson.id, level, pub]);
  const examples = [...lesson.examples].sort((a, b) => (a.level === level ? -1 : b.level === level ? 1 : 0));
  const doneSections = p.lessons[lesson.id]?.sections ?? [];
  const bookmarked = bookmarks.includes(lesson.id);

  const saveSummary = () => {
    const key = "summaries";
    const cur = (() => { try { return JSON.parse(localStorage.getItem("m10:" + key) ?? "{}"); } catch { return {}; } })() as Record<string, string>;
    cur[lesson.id] = `${lc(lesson.id)} ${lesson.title}\n` + lesson.summary.map((s) => "• " + plainMath(s)).join("\n") + "\n\nالقوانين:\n" + lesson.rules.map((r) => `• ${r.title}: ${plainMath(r.text)}`).join("\n");
    writeLS(key, cur);
    setSummarySaved(true);
  };

  const toc = [
    { id: "objectives", t: "الأهداف" }, { id: "hook", t: "تمهيد" },
    ...lesson.sections.map((s) => ({ id: "sec-" + s.id, t: s.title })),
    { id: "rules", t: "القوانين" }, { id: "examples", t: "أمثلة محلولة" }, { id: "mistakes", t: "أخطاء شائعة" },
    { id: "summary", t: "الملخص" }, { id: "practice", t: "تدريبات" }, { id: "quiz", t: "الاختبار القصير" },
  ];

  return (
    <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-6">
      <article className="min-w-0 space-y-5">
        {/* العنوان */}
        <header className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 p-5" style={{ background: `linear-gradient(135deg, ${unit.color}22, transparent)` }}>
            <UnitBadge unit={unit} size={56} />
            <div className="flex-1">
              <Link href={`/curriculum#${unit.id}`} className="text-sm font-bold" style={{ color: unit.color }}>الوحدة <Num>{unit.number}</Num>: {unit.title}</Link>
              <h1 className="text-2xl font-bold sm:text-3xl"><Num>{lc(lesson.id)}</Num> {lesson.title}</h1>
              <div className="mt-1 text-sm muted">كتاب الطالب ص <Num>{lesson.sbPage}</Num> · كتاب النشاط ص <Num>{lesson.abPages}</Num></div>
            </div>
            <div className="no-print flex flex-wrap gap-2">
              <button className="btn btn-ghost !min-h-[40px] text-sm" onClick={() => setBookmarks((b) => (b.includes(lesson.id) ? b.filter((x) => x !== lesson.id) : [lesson.id, ...b]))} aria-pressed={bookmarked}>
                <Icon name="bookmark" size={18} /> {bookmarked ? "في المرجعية" : "علامة مرجعية"}
              </button>
              <button className="btn btn-ghost !min-h-[40px] text-sm" onClick={() => window.print()}><Icon name="print" size={18} /> طباعة</button>
            </div>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2 border-t line p-3">
            <span className="text-sm font-semibold">مستوى الشرح:</span>
            {(["basic", "intermediate", "advanced"] as Level[]).map((lv) => (
              <button key={lv} onClick={() => setLevel(lv)} className={`chip !px-4 !py-2 text-sm ${level === lv ? "bg-brand-600 text-white" : "bg-black/5 dark:bg-white/10"}`} aria-pressed={level === lv}>{LEVEL_LABEL[lv]}</button>
            ))}
            <span className="text-xs muted">يغيّر ترتيب الأمثلة ومستوى التدريبات</span>
          </div>
        </header>

        {teacherNote && (teacherNote.teacherNote || teacherNote.extraExplanation) && (
          <div className="card border-r-4 border-r-purple-500 p-4">
            <div className="mb-1 font-bold">📝 ملاحظة المعلم</div>
            {teacherNote.teacherNote && <p className="whitespace-pre-line">{teacherNote.teacherNote}</p>}
            {teacherNote.extraExplanation && <MathText as="div" className="mt-2 whitespace-pre-line" text={teacherNote.extraExplanation} />}
            {teacherNote.extraExample && (
              <div className="mt-3 rounded-lg bg-black/[0.03] p-3 dark:bg-white/5"><b>مثال إضافي: </b><MathText text={teacherNote.extraExample.problem} /><div className="mt-1"><b>الحل: </b><MathText text={teacherNote.extraExample.solution} /></div></div>
            )}
          </div>
        )}

        <Section id="objectives" title="أهداف التعلّم" icon={<Icon name="flag" />}>
          <ul className="space-y-1.5">{lesson.objectives.map((o, i) => <li key={i} className="flex gap-2"><Icon name="check" size={18} className="mt-1 shrink-0 text-ok-500" /><MathText text={o} /></li>)}</ul>
          <div>
            <h3 className="mb-1.5 font-bold">المتطلبات السابقة</h3>
            <ul className="list-disc space-y-1 pr-6 text-sm">
              {lesson.prerequisites.map((pr, i) => <li key={i}>{pr.lessonId ? <Link className="text-brand-600 underline" href={`/lessons/${pr.lessonId}`}>{pr.text} (الدرس {lc(pr.lessonId)}: {LESSON_BY_ID[pr.lessonId].title})</Link> : <MathText text={pr.text} />}</li>)}
            </ul>
          </div>
          {lesson.vocabulary && (
            <div className="flex flex-wrap gap-2">{lesson.vocabulary.map((v) => <span key={v.en} className="chip bg-black/5 dark:bg-white/10">{v.ar} <span className="ltr text-xs muted">{v.en}</span></span>)}</div>
          )}
        </Section>

        <Section id="hook" title="تمهيد" icon={<Icon name="bulb" />}>
          <MathText as="p" text={lesson.hook} className="text-lg" />
        </Section>

        {lesson.sections.map((s) => {
          const done = doneSections.includes(s.id);
          return (
            <Section key={s.id} id={"sec-" + s.id} title={<>{s.code && <bdi dir="ltr" className="text-brand-600"><Num>{sc(s.code)}</Num></bdi>} {s.title}</>} icon={<Icon name="book" />}>
              {s.blocks.map((b, i) => <BlockView key={i} b={b} level={level} />)}
              <div className="no-print flex justify-end">
                <button className={`btn !min-h-[40px] text-sm ${done ? "btn-ok" : "btn-soft"}`} onClick={() => markSection(lesson.id, s.id)} disabled={done}>
                  <Icon name="check" size={18} /> {done ? "تم: فهمت هذا الجزء" : "فهمت هذا الجزء"}
                </button>
              </div>
            </Section>
          );
        })}

        <Section id="rules" title="القوانين والنتائج الرياضية" icon={<span>📐</span>}>
          <div className="grid gap-3 sm:grid-cols-2">
            {lesson.rules.map((r, i) => (
              <div key={i} className="rounded-xl border line p-3"><div className="text-sm font-bold text-brand-700 dark:text-brand-300">{r.title}</div><MathText as="div" text={r.text} className="text-lg" /></div>
            ))}
          </div>
        </Section>

        <Section id="examples" title="أمثلة محلولة خطوة بخطوة" icon={<span>✍️</span>}>
          {examples.map((ex) => <ExampleView key={ex.id} ex={ex} />)}
        </Section>

        {lesson.realLife.length > 0 && (
          <Section id="real" title="الرياضيات في حياتنا" icon={<span>🌍</span>}>
            <ul className="list-disc space-y-1 pr-6">{lesson.realLife.map((r, i) => <li key={i}><MathText text={r} /></li>)}</ul>
          </Section>
        )}

        <Section id="mistakes" title="أخطاء شائعة وتنبيهات" icon={<Icon name="alert" />}>
          <div className="space-y-2">
            {lesson.mistakes.map((m, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-bad-50 p-3 text-sm dark:bg-bad-700/20"><b className="text-bad-700 dark:text-bad-50">✘ خطأ: </b><MathText text={m.wrong} /></div>
                <div className="rounded-lg bg-ok-50 p-3 text-sm dark:bg-ok-700/20"><b className="text-ok-700 dark:text-ok-50">✔ الصواب: </b><MathText text={m.right} /></div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="summary" title="ملخص أهم الأفكار" icon={<Icon name="notes" />}>
          <ul className="space-y-1.5">{lesson.summary.map((s, i) => <li key={i} className="flex gap-2"><span className="text-brand-600">◆</span><MathText text={s} /></li>)}</ul>
          <div className="no-print flex flex-wrap gap-2">
            <button className="btn btn-soft !min-h-[40px] text-sm" onClick={saveSummary}><Icon name="download" size={18} /> {summarySaved ? "حُفظ في ملخصاتي ✔" : "احفظ الملخص في ملخصاتي"}</button>
          </div>
          <label className="no-print block">
            <span className="mb-1 block text-sm font-semibold">ملاحظاتي على هذا الدرس (تُحفظ تلقائياً على جهازك)</span>
            <textarea className="input min-h-[90px]" value={notes[lesson.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [lesson.id]: e.target.value }))} placeholder="اكتب ما تريد تذكّره…" />
          </label>
        </Section>

        <Section id="practice" title={`تدريبات متدرّجة (${LEVEL_LABEL[level]})`} icon={<Icon name="bank" />}>
          <p className="text-sm muted">تصحيح فوري مع شرح. غيّر مستوى الشرح أعلى الصفحة لتغيير مستوى التدريبات.</p>
          {exercises.slice(0, 6).map((q) => <PracticeQuestion key={q.id} question={q} compact />)}
          <Link href={`/bank?lesson=${lesson.id}`} className="btn btn-ghost">المزيد من أسئلة الدرس في بنك الأسئلة ←</Link>
        </Section>

        <Section id="quiz" title="اختبار قصير في نهاية الدرس" icon={<Icon name="exam" />}>
          <LessonQuiz lessonId={lesson.id} extra={pub.questions.filter((q) => q.lessonId === lesson.id)} hidden={pub.hiddenQuestions} />
        </Section>

        <Section id="links" title="أنشطة ومختبرات مرتبطة" icon={<Icon name="flask" />}>
          <div className="flex flex-wrap gap-2">
            {lesson.labs.map((l) => <Link key={l} href={`/labs/${l}`} className="btn btn-soft"><Icon name="flask" size={18} /> {LAB_META[l].title}</Link>)}
            {lesson.games.map((g) => <Link key={g} href={`/games/${g}`} className="btn btn-ghost"><Icon name="game" size={18} /> {GAME_META[g].title}</Link>)}
            {tutorOn && <button className="btn btn-ghost" onClick={() => window.dispatchEvent(new Event("m10-open-tutor"))}><Icon name="bot" size={18} /> اسأل المعلم الذكي عن الدرس</button>}
          </div>
          <p className="text-sm muted">ارجع إلى كتاب النشاط ص <Num>{lesson.abPages}</Num> لحل تمارين الدرس الورقية.</p>
        </Section>

        <nav className="no-print flex justify-between gap-2" aria-label="التنقل بين الدروس">
          {prev ? <Link href={`/lessons/${prev.id}`} className="btn btn-ghost"><Icon name="arrow-right" size={18} /> {lc(prev.id)} {prev.title}</Link> : <span />}
          {next ? <Link href={`/lessons/${next.id}`} className="btn btn-primary">{lc(next.id)} {next.title} <Icon name="arrow-left" size={18} /></Link> : <span />}
        </nav>
      </article>

      <aside className="no-print hidden lg:block">
        <div className="card sticky top-20 p-3 text-sm">
          <div className="mb-2 font-bold">محتويات الدرس</div>
          <ul className="space-y-0.5">
            {toc.map((t) => <li key={t.id}><a href={`#${t.id}`} className="block rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">{t.t}</a></li>)}
          </ul>
        </div>
      </aside>
    </div>
  );
}
