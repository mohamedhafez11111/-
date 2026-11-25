"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UNITS, LESSONS, BANK_QUESTIONS, LESSON_BY_ID } from "@/content";
import type { Question } from "@/content/types";
import { PageHeader, Bar, Empty } from "@/components/ui/bits";
import { PracticeQuestion } from "@/components/questions/QuestionCard";
import { useProgress, weakSkills, recordDaily, today, unitMastery } from "@/lib/progress";
import { generate } from "@/content/generators";
import { MathText, Num } from "@/components/ui/MathText";
import { Icon } from "@/components/ui/Icon";
import { useLocal } from "@/lib/storage";

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

function dailySet(): Question[] {
  const rnd = seeded("daily-" + today());
  const pool = BANK_QUESTIONS.filter((q) => q.type === "mcq" || q.type === "numeric" || q.type === "tf");
  const out: Question[] = [];
  const usedLessons = new Set<string>();
  for (let i = 0; out.length < 5 && i < 400; i++) {
    const q = pool[Math.floor(rnd() * pool.length)];
    if (!usedLessons.has(q.lessonId)) { usedLessons.add(q.lessonId); out.push(q); }
  }
  return out;
}

function Flashcards() {
  const [unit, setUnit] = useState("all");
  const cards = useMemo(() => LESSONS.filter((l) => unit === "all" || l.unitId === unit).flatMap((l) => [
    ...l.rules.map((r) => ({ front: r.title, back: r.text, lesson: l.id })),
    ...(l.vocabulary ?? []).map((v) => ({ front: v.ar, back: `بالإنجليزية: ${v.en}`, lesson: l.id })),
  ]), [unit]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  useEffect(() => { setI(0); setFlip(false); }, [unit]);
  const c = cards[i % Math.max(1, cards.length)];
  return (
    <div className="space-y-3">
      <select className="input max-w-xs" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="الوحدة">
        <option value="all">كل الوحدات</option>{UNITS.map((u) => <option key={u.id} value={u.id}>الوحدة {u.number}: {u.title}</option>)}
      </select>
      {c && (
        <button onClick={() => setFlip(!flip)} className={`anim-pop grid min-h-[180px] w-full place-items-center rounded-2xl p-6 text-center text-xl font-bold shadow-lg transition ${flip ? "bg-ok-50 text-ok-700 dark:bg-ok-700/20 dark:text-ok-50" : "bg-gradient-to-br from-brand-500 to-brand-700 text-white"}`} key={i + String(flip)} aria-label="اقلب البطاقة">
          <div>
            <div className="mb-2 text-xs opacity-70">الدرس {c.lesson} · {flip ? "الجواب" : "اضغط لقلب البطاقة"}</div>
            <MathText text={flip ? c.back : c.front} />
          </div>
        </button>
      )}
      <div className="flex items-center justify-between">
        <button className="btn btn-ghost" onClick={() => { setI((x) => (x - 1 + cards.length) % cards.length); setFlip(false); }}>السابقة</button>
        <span className="text-sm muted"><Num>{`${(i % cards.length) + 1} / ${cards.length}`}</Num></span>
        <button className="btn btn-primary" onClick={() => { setI((x) => (x + 1) % cards.length); setFlip(false); }}>التالية</button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { p } = useProgress();
  const daily = useMemo(dailySet, []);
  const [dailyDone, setDailyDone] = useState<Record<string, boolean>>({});
  const weak = weakSkills(p);
  const [smart, setSmart] = useState<Question[] | null>(null);
  const [quick, setQuick] = useState<Question[] | null>(null);
  const [examDate, setExamDate] = useLocal("exam-date", "");

  useEffect(() => { if (p.daily.date === today()) setDailyDone(Object.fromEntries(daily.slice(0, p.daily.done).map((q) => [q.id, true]))); }, [p.daily.date]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildSmart = () => {
    const qs: Question[] = [];
    for (const s of weak.slice(0, 5)) {
      const bank = BANK_QUESTIONS.filter((q) => q.skill === s.id && !(p.answers[q.id]?.last));
      if (bank[0]) qs.push(bank[Math.floor(Math.random() * bank.length)]);
      const g = generate(s.id);
      if (g) qs.push(g);
    }
    setSmart(qs);
  };

  // خطة المراجعة المقترحة: ترتيب الوحدات من الأضعف إلى الأقوى وتوزيعها على الأيام المتبقية
  const daysLeft = examDate ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000)) : 7;
  const ordered = [...UNITS].sort((a, b) => unitMastery(p, a.id) - unitMastery(p, b.id));
  const plan = Array.from({ length: Math.min(daysLeft, 14) }, (_, d) => {
    const n = Math.min(daysLeft, 14);
    const per = Math.ceil(ordered.length / Math.max(1, n - 1));
    if (d === n - 1 && n > 1) return { day: d + 1, items: ["اختبار شامل تجريبي ومراجعة الأخطاء"], units: [] as string[] };
    const us = ordered.slice(d * per, d * per + per);
    return { day: d + 1, items: us.length ? us.map((u) => `الوحدة ${u.number}: ${u.title}`) : ["مراجعة الأسئلة الصعبة وبطاقات القوانين"], units: us.map((u) => u.id) };
  });

  const mistakesAll = LESSONS.flatMap((l) => l.mistakes.map((m) => ({ ...m, lesson: l.id })));

  return (
    <div className="space-y-6">
      <PageHeader icon="review" title="المراجعة والاستعداد للاختبارات" subtitle="تحدٍّ يومي، ومراجعة ذكية تقترح تدريبات في المهارات التي تخطئ فيها، وبطاقات قوانين، وخطة مراجعة مقترحة." />

      <section id="daily" className="card scroll-mt-24 space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-bold"><Icon name="bolt" /> التحدي اليومي</h2>
          <span className="text-sm muted">{new Date().toLocaleDateString("ar-OM", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
        <Bar value={Object.keys(dailyDone).length / 5} color="#ea580c" />
        {daily.map((q, i) => (
          <PracticeQuestion key={q.id} question={q} index={i} total={5} compact onDone={() => setDailyDone((d) => { const n = { ...d, [q.id]: true }; recordDaily(Object.keys(n).length); return n; })} />
        ))}
        {Object.keys(dailyDone).length >= 5 && <div className="rounded-xl bg-ok-50 p-4 text-center font-bold text-ok-700">🎉 أنهيت تحدي اليوم! عُد غداً لتحدٍّ جديد.</div>}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Icon name="bulb" /> المراجعة الذكية</h2>
        {weak.length === 0 ? (
          <p className="muted">لم نحدد بعد مهارات ضعيفة. أجب عن مزيد من الأسئلة في الدروس أو بنك الأسئلة، وستظهر هنا المهارات التي تحتاج إلى تدريب.</p>
        ) : (<>
          <ul className="grid gap-2 sm:grid-cols-2">
            {weak.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border line p-3">
                <div><div className="font-semibold">{s.name}</div><div className="text-xs muted">الدرس {s.lessonId} · دقة <Num>{`${Math.round(s.acc * 100)}%`}</Num></div></div>
                <div className="flex gap-1"><Link href={`/bank?skill=${s.id}`} className="btn btn-soft !min-h-[36px] !px-3 text-xs">تدرّب</Link><Link href={`/lessons/${s.lessonId}`} className="btn btn-ghost !min-h-[36px] !px-3 text-xs">الدرس</Link></div>
              </li>
            ))}
          </ul>
          <button className="btn btn-primary" onClick={buildSmart}><Icon name="play" size={18} /> ابدأ جلسة تدريب على مهاراتي الضعيفة</button>
        </>)}
        {smart && (smart.length ? smart.map((q, i) => <PracticeQuestion key={q.id + i} question={q} index={i} total={smart.length} compact />) : <Empty title="لا توجد أسئلة مناسبة الآن" />)}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">🗂️ بطاقات القوانين والمفاهيم</h2>
        <Flashcards />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">⚡ أسئلة سريعة</h2>
        <button className="btn btn-soft" onClick={() => setQuick([...BANK_QUESTIONS].filter((q) => q.difficulty <= 2).sort(() => Math.random() - 0.5).slice(0, 5))}>أعطني 5 أسئلة سريعة</button>
        {quick?.map((q, i) => <PracticeQuestion key={q.id} question={q} index={i} total={5} compact />)}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">📖 المراجعة حسب الوحدة والدرس</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {UNITS.map((u) => (
            <div key={u.id} className="rounded-xl border line p-3">
              <div className="mb-1 flex items-center justify-between"><b style={{ color: u.color }}>الوحدة <Num>{u.number}</Num>: {u.title}</b><Link className="text-xs font-semibold text-brand-600" href={`/exams?mode=unit&unit=${u.id}`}>اختبار الوحدة</Link></div>
              <Bar value={unitMastery(p, u.id)} color={u.color} />
              <ul className="mt-2 space-y-1 text-sm">{u.lessonIds.map((id) => <li key={id} className="flex justify-between"><Link href={`/lessons/${id}#summary`} className="hover:text-brand-600">{id} {LESSON_BY_ID[id].title}</Link><Link href={`/bank?lesson=${id}`} className="text-xs text-brand-600">أسئلة</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <Link href="/exams?mode=term" className="btn btn-primary">الاختبار الشامل للفصل الأول</Link>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">🗓️ خطة مراجعة مقترحة</h2>
        <label className="flex flex-wrap items-center gap-2 text-sm">موعد الاختبار: <input type="date" className="input w-auto" value={examDate} onChange={(e) => setExamDate(e.target.value)} /> <span className="muted">(تُرتّب الخطة من الوحدة الأضعف إلى الأقوى حسب تقدمك المحلي)</span></label>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {plan.map((d) => (
            <li key={d.day} className="rounded-xl border line p-3 text-sm">
              <div className="font-bold">اليوم <Num>{d.day}</Num></div>
              <ul className="list-disc pr-5">{d.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
              {d.units.length > 0 && <div className="mt-1 text-xs muted">اقرأ الملخص، حل 10 أسئلة، ثم اختبار قصير.</div>}
            </li>
          ))}
        </ol>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">⚠️ قائمة الأخطاء الشائعة</h2>
        <div className="space-y-2">
          {mistakesAll.map((m, i) => (
            <details key={i} className="rounded-xl border line p-3 text-sm">
              <summary className="cursor-pointer"><span className="chip ml-2 bg-black/5">{m.lesson}</span><MathText text={m.wrong} /></summary>
              <p className="mt-2 text-ok-700 dark:text-ok-50">✔ <MathText text={m.right} /></p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
