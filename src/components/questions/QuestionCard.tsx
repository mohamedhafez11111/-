"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { Question } from "@/content/types";
import { DIFFICULTY_LABEL, QTYPE_LABEL } from "@/content/types";
import { MathText, plainMath } from "@/components/ui/MathText";
import { Figure } from "@/components/figures/Figure";
import { Icon } from "@/components/ui/Icon";
import { grade, emptyResponse, correctAnswerText, isAnswered, type Response, type GradeResult } from "@/lib/grading";
import { recordAnswer } from "@/lib/progress";
import { generate } from "@/content/generators";
import { BANK_QUESTIONS, skillName, lc } from "@/content";
import { readLS, writeLS } from "@/lib/storage";

function shuffleIdx(n: number, seed: string): number[] {
  // ترتيب عشوائي ثابت لكل سؤال (حتى لا يتغير عند إعادة العرض)
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  // تجنب الترتيب الصحيح تماماً في أسئلة الترتيب
  if (n > 1 && a.every((v, i) => v === i)) a.reverse();
  return a;
}

const diffColor: Record<number, string> = { 1: "bg-ok-50 text-ok-700", 2: "bg-brand-50 text-brand-700", 3: "bg-warn-50 text-warn-700", 4: "bg-bad-50 text-bad-700" };

export function QuestionMeta({ q }: { q: Question }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="chip bg-black/5 dark:bg-white/10">الدرس {lc(q.lessonId)}</span>
      <span className={`chip ${diffColor[q.difficulty]}`}>{DIFFICULTY_LABEL[q.difficulty]}</span>
      <span className="chip bg-black/5 dark:bg-white/10">{QTYPE_LABEL[q.type]}</span>
      <span className="chip bg-black/5 dark:bg-white/10" title="المهارة">{skillName(q.skill)}</span>
    </div>
  );
}

interface InputProps {
  q: Question;
  r: Response;
  set: (r: Response) => void;
  disabled?: boolean;
  result?: GradeResult | null;
}

/** مدخلات الإجابة حسب نوع السؤال */
export function AnswerInput({ q, r, set, disabled, result }: InputProps) {
  const order = useMemo(() => (q.type === "mcq" && q.shuffle !== false ? shuffleIdx(q.options.length, q.id) : q.type === "mcq" ? q.options.map((_, i) => i) : []), [q]);
  const [picked, setPicked] = useState<number | null>(null); // للتصنيف: العنصر المختار

  useEffect(() => {
    if (q.type === "order" && r.type === "order" && r.value.length === 0) set({ type: "order", value: shuffleIdx(q.steps.length, q.id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);

  switch (q.type) {
    case "mcq": {
      const v = (r as Extract<Response, { type: "mcq" }>).value;
      return (
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
          {order.map((oi, k) => {
            const selected = v === oi;
            const showOk = result && oi === q.answer;
            const showBad = result && selected && !result.correct;
            return (
              <button key={oi} type="button" role="radio" aria-checked={selected} disabled={disabled}
                onClick={() => set({ type: "mcq", value: oi })}
                className={`flex min-h-[52px] items-center gap-3 rounded-xl border-2 px-3 py-2 text-right transition ${showOk ? "border-ok-500 bg-ok-50 dark:bg-ok-700/20" : showBad ? "border-bad-500 bg-bad-50 dark:bg-bad-700/20" : selected ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40" : "line hover:border-brand-300"}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${selected ? "bg-brand-600 text-white" : "bg-black/5 dark:bg-white/10"}`}>{"أبجد"[k] ?? k + 1}</span>
                <MathText text={q.options[oi]} />
              </button>
            );
          })}
        </div>
      );
    }
    case "tf": {
      const v = (r as Extract<Response, { type: "tf" }>).value;
      return (
        <div className="flex gap-3">
          {[true, false].map((b) => (
            <button key={String(b)} type="button" disabled={disabled} onClick={() => set({ type: "tf", value: b })}
              className={`btn flex-1 border-2 ${v === b ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-white" : "line"} ${result && q.answer === b ? "!border-ok-500" : ""}`}>
              {b ? "✔ صح" : "✘ خطأ"}
            </button>
          ))}
        </div>
      );
    }
    case "numeric": {
      const v = (r as Extract<Response, { type: "numeric" }>).value;
      return (
        <label className="flex items-center gap-2">
          <span className="sr-only">الإجابة</span>
          <input className="input max-w-[220px] text-center text-lg ltr" inputMode="decimal" dir="ltr" value={v} disabled={disabled} placeholder="الإجابة"
            onChange={(e) => set({ type: "numeric", value: e.target.value })} />
          {q.unit && <MathText text={q.unit} className="muted" />}
        </label>
      );
    }
    case "fill": {
      const v = (r as Extract<Response, { type: "fill" }>).value;
      const parts = q.prompt.split("___");
      return (
        <div className="leading-[3]">
          {parts.map((p, i) => (
            <React.Fragment key={i}>
              <MathText text={p} />
              {i < parts.length - 1 && (
                <input className={`input mx-1 inline-block w-28 text-center ${result?.parts ? (result.parts[i] ? "!border-ok-500" : "!border-bad-500") : ""}`} value={v[i] ?? ""} disabled={disabled} aria-label={`الفراغ ${i + 1}`}
                  onChange={(e) => { const n = [...v]; n[i] = e.target.value; set({ type: "fill", value: n }); }} />
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }
    case "short": {
      const v = (r as Extract<Response, { type: "short" }>).value;
      return (
        <div className="space-y-2">
          <input className="input text-lg" value={v} disabled={disabled} placeholder="اكتب إجابتك" onChange={(e) => set({ type: "short", value: e.target.value })} />
          {q.mode === "expr" && (
            <>
              <div className="flex flex-wrap gap-1">
                {["س", "+", "-", "×", "/", "^", "(", ")", "√"].map((k) => (
                  <button key={k} type="button" disabled={disabled} className="btn btn-ghost !min-h-[38px] !px-3" onClick={() => set({ type: "short", value: v + k })}>{k}</button>
                ))}
              </div>
              <p className="text-xs muted">استخدم / للقسمة و ^ للأس، مثال: (س+4)/3. تُقبل أي صورة مكافئة جبرياً.</p>
            </>
          )}
        </div>
      );
    }
    case "match": {
      const v = (r as Extract<Response, { type: "match" }>).value;
      const rightOrder = shuffleIdx(q.pairs.length, q.id + "m");
      return (
        <div className="space-y-2">
          {q.pairs.map(([left], i) => (
            <div key={i} className={`flex flex-col gap-2 rounded-xl border-2 p-2 sm:flex-row sm:items-center ${result?.parts ? (result.parts[i] ? "border-ok-500" : "border-bad-500") : "line"}`}>
              <div className="flex-1 font-semibold"><MathText text={left} /></div>
              <select className="input sm:max-w-[55%]" value={v[i] ?? ""} disabled={disabled} aria-label={`مطابقة ${i + 1}`}
                onChange={(e) => { const n = [...v]; n[i] = e.target.value === "" ? null : Number(e.target.value); set({ type: "match", value: n }); }}>
                <option value="">— اختر —</option>
                {rightOrder.map((j) => <option key={j} value={j}>{plainMath(q.pairs[j][1])}</option>)}
              </select>
            </div>
          ))}
        </div>
      );
    }
    case "order": {
      const v = (r as Extract<Response, { type: "order" }>).value;
      const move = (from: number, to: number) => {
        if (to < 0 || to >= v.length) return;
        const n = [...v];
        [n[from], n[to]] = [n[to], n[from]];
        set({ type: "order", value: n });
      };
      return (
        <ol className="space-y-2">
          {v.map((si, pos) => (
            <li key={si} className={`flex items-center gap-2 rounded-xl border-2 p-2 ${result?.parts ? (result.parts[pos] ? "border-ok-500" : "border-bad-500") : "line"}`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{pos + 1}</span>
              <div className="flex-1"><MathText text={q.steps[si]} /></div>
              <div className="flex flex-col gap-1">
                <button type="button" className="btn btn-ghost !min-h-[30px] !px-2 !py-0" disabled={disabled || pos === 0} onClick={() => move(pos, pos - 1)} aria-label="نقل لأعلى">▲</button>
                <button type="button" className="btn btn-ghost !min-h-[30px] !px-2 !py-0" disabled={disabled || pos === v.length - 1} onClick={() => move(pos, pos + 1)} aria-label="نقل لأسفل">▼</button>
              </div>
            </li>
          ))}
        </ol>
      );
    }
    case "classify": {
      const v = (r as Extract<Response, { type: "classify" }>).value;
      const place = (item: number, cat: number | null) => { const n = [...v]; n[item] = cat; set({ type: "classify", value: n }); setPicked(null); };
      const pool = q.items.map((_, i) => i).filter((i) => v[i] === null || v[i] === undefined);
      return (
        <div className="space-y-3">
          <p className="text-xs muted">اسحب كل بطاقة إلى الفئة المناسبة، أو اضغط على البطاقة ثم على الفئة.</p>
          <div className="flex min-h-[48px] flex-wrap gap-2 rounded-xl border-2 border-dashed line p-2"
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const i = Number(e.dataTransfer.getData("text")); if (!disabled) place(i, null); }}>
            {pool.length === 0 && <span className="text-sm muted">تم تصنيف جميع البطاقات</span>}
            {pool.map((i) => (
              <button key={i} type="button" draggable={!disabled} disabled={disabled} onDragStart={(e) => e.dataTransfer.setData("text", String(i))}
                onClick={() => setPicked(picked === i ? null : i)}
                className={`chip !px-3 !py-2 text-sm ${picked === i ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-800 dark:bg-brand-900/50 dark:text-white"}`}>
                <MathText text={q.items[i].text} />
              </button>
            ))}
          </div>
          <div className={`grid gap-2 ${q.categories.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {q.categories.map((c, ci) => (
              <div key={ci} role="button" tabIndex={0} aria-label={`الفئة: ${c}`}
                onClick={() => picked !== null && !disabled && place(picked, ci)}
                onKeyDown={(e) => { if (e.key === "Enter" && picked !== null && !disabled) place(picked, ci); }}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const i = Number(e.dataTransfer.getData("text")); if (!disabled) place(i, ci); }}
                className={`min-h-[110px] rounded-xl border-2 p-2 transition ${picked !== null ? "border-brand-400 bg-brand-50/50 dark:bg-brand-900/20" : "line"}`}>
                <div className="mb-2 text-center text-sm font-bold">{c}</div>
                <div className="flex flex-wrap gap-1.5">
                  {q.items.map((it, i) => v[i] === ci ? (
                    <button key={i} type="button" disabled={disabled} draggable={!disabled} onDragStart={(e) => e.dataTransfer.setData("text", String(i))}
                      onClick={(e) => { e.stopPropagation(); place(i, null); }}
                      className={`chip !px-3 !py-1.5 text-sm ${result?.parts ? (result.parts[i] ? "bg-ok-50 text-ok-700 ring-2 ring-ok-500" : "bg-bad-50 text-bad-700 ring-2 ring-bad-500") : "bg-black/5 dark:bg-white/10"}`} title="اضغط للإرجاع">
                      <MathText text={it.text} />
                    </button>
                  ) : null)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "multi": {
      const v = (r as Extract<Response, { type: "multi" }>).value;
      return (
        <div className="space-y-2">
          {q.parts.map((p, i) => (
            <label key={i} className={`flex flex-col gap-2 rounded-xl border-2 p-2 sm:flex-row sm:items-center ${result?.parts ? (result.parts[i] ? "border-ok-500" : "border-bad-500") : "line"}`}>
              <span className="flex-1"><span className="font-bold">({"أبجدهوز"[i]}) </span><MathText text={p.prompt} /></span>
              <span className="flex items-center gap-2">
                <input className="input w-36 text-center ltr" dir="ltr" inputMode="decimal" value={v[i] ?? ""} disabled={disabled}
                  onChange={(e) => { const n = [...v]; n[i] = e.target.value; set({ type: "multi", value: n }); }} />
                {p.unit && <MathText text={p.unit} className="text-sm muted" />}
              </span>
            </label>
          ))}
        </div>
      );
    }
  }
}

export function QuestionBody({ q }: { q: Question }) {
  return (
    <>
      {q.type !== "fill" && <MathText as="div" text={q.prompt} className="text-[1.05rem] font-medium" />}
      {q.figure && <div className="my-3 overflow-x-auto rounded-xl border line p-2"><Figure fig={q.figure} /></div>}
    </>
  );
}

/** بطاقة سؤال تدريبي بتغذية راجعة فورية */
export function PracticeQuestion({ question, onDone, index, total, compact }: { question: Question; onDone?: (correct: boolean) => void; index?: number; total?: number; compact?: boolean }) {
  const [q, setQ] = useState(question);
  const [r, setR] = useState<Response>(() => emptyResponse(question));
  const [result, setResult] = useState<GradeResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [saved, setSaved] = useState(false);
  const [similarMsg, setSimilarMsg] = useState("");

  useEffect(() => { setQ(question); setR(emptyResponse(question)); setResult(null); setShowHint(false); setSimilarMsg(""); }, [question]);
  useEffect(() => { setSaved(readLS<string[]>("hard", []).includes(q.id)); }, [q.id]);

  const check = () => {
    const g = grade(q, r);
    setResult(g);
    recordAnswer(q, g.correct);
    onDone?.(g.correct);
  };
  const retry = () => { setR(emptyResponse(q)); setResult(null); };
  const similar = () => {
    const gen = generate(q.skill);
    let next: Question | undefined = gen ?? undefined;
    if (!next) {
      const pool = BANK_QUESTIONS.filter((x) => x.skill === q.skill && x.id !== q.id);
      next = pool[Math.floor(Math.random() * pool.length)];
    }
    if (next) { setQ(next); setR(emptyResponse(next)); setResult(null); setShowHint(false); setSimilarMsg(gen ? "سؤال جديد مشابه بقيم مختلفة:" : "سؤال آخر على المهارة نفسها:"); }
    else setSimilarMsg("لا يوجد سؤال مشابه آخر لهذه المهارة حالياً.");
  };
  const toggleSave = () => {
    const list = readLS<string[]>("hard", []);
    const n = list.includes(q.id) ? list.filter((x) => x !== q.id) : [q.id, ...list];
    writeLS("hard", n);
    setSaved(n.includes(q.id));
  };
  const askTutor = () => {
    writeLS("tutor-prefill", `ساعدني في فهم هذا السؤال دون أن تعطيني الإجابة مباشرة: ${plainMath(q.prompt)}`);
    window.dispatchEvent(new Event("m10-open-tutor"));
  };

  return (
    <div className={`card ${compact ? "p-4" : "p-5"} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <QuestionMeta q={q} />
        {index !== undefined && total !== undefined && <span className="text-sm font-bold muted">سؤال {index + 1} من {total}</span>}
      </div>
      {similarMsg && <div className="text-sm font-semibold text-brand-700 dark:text-brand-300">{similarMsg}</div>}
      <QuestionBody q={q} />
      <AnswerInput q={q} r={r} set={setR} disabled={!!result} result={result} />
      {showHint && q.hint && !result && <div className="rounded-xl bg-warn-50 p-3 text-sm text-warn-700 dark:bg-warn-700/20 dark:text-warn-50">💡 <MathText text={q.hint} /></div>}
      {showHint && !q.hint && !result && <div className="rounded-xl bg-warn-50 p-3 text-sm text-warn-700 dark:bg-warn-700/20 dark:text-warn-50">💡 راجع قاعدة مهارة «{skillName(q.skill)}» في الدرس {lc(q.lessonId)}، وحدد المعطيات والمطلوب أولاً.</div>}
      {result && (
        <div className={`anim-pop rounded-xl p-4 ${result.correct ? "bg-ok-50 text-ok-700 dark:bg-ok-700/20 dark:text-ok-50" : "bg-bad-50 text-bad-700 dark:bg-bad-700/20 dark:text-bad-50"}`} role="status">
          <div className="mb-1 flex items-center gap-2 text-lg font-bold">
            <Icon name={result.correct ? "check" : "x"} />
            {result.correct ? "إجابة صحيحة! أحسنت" : result.score > 0 ? `إجابة صحيحة جزئياً (${Math.round(result.score * 100)}%)` : "إجابة غير صحيحة"}
          </div>
          {result.note && <p className="mb-1 font-semibold">{result.note}</p>}
          {!result.correct && <p className="mb-1">الإجابة الصحيحة: <MathText text={correctAnswerText(q)} className="font-bold" /></p>}
          <p className="text-[var(--text)]"><b>الشرح: </b><MathText text={q.explanation} /></p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!result ? (
          <>
            <button className="btn btn-primary" onClick={check} disabled={!isAnswered(r)}><Icon name="check" size={18} /> تحقّق</button>
            <button className="btn btn-soft" onClick={() => setShowHint(true)}><Icon name="bulb" size={18} /> تلميح</button>
          </>
        ) : (
          <>
            {!result.correct && <button className="btn btn-soft" onClick={retry}><Icon name="refresh" size={18} /> حاول مجدداً</button>}
            <button className="btn btn-soft" onClick={similar}><Icon name="plus" size={18} /> سؤال مشابه</button>
          </>
        )}
        <button className="btn btn-ghost" onClick={toggleSave} aria-pressed={saved}><Icon name="bookmark" size={18} /> {saved ? "محفوظ في الصعبة" : "احفظ كسؤال صعب"}</button>
        <button className="btn btn-ghost" onClick={askTutor}><Icon name="bot" size={18} /> اسأل المعلم الذكي</button>
      </div>
    </div>
  );
}
