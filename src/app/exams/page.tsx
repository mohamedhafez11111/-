"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UNITS, LESSONS, BANK_QUESTIONS, QUESTION_BY_ID } from "@/content";
import type { Question } from "@/content/types";
import { PageHeader, usePublicContent } from "@/components/ui/bits";
import { ExamRunner, type ExamConfig, type SavedExam } from "@/components/exams/ExamRunner";
import { useProgress } from "@/lib/progress";
import { readLS } from "@/lib/storage";
import { Icon } from "@/components/ui/Icon";
import { Num } from "@/components/ui/MathText";

type Kind = "lesson" | "unit" | "term" | "practice" | "simulation";
const KINDS: { k: Kind; t: string; d: string; icon: string }[] = [
  { k: "lesson", t: "اختبار قصير لدرس", d: "5–10 أسئلة على درس واحد", icon: "📝" },
  { k: "unit", t: "اختبار وحدة", d: "أسئلة متدرجة على دروس وحدة كاملة", icon: "📚" },
  { k: "term", t: "اختبار شامل للفصل الأول", d: "أسئلة من جميع الوحدات الثماني", icon: "🎓" },
  { k: "practice", t: "اختبار تدريبي دون درجات", d: "للتدريب الحر دون تسجيل نتيجة", icon: "🏋️" },
  { k: "simulation", t: "محاكاة الاختبار المدرسي", d: "نمط امتحان نهاية الفصل: درجات حسب الصعوبة ووقت أطول", icon: "⏱️" },
];

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** اختيار أسئلة دون تكرار مع توزيع على الدروس والمهارات والصعوبات */
function pickBalanced(pool: Question[], n: number, diffs: number[]): Question[] {
  const filtered = pool.filter((q) => diffs.includes(q.difficulty));
  const src = filtered.length >= n ? filtered : pool;
  const byLesson = new Map<string, Question[]>();
  for (const q of shuffle(src)) byLesson.set(q.lessonId, [...(byLesson.get(q.lessonId) ?? []), q]);
  const out: Question[] = [];
  const usedSkills = new Set<string>();
  // جولة أولى: مهارات مختلفة من كل درس، ثم ملء الباقي
  for (let round = 0; out.length < n && round < 50; round++) {
    let added = false;
    for (const [, arr] of byLesson) {
      if (out.length >= n) break;
      const idx = arr.findIndex((q) => round > 0 || !usedSkills.has(q.skill));
      if (idx >= 0) { const [q] = arr.splice(idx, 1); out.push(q); usedSkills.add(q.skill); added = true; }
    }
    if (!added) break;
  }
  return out.sort((a, b) => a.difficulty - b.difficulty);
}

function ExamsInner() {
  const sp = useSearchParams();
  const { p } = useProgress();
  const { data: pub } = usePublicContent();
  const [kind, setKind] = useState<Kind>((sp.get("mode") as Kind) ?? "lesson");
  const [lesson, setLesson] = useState(sp.get("lesson") ?? LESSONS[0].id);
  const [unit, setUnit] = useState(sp.get("unit") ?? "u1");
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(15);
  const [diffs, setDiffs] = useState<number[]>([1, 2, 3, 4]);
  const [cfg, setCfg] = useState<ExamConfig | null>(null);
  const [resume, setResume] = useState<SavedExam | null>(null);

  useEffect(() => {
    if (kind === "lesson") { setCount(6); setMinutes(10); }
    else if (kind === "unit") { setCount(12); setMinutes(25); }
    else if (kind === "term") { setCount(20); setMinutes(45); }
    else if (kind === "simulation") { setCount(25); setMinutes(150); }
    else { setCount(10); setMinutes(0); }
  }, [kind]);
  useEffect(() => { setResume(readLS<SavedExam | null>("exam-in-progress", null)); }, [cfg]);

  const pool = useMemo(() => [...BANK_QUESTIONS, ...pub.questions].filter((q) => !pub.hiddenQuestions.includes(q.id)), [pub]);

  const start = (custom?: { title: string; lessonIds: string[]; count: number; minutes: number; difficulty: number[] }) => {
    let src: Question[];
    let title: string;
    if (custom) { src = pool.filter((q) => custom.lessonIds.includes(q.lessonId)); title = custom.title; }
    else if (kind === "lesson") { src = pool.filter((q) => q.lessonId === lesson); title = `اختبار الدرس ${lesson}`; }
    else if (kind === "unit") { const u = UNITS.find((x) => x.id === unit)!; src = pool.filter((q) => u.lessonIds.includes(q.lessonId)); title = `اختبار الوحدة ${u.number}: ${u.title}`; }
    else if (kind === "practice") { const l = sp.get("lesson"); const u = sp.get("unit"); src = l ? pool.filter((q) => q.lessonId === l) : u ? pool.filter((q) => LESSONS.find((x) => x.id === q.lessonId)?.unitId === u) : pool; title = "اختبار تدريبي"; }
    else { src = pool; title = kind === "simulation" ? "محاكاة امتحان نهاية الفصل الدراسي الأول" : "الاختبار الشامل للفصل الدراسي الأول"; }
    const n = Math.min(custom?.count ?? count, src.length);
    const qs = pickBalanced(src, n, custom?.difficulty ?? diffs);
    setCfg({
      id: `${kind}-${Date.now()}`,
      title,
      questions: qs,
      minutes: custom?.minutes ?? minutes,
      graded: custom ? true : kind !== "practice",
      marks: kind === "simulation" && !custom ? (q) => (q.type === "multi" ? q.parts.length : q.difficulty >= 3 ? 2 : 1) : undefined,
    });
    window.scrollTo({ top: 0 });
  };

  if (cfg) return <ExamRunner cfg={cfg} onExit={() => setCfg(null)} />;

  return (
    <div>
      <PageHeader icon="exam" title="الاختبارات الإلكترونية" subtitle="اختبارات بتوقيت، وترتيب عشوائي للأسئلة والخيارات، وحفظ تلقائي للإجابات، وتصحيح فوري مع تحليل المهارات والحل النموذجي بعد التسليم." />
      {resume && resume.qids && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-r-4 border-r-warn-500 p-4 text-sm">
          <span>لديك اختبار لم يُسلَّم بعد على هذا الجهاز: <b>{resume.title}</b></span>
          <button className="btn btn-warn !min-h-[40px]" onClick={() => {
            const qs = resume.qids.map((id) => QUESTION_BY_ID[id] ?? pool.find((q) => q.id === id)).filter(Boolean) as Question[];
            setCfg({ id: resume.cfgId, title: resume.title, questions: qs, minutes: resume.minutes, graded: resume.graded, marks: resume.sim ? (q) => (q.type === "multi" ? q.parts.length : q.difficulty >= 3 ? 2 : 1) : undefined });
          }}>استكمل الاختبار</button>
        </div>
      )}

      {pub.exams.length > 0 && (
        <div className="card mb-5 p-4">
          <h2 className="mb-2 font-bold">📌 اختبارات من المعلم</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {pub.exams.map((e) => (
              <button key={e.id} className="rounded-xl border-2 line p-3 text-right hover:border-brand-400" onClick={() => start({ title: e.title, lessonIds: e.lessonIds, count: e.count, minutes: e.minutes, difficulty: e.difficulty })}>
                <div className="font-bold">{e.title}</div>
                <div className="text-xs muted">الدروس: {e.lessonIds.join("، ")} · <Num>{e.count}</Num> سؤالاً · <Num>{e.minutes}</Num> دقيقة</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {KINDS.map((x) => (
          <button key={x.k} onClick={() => setKind(x.k)} className={`card p-4 text-right transition ${kind === x.k ? "ring-2 ring-brand-500" : "hover:shadow-lg"}`}>
            <div className="text-2xl">{x.icon}</div><div className="mt-1 font-bold">{x.t}</div><div className="text-xs muted">{x.d}</div>
          </button>
        ))}
      </div>

      <div className="card mt-5 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {kind === "lesson" && (
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-semibold">الدرس</span>
            <select className="input" value={lesson} onChange={(e) => setLesson(e.target.value)}>{LESSONS.map((l) => <option key={l.id} value={l.id}>{l.id} {l.title}</option>)}</select>
          </label>
        )}
        {kind === "unit" && (
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-semibold">الوحدة</span>
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>{UNITS.map((u) => <option key={u.id} value={u.id}>الوحدة {u.number}: {u.title}</option>)}</select>
          </label>
        )}
        <label className="block"><span className="mb-1 block text-sm font-semibold">عدد الأسئلة</span><input type="number" min={3} max={40} className="input" value={count} onChange={(e) => setCount(Math.max(3, Math.min(40, Number(e.target.value))))} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">الزمن بالدقائق (0 = دون توقيت)</span><input type="number" min={0} max={180} className="input" value={minutes} onChange={(e) => setMinutes(Math.max(0, Math.min(180, Number(e.target.value))))} /></label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-sm font-semibold">مستويات الصعوبة</legend>
          <div className="flex flex-wrap gap-1.5">
            {[[1, "سهل"], [2, "متوسط"], [3, "متقدم"], [4, "تحدٍّ"]].map(([d, t]) => (
              <button key={d} className={`chip !px-4 !py-2 ${diffs.includes(d as number) ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setDiffs((x) => (x.includes(d as number) ? (x.length > 1 ? x.filter((y) => y !== d) : x) : [...x, d as number]))}>{t as string}</button>
            ))}
          </div>
        </fieldset>
        <div className="flex items-end sm:col-span-2 lg:col-span-4">
          <button className="btn btn-primary !px-8 text-lg" onClick={() => start()}><Icon name="play" /> ابدأ الاختبار</button>
        </div>
      </div>

      {p.exams.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-2 font-bold">نتائجك السابقة (على هذا الجهاز)</h2>
          <ul className="divide-y line text-sm">
            {p.exams.slice(0, 10).map((e, i) => <li key={i} className="flex justify-between gap-2 py-2"><span>{e.title}</span><span className="font-bold"><Num>{`${Math.round(e.pct)}%`}</Num> <span className="font-normal muted">{new Date(e.ts).toLocaleDateString("ar-OM")}</span></span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ExamsPage() {
  return <Suspense fallback={<div className="muted">جارٍ التحميل…</div>}><ExamsInner /></Suspense>;
}
