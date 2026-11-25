"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/content/types";
import { AnswerInput, QuestionBody, QuestionMeta } from "@/components/questions/QuestionCard";
import { emptyResponse, grade, correctAnswerText, isAnswered, type Response } from "@/lib/grading";
import { MathText, Num } from "@/components/ui/MathText";
import { Icon } from "@/components/ui/Icon";
import { recordAnswer, recordExam } from "@/lib/progress";
import { readLS, writeLS, removeLS } from "@/lib/storage";
import { skillName, SKILL_BY_ID } from "@/content";
import Link from "next/link";

export interface ExamConfig {
  id: string;
  title: string;
  questions: Question[];
  minutes: number; // 0 = بدون وقت
  graded: boolean; // false = تدريبي دون درجات
  marks?: (q: Question) => number;
}

export interface SavedExam { cfgId: string; title: string; minutes: number; graded: boolean; sim: boolean; qids: string[]; res: Record<string, Response>; flags: string[]; startedAt: number; current: number }

const marksOf = (cfg: ExamConfig, q: Question) => cfg.marks?.(q) ?? 1;

export function ExamRunner({ cfg, onExit }: { cfg: ExamConfig; onExit: () => void }) {
  const KEY = "exam-in-progress";
  const [res, setRes] = useState<Record<string, Response>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [cur, setCur] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const qs = cfg.questions;
  const submittedRef = useRef(false);

  // استعادة الإجابات المحفوظة (عند تحديث الصفحة أثناء الاختبار)
  useEffect(() => {
    const s = readLS<SavedExam | null>(KEY, null);
    if (s && s.cfgId === cfg.id && s.qids.join() === qs.map((q) => q.id).join()) {
      setRes(s.res); setFlags(s.flags); setStartedAt(s.startedAt); setCur(s.current);
    } else {
      writeLS(KEY, { cfgId: cfg.id, title: cfg.title, minutes: cfg.minutes, graded: cfg.graded, sim: !!cfg.marks, qids: qs.map((q) => q.id), res: {}, flags: [], startedAt: Date.now(), current: 0 } satisfies SavedExam);
    }
  }, [cfg.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!submitted) writeLS(KEY, { cfgId: cfg.id, title: cfg.title, minutes: cfg.minutes, graded: cfg.graded, sim: !!cfg.marks, qids: qs.map((q) => q.id), res, flags, startedAt, current: cur } satisfies SavedExam);
  }, [res, flags, cur, startedAt, submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const left = cfg.minutes ? Math.max(0, cfg.minutes * 60 - Math.floor((now - startedAt) / 1000)) : null;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setConfirm(false);
    removeLS(KEY);
    const results = qs.map((q) => grade(q, res[q.id]));
    qs.forEach((q, i) => recordAnswer(q, results[i].correct, { silent: true }));
    if (cfg.graded) {
      const total = qs.reduce((a, q) => a + marksOf(cfg, q), 0);
      const score = qs.reduce((a, q, i) => a + results[i].score * marksOf(cfg, q), 0);
      const weak = [...new Set(qs.filter((_, i) => !results[i].correct).map((q) => q.skill))];
      recordExam({ id: cfg.id, title: cfg.title, score: Math.round(score * 10) / 10, total, pct: total ? (score / total) * 100 : 0, weak });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => { if (left === 0 && !submitted) submit(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => (submitted ? qs.map((q) => grade(q, res[q.id])) : []), [submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  if (submitted) {
    const total = qs.reduce((a, q) => a + marksOf(cfg, q), 0);
    const score = qs.reduce((a, q, i) => a + results[i].score * marksOf(cfg, q), 0);
    const pct = total ? (score / total) * 100 : 0;
    const bySkill = new Map<string, { c: number; n: number }>();
    qs.forEach((q, i) => { const s = bySkill.get(q.skill) ?? { c: 0, n: 0 }; s.n++; if (results[i].correct) s.c++; bySkill.set(q.skill, s); });
    const weak = [...bySkill.entries()].filter(([, s]) => s.c < s.n);
    return (
      <div className="space-y-5">
        <div className="card p-6 text-center">
          <div className="text-sm muted">{cfg.title}</div>
          {cfg.graded ? (<>
            <div className="mt-2 text-5xl font-bold text-brand-600"><Num>{`${Math.round(pct)}%`}</Num></div>
            <div className="mt-1 text-lg">الدرجة: <b><Num>{`${Math.round(score * 10) / 10} / ${total}`}</Num></b></div>
          </>) : <div className="mt-2 text-2xl font-bold">اختبار تدريبي: <Num>{`${results.filter((r) => r.correct).length} / ${qs.length}`}</Num> صحيحة</div>}
          <div className="mt-2 text-sm muted">إجابات صحيحة: <Num>{results.filter((r) => r.correct).length}</Num> · خاطئة أو جزئية: <Num>{qs.filter((x, i) => !results[i].correct && isAnswered(res[x.id])).length}</Num> · بلا إجابة: <Num>{qs.filter((q) => !isAnswered(res[q.id])).length}</Num></div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn btn-primary" onClick={onExit}><Icon name="refresh" size={18} /> اختبار جديد</button>
            <button className="btn btn-ghost" onClick={() => window.print()}><Icon name="print" size={18} /> طباعة النتيجة</button>
          </div>
        </div>
        {weak.length > 0 && (
          <div className="card p-5">
            <h3 className="mb-2 font-bold">مهارات تحتاج إلى مراجعة</h3>
            <ul className="space-y-1.5">
              {weak.map(([sk, s]) => (
                <li key={sk} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{skillName(sk)} <span className="text-sm muted">(<Num>{`${s.c}/${s.n}`}</Num>)</span></span>
                  <span className="flex gap-1.5"><Link className="btn btn-soft !min-h-[36px] text-sm" href={`/lessons/${SKILL_BY_ID[sk]?.lessonId}`}>راجع الدرس</Link><Link className="btn btn-ghost !min-h-[36px] text-sm" href={`/bank?skill=${sk}`}>تدرّب</Link></span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h3 className="text-lg font-bold">الحل النموذجي وتحليل الإجابات</h3>
        {qs.map((q, i) => (
          <div key={q.id} className={`card space-y-3 border-r-4 p-4 ${results[i].correct ? "border-r-ok-500" : "border-r-bad-500"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">السؤال <Num>{i + 1}</Num> {cfg.graded && <span className="text-sm muted">(<Num>{`${Math.round(results[i].score * marksOf(cfg, q) * 10) / 10} / ${marksOf(cfg, q)}`}</Num>)</span>}</span><QuestionMeta q={q} /></div>
            <QuestionBody q={q} />
            <AnswerInput q={q} r={res[q.id] ?? emptyResponse(q)} set={() => {}} disabled result={results[i]} />
            <div className="rounded-lg bg-black/[0.03] p-3 text-sm dark:bg-white/5">
              {!results[i].correct && <p><b>الإجابة الصحيحة: </b><MathText text={correctAnswerText(q)} /></p>}
              {results[i].note && <p className="text-warn-700">{results[i].note}</p>}
              <p><b>الحل: </b><MathText text={q.explanation} /></p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const q = qs[cur];
  const answered = qs.filter((x) => isAnswered(res[x.id])).length;
  const mm = left !== null ? `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}` : "—";

  return (
    <div className="space-y-4">
      <div className="card sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="font-bold">{cfg.title}</div>
        <div className="flex items-center gap-3 text-sm">
          <span>أُجيب: <b><Num>{`${answered}/${qs.length}`}</Num></b></span>
          {left !== null && <span className={`chip !px-3 !py-1.5 text-base ${left < 60 ? "bg-bad-50 text-bad-700" : "bg-brand-50 text-brand-700"}`} role="timer" aria-live="off"><Icon name="clock" size={16} /> <Num>{mm}</Num></span>}
          <button className="btn btn-ok !min-h-[38px]" onClick={() => setConfirm(true)}>تسليم</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="التنقل بين الأسئلة">
        {qs.map((x, i) => (
          <button key={x.id} onClick={() => setCur(i)} className={`relative h-10 w-10 rounded-lg border-2 text-sm font-bold ${i === cur ? "border-brand-600 bg-brand-600 text-white" : isAnswered(res[x.id]) ? "border-brand-300 bg-brand-50 text-brand-800" : "line"}`} aria-label={`السؤال ${i + 1}`}>
            <Num>{i + 1}</Num>{flags.includes(x.id) && <span className="absolute -left-1 -top-1 text-xs">🚩</span>}
          </button>
        ))}
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold">السؤال <Num>{cur + 1}</Num> من <Num>{qs.length}</Num> {cfg.graded && <span className="text-sm muted">(<Num>{marksOf(cfg, q)}</Num> {marksOf(cfg, q) > 1 ? "درجات" : "درجة"})</span>}</span>
          <button className={`chip !py-1.5 ${flags.includes(q.id) ? "bg-warn-50 text-warn-700" : "bg-black/5"}`} onClick={() => setFlags((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]))}>🚩 {flags.includes(q.id) ? "مُعلَّم للمراجعة" : "علّم للمراجعة"}</button>
        </div>
        <QuestionBody q={q} />
        <AnswerInput q={q} r={res[q.id] ?? emptyResponse(q)} set={(r) => setRes((x) => ({ ...x, [q.id]: r }))} />
        <div className="flex justify-between gap-2 pt-2">
          <button className="btn btn-ghost" disabled={cur === 0} onClick={() => setCur(cur - 1)}><Icon name="arrow-right" size={18} /> السابق</button>
          {cur < qs.length - 1 ? <button className="btn btn-primary" onClick={() => setCur(cur + 1)}>التالي <Icon name="arrow-left" size={18} /></button> : <button className="btn btn-ok" onClick={() => setConfirm(true)}>إنهاء وتسليم</button>}
        </div>
      </div>
      <p className="text-center text-xs muted">تُحفظ إجاباتك تلقائياً على هذا الجهاز أثناء الاختبار. لن تظهر الإجابات الصحيحة قبل التسليم.</p>

      {confirm && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="card anim-pop w-full max-w-sm space-y-3 p-5 text-center">
            <div className="text-lg font-bold">تسليم الاختبار؟</div>
            <p className="text-sm">أجبت عن <Num>{answered}</Num> من <Num>{qs.length}</Num> سؤالاً.{flags.length > 0 && <> لديك <Num>{flags.length}</Num> سؤال معلَّم للمراجعة.</>}</p>
            <div className="flex justify-center gap-2"><button className="btn btn-ok" onClick={submit}>نعم، سلّم</button><button className="btn btn-ghost" onClick={() => setConfirm(false)}>عودة</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
