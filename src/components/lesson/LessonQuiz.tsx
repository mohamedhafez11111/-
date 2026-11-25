"use client";
import { useMemo, useState } from "react";
import type { Question } from "@/content/types";
import { questionsOfLesson } from "@/content";
import { AnswerInput, QuestionBody } from "@/components/questions/QuestionCard";
import { emptyResponse, grade, correctAnswerText, type Response } from "@/lib/grading";
import { completeLesson, recordAnswer } from "@/lib/progress";
import { MathText, Num } from "@/components/ui/MathText";
import { Icon } from "@/components/ui/Icon";

function pickQuiz(all: Question[], n: number): Question[] {
  const byDiff = [1, 2, 3, 4].map((d) => all.filter((q) => q.difficulty === d).sort(() => Math.random() - 0.5));
  const out: Question[] = [];
  // مزيج متدرج: سهل ← متوسط ← متقدم
  for (let k = 0; out.length < Math.min(n, all.length); k++) {
    for (const g of byDiff) if (g[k] && out.length < n) out.push(g[k]);
    if (k > all.length) break;
  }
  return out.sort((a, b) => a.difficulty - b.difficulty);
}

export function LessonQuiz({ lessonId, extra = [], hidden = [] }: { lessonId: string; extra?: Question[]; hidden?: string[] }) {
  const [seed, setSeed] = useState(0);
  const qs = useMemo(() => pickQuiz([...questionsOfLesson(lessonId), ...extra].filter((q) => !hidden.includes(q.id)), 5), [lessonId, seed, extra, hidden]); // eslint-disable-line react-hooks/exhaustive-deps
  const [started, setStarted] = useState(false);
  const [res, setRes] = useState<Record<string, Response>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!started) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>خمسة أسئلة متدرجة الصعوبة دون تغذية راجعة حتى التسليم. تحتاج إلى 60% لاعتبار الدرس مكتملاً.</p>
        <button className="btn btn-primary" onClick={() => setStarted(true)}><Icon name="play" size={18} /> ابدأ الاختبار القصير</button>
      </div>
    );
  }

  const results = submitted ? qs.map((q) => grade(q, res[q.id])) : [];
  const score = results.reduce((a, r) => a + r.score, 0);
  const pct = qs.length ? (score / qs.length) * 100 : 0;

  const submit = () => {
    const rs = qs.map((q) => grade(q, res[q.id]));
    qs.forEach((q, i) => recordAnswer(q, rs[i].correct, { silent: true }));
    const pc = (rs.reduce((a, r) => a + r.score, 0) / qs.length) * 100;
    if (pc >= 60) completeLesson(lessonId, pc);
    setSubmitted(true);
  };

  return (
    <div className="space-y-4">
      {submitted && (
        <div className={`anim-pop rounded-xl p-4 text-center ${pct >= 60 ? "bg-ok-50 text-ok-700 dark:bg-ok-700/20 dark:text-ok-50" : "bg-warn-50 text-warn-700 dark:bg-warn-700/20 dark:text-warn-50"}`}>
          <div className="text-3xl font-bold"><Num>{`${Math.round(pct)}%`}</Num></div>
          <div className="font-semibold">{pct >= 90 ? "ممتاز! أتقنت الدرس 🎉" : pct >= 60 ? "أحسنت! اكتمل الدرس ✔" : "تحتاج إلى مراجعة بعض الأفكار ثم المحاولة مجدداً."}</div>
        </div>
      )}
      {qs.map((q, i) => (
        <div key={q.id} className={`rounded-xl border-2 p-4 ${submitted ? (results[i].correct ? "border-ok-500" : "border-bad-500") : "line"}`}>
          <div className="mb-2 text-sm font-bold muted">السؤال <Num>{i + 1}</Num></div>
          <QuestionBody q={q} />
          <div className="mt-3">
            <AnswerInput q={q} r={res[q.id] ?? emptyResponse(q)} set={(r) => setRes((x) => ({ ...x, [q.id]: r }))} disabled={submitted} result={submitted ? results[i] : null} />
          </div>
          {submitted && (
            <div className="mt-3 rounded-lg bg-black/[0.03] p-3 text-sm dark:bg-white/5">
              {!results[i].correct && <p className="mb-1"><b>الإجابة الصحيحة: </b><MathText text={correctAnswerText(q)} /></p>}
              <p><b>الحل: </b><MathText text={q.explanation} /></p>
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {!submitted ? (
          <button className="btn btn-primary" onClick={submit}><Icon name="check" size={18} /> سلّم الإجابات</button>
        ) : (
          <button className="btn btn-soft" onClick={() => { setSeed((s) => s + 1); setRes({}); setSubmitted(false); }}><Icon name="refresh" size={18} /> اختبار جديد</button>
        )}
      </div>
    </div>
  );
}
