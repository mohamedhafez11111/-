"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameId, Question } from "@/content/types";
import { GAME_META } from "./meta";
import { randomGenerated, numericOptions, GENERATORS } from "@/content/generators";
import { SPOT_ERRORS, COMPLETE_SOLS, DATA_CARDS } from "@/content/gameContent";
import { MathText, Num } from "@/components/ui/MathText";
import { Icon } from "@/components/ui/Icon";
import { Plane, clipHalfPlane, type Ineq } from "@/components/figures/Plane";
import { CircleDiagram } from "@/components/figures/CircleDiagram";
import { recordGame } from "@/lib/progress";
import { readLS, writeLS } from "@/lib/storage";
import { parseNumberInput } from "@/lib/math/expr";

type End = (score: number, detail?: string) => void;

function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }
const ri = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

function GameShell({ id, children }: { id: GameId; children: (end: End) => React.ReactNode }) {
  const m = GAME_META[id];
  const [phase, setPhase] = useState<"intro" | "play" | "end">("intro");
  const [result, setResult] = useState<{ score: number; detail?: string; best: number; newBest: boolean } | null>(null);
  const [round, setRound] = useState(0);
  const end: End = useCallback((score, detail) => {
    const bests = readLS<Record<string, number>>("game-best", {});
    const best = Math.max(bests[id] ?? 0, score);
    const newBest = score > (bests[id] ?? 0);
    writeLS("game-best", { ...bests, [id]: best });
    recordGame(id, m.title, score);
    setResult({ score, detail, best, newBest });
    setPhase("end");
  }, [id, m.title]);

  if (phase === "intro") {
    const best = readLS<Record<string, number>>("game-best", {})[id];
    return (
      <div className="card flex flex-col items-center gap-4 p-8 text-center">
        <div className="text-6xl">{m.emoji}</div>
        <h2 className="text-2xl font-bold">{m.title}</h2>
        <p className="max-w-md muted">{m.desc}</p>
        {best !== undefined && <p className="text-sm">أفضل نتيجة لك: <b><Num>{best}</Num></b></p>}
        <button className="btn btn-primary !px-8 text-lg" onClick={() => { setRound((r) => r + 1); setPhase("play"); }}><Icon name="play" /> ابدأ</button>
      </div>
    );
  }
  if (phase === "end" && result) {
    return (
      <div className="card anim-pop flex flex-col items-center gap-3 p-8 text-center">
        <div className="text-6xl">{result.score >= 80 ? "🏆" : result.score >= 40 ? "🌟" : "💪"}</div>
        <h2 className="text-2xl font-bold">انتهت اللعبة!</h2>
        <div className="text-4xl font-bold text-brand-600"><Num>{result.score}</Num> <span className="text-lg">نقطة</span></div>
        {result.detail && <p className="muted">{result.detail}</p>}
        {result.newBest && <p className="chip bg-ok-50 !py-1.5 text-ok-700">رقم قياسي جديد! 🎉</p>}
        <p className="text-sm muted">{result.score >= 60 ? "أداء رائع! حافظ على هذا المستوى." : "كل محاولة تجعلك أقوى. راجع الدرس ثم حاول مجدداً."}</p>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => { setRound((r) => r + 1); setPhase("play"); }}><Icon name="refresh" size={18} /> العب مجدداً</button>
          <button className="btn btn-ghost" onClick={() => setPhase("intro")}>القائمة</button>
        </div>
      </div>
    );
  }
  return <div key={round}>{children(end)}</div>;
}

function HUD({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {items.map(([k, v]) => <div key={k} className="chip bg-black/5 !px-4 !py-2 text-sm dark:bg-white/10">{k}: <b className="text-base"><Num>{String(v)}</Num></b></div>)}
    </div>
  );
}

function useTimer(seconds: number, onDone: () => void, running = true) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => { if (l <= 1) { clearInterval(t); setTimeout(() => done.current(), 0); return 0; } return l - 1; }), 1000);
    return () => clearInterval(t);
  }, [running]);
  return left;
}

// ======================= 1) تحدي السرعة =======================
function SpeedGame({ end }: { end: End }) {
  const [unit, setUnit] = useState<string>("all");
  const skills = useMemo(() => Object.keys(GENERATORS).filter((s) => unit === "all" || s.startsWith(unit)), [unit]);
  const [q, setQ] = useState<Question>(() => randomGenerated());
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [count, setCount] = useState({ ok: 0, all: 0 });
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [last, setLast] = useState<string>("");
  const left = useTimer(60, () => end(score, `${count.ok} إجابة صحيحة من ${count.all}`));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, [q]);
  const submit = () => {
    if (q.type !== "numeric") return;
    const v = parseNumberInput(input);
    const ok = v !== null && Math.abs(v - q.answer) <= (q.tolerance ?? 1e-6) + 1e-9;
    setCount((c) => ({ ok: c.ok + (ok ? 1 : 0), all: c.all + 1 }));
    if (ok) { setScore((s) => s + 10 + Math.min(streak, 5) * 2); setStreak((s) => s + 1); } else { setStreak(0); setLast(`الإجابة الصحيحة: ${q.answer}`); }
    setFlash(ok ? "ok" : "bad");
    setTimeout(() => setFlash(null), 350);
    setInput("");
    setQ(randomGenerated(skills.length ? skills : undefined));
  };
  return (
    <div className="card p-5">
      <HUD items={[["الوقت", left], ["النقاط", score], ["سلسلة", streak]]} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button className={`chip !py-1.5 ${unit === "all" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setUnit("all")}>الكل</button>
        {["1-", "4-", "5-", "6-", "7-", "8-"].map((u) => <button key={u} className={`chip !py-1.5 ${unit === u ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => { setUnit(u); setQ(randomGenerated(Object.keys(GENERATORS).filter((s) => s.startsWith(u)))); }}>الوحدة {u[0]}</button>)}
      </div>
      <div className={`rounded-2xl border-2 p-6 text-center text-xl font-semibold transition ${flash === "ok" ? "border-ok-500 bg-ok-50" : flash === "bad" ? "anim-shake border-bad-500 bg-bad-50" : "line"}`}>
        <MathText text={q.prompt} />
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input ref={inputRef} className="input text-center text-2xl ltr" dir="ltr" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} aria-label="الإجابة" />
        <button className="btn btn-primary !px-6" type="submit">أدخل</button>
        <button className="btn btn-ghost" type="button" onClick={() => { setStreak(0); setCount((c) => ({ ...c, all: c.all + 1 })); setQ(randomGenerated(skills)); }}>تخطَّ</button>
      </form>
      {last && <p className="mt-2 text-sm text-bad-700"><MathText text={last} /></p>}
    </div>
  );
}

// ======================= 2) صائد الإجابة =======================
const CATCH_SKILLS = ["1-4.line", "4-2.centre", "4-2.cyclic", "4-2.semicircle", "5-1.median", "6-1.direct", "6-1.inverse", "8-1.evaluate", "7-2.density", "1-1.currency"];
interface Drop { id: number; text: string; correct: boolean; x: number; y: number; speed: number }

function CatcherGame({ end }: { end: End }) {
  const [q, setQ] = useState<Question>(() => randomGenerated(CATCH_SKILLS));
  const [drops, setDrops] = useState<Drop[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const scoreRef = useRef(0); scoreRef.current = score;
  const livesRef = useRef(3); livesRef.current = lives;
  const ended = useRef(false);
  const newRound = useCallback((lvl: number) => {
    const nq = randomGenerated(CATCH_SKILLS);
    setQ(nq);
    if (nq.type !== "numeric") return;
    const ans = nq.answer;
    const wrongs = [ans + ri(1, 5), ans - ri(1, 5), ans * 2, -ans, ans + 10];
    const { options, answer } = numericOptions(ans, shuffle(wrongs));
    const cols = shuffle([8, 31, 54, 77]);
    setDrops(options.map((t, i) => ({ id: Math.random(), text: t, correct: i === answer, x: cols[i], y: -10 - Math.random() * 25, speed: 0.12 + lvl * 0.03 + Math.random() * 0.05 })));
  }, []);
  useEffect(() => { newRound(1); }, [newRound]);
  useEffect(() => {
    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(50, t - last); last = t;
      setDrops((ds) => {
        const moved = ds.map((d) => ({ ...d, y: d.y + d.speed * dt * 0.06 }));
        if (moved.some((d) => d.correct && d.y > 100) && !ended.current) {
          setLives((l) => { const nl = l - 1; if (nl <= 0 && !ended.current) { ended.current = true; setTimeout(() => end(scoreRef.current, "انتهت المحاولات"), 0); } return nl; });
          setTimeout(() => newRound(level), 0);
          return [];
        }
        return moved;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, newRound, level]);
  const pick = (d: Drop) => {
    if (ended.current) return;
    if (d.correct) {
      const ns = score + 10;
      setScore(ns);
      const nl = 1 + Math.floor(ns / 50);
      setLevel(nl);
      newRound(nl);
    } else {
      setDrops((ds) => ds.filter((x) => x.id !== d.id));
      setLives((l) => { const nl = l - 1; if (nl <= 0 && !ended.current) { ended.current = true; setTimeout(() => end(scoreRef.current, "انتهت المحاولات"), 0); } return nl; });
    }
  };
  return (
    <div className="card p-4">
      <HUD items={[["النقاط", score], ["المحاولات", "❤️".repeat(Math.max(0, lives)) || "0"], ["المستوى", level]]} />
      <div className="mb-2 rounded-xl bg-brand-50 p-3 text-center font-semibold dark:bg-brand-900/30"><MathText text={q.prompt} /></div>
      <div className="relative h-[55vh] min-h-[340px] overflow-hidden rounded-2xl bg-gradient-to-b from-sky-50 to-white dark:from-slate-800 dark:to-slate-900">
        {drops.map((d) => (
          <button key={d.id} onPointerDown={() => pick(d)} className="absolute grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full bg-brand-600 text-lg font-bold text-white shadow-lg sm:h-20 sm:w-20" style={{ left: `${d.x + 8}%`, top: `${d.y}%` }} aria-label={`الإجابة ${d.text}`}>
            <Num>{d.text}</Num>
          </button>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-2 bg-bad-500/60" />
      </div>
    </div>
  );
}

// ======================= 3) سباق حل المسائل =======================
function RaceGame({ end }: { end: End }) {
  const GOAL = 8;
  const [names, setNames] = useState(["الفريق الأزرق", "الفريق البرتقالي"]);
  const [pos, setPos] = useState([0, 0]);
  const [turn, setTurn] = useState(0);
  const [q, setQ] = useState<Question>(() => randomGenerated());
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [moves, setMoves] = useState(0);
  const answer = () => {
    if (q.type !== "numeric") return;
    const v = parseNumberInput(input);
    const ok = v !== null && Math.abs(v - q.answer) <= (q.tolerance ?? 1e-6) + 1e-9;
    const step = ok ? (q.difficulty >= 2 ? 2 : 1) : 0;
    const np = [...pos]; np[turn] = Math.min(GOAL, np[turn] + step);
    setPos(np);
    setMsg(ok ? `✔ صحيح! ${names[turn]} يتقدم ${step}` : `✘ خطأ. الإجابة: ${q.answer}`);
    setMoves((m) => m + 1);
    setInput("");
    if (np[turn] >= GOAL) { setTimeout(() => end(Math.max(10, 100 - moves * 3), `فاز ${names[turn]}!`), 600); return; }
    setTurn(1 - turn);
    setQ(randomGenerated());
  };
  return (
    <div className="card space-y-4 p-5">
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1].map((t) => (
          <div key={t} className={`rounded-xl border-2 p-3 ${turn === t ? "border-brand-500" : "line"}`}>
            <input className="mb-2 w-full bg-transparent font-bold outline-none" value={names[t]} onChange={(e) => setNames(names.map((n, i) => (i === t ? e.target.value : n)))} aria-label="اسم الفريق" />
            <div className="flex gap-1">{Array.from({ length: GOAL }, (_, i) => <div key={i} className={`h-6 flex-1 rounded ${i < pos[t] ? (t ? "bg-warn-500" : "bg-brand-500") : "bg-black/10"}`} />)}<span className="mr-1">🏁</span></div>
          </div>
        ))}
      </div>
      <div className="text-center text-sm font-bold">الدور الآن: {names[turn]}</div>
      <div className="rounded-2xl border-2 line p-6 text-center text-xl font-semibold"><MathText text={q.prompt} /></div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); answer(); }}>
        <input className="input text-center text-2xl ltr" dir="ltr" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} aria-label="الإجابة" />
        <button className="btn btn-primary !px-6">أجب</button>
      </form>
      {msg && <p className="text-center font-semibold"><MathText text={msg} /></p>}
      <p className="text-xs muted">الأسئلة المتوسطة تقدّم الفريق خطوتين. مناسبة للعب على السبورة التفاعلية.</p>
    </div>
  );
}

// ======================= 4) اكتشف الخطأ =======================
function SpotErrorGame({ end }: { end: End }) {
  const items = useMemo(() => shuffle(SPOT_ERRORS).slice(0, 6), []);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const it = items[i];
  const next = () => { if (i + 1 >= items.length) end(score, `${score / 15} من ${items.length}`); else { setI(i + 1); setPicked(null); } };
  return (
    <div className="card space-y-4 p-5">
      <HUD items={[["السؤال", `${i + 1}/${items.length}`], ["النقاط", score]]} />
      <div className="font-semibold"><MathText text={`المسألة: ${it.problem}`} /></div>
      <p className="text-sm muted">اضغط على الخطوة التي تحتوي على الخطأ:</p>
      <ol className="space-y-2">
        {it.steps.map((s, k) => (
          <li key={k}>
            <button disabled={picked !== null} onClick={() => { setPicked(k); if (k === it.wrong) setScore((x) => x + 15); }}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-right ${picked !== null && k === it.wrong ? "border-bad-500 bg-bad-50" : picked === k ? "border-warn-500" : "line hover:border-brand-300"}`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/5 text-sm font-bold"><Num>{k + 1}</Num></span><MathText text={s} />
            </button>
          </li>
        ))}
      </ol>
      {picked !== null && (
        <div className={`anim-pop rounded-xl p-3 ${picked === it.wrong ? "bg-ok-50 text-ok-700" : "bg-warn-50 text-warn-700"}`}>
          <b>{picked === it.wrong ? "أحسنت! اكتشفت الخطأ." : `الخطأ في الخطوة ${it.wrong + 1}.`}</b> <MathText text={it.fix} />
          <div className="mt-2"><button className="btn btn-primary !min-h-[40px]" onClick={next}>التالي</button></div>
        </div>
      )}
    </div>
  );
}

// ======================= 5) أكمل الحل =======================
function CompleteGame({ end }: { end: End }) {
  const items = useMemo(() => shuffle(COMPLETE_SOLS).slice(0, 6), []);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const it = items[i];
  const order = useMemo(() => shuffle(it.options.map((_, k) => k)), [it]);
  const next = () => { if (i + 1 >= items.length) end(score, `${score / 15} من ${items.length}`); else { setI(i + 1); setPicked(null); } };
  return (
    <div className="card space-y-4 p-5">
      <HUD items={[["السؤال", `${i + 1}/${items.length}`], ["النقاط", score]]} />
      <div className="font-semibold"><MathText text={`المسألة: ${it.problem}`} /></div>
      <ol className="space-y-2">
        {it.steps.map((s, k) => (
          <li key={k} className={`flex gap-3 rounded-xl border-2 p-3 ${k === it.missing ? "border-dashed border-brand-400 bg-brand-50/50" : "line"}`}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/5 text-sm font-bold"><Num>{k + 1}</Num></span>
            {k === it.missing ? (picked !== null ? <MathText text={it.options[0]} className="font-bold text-ok-700" /> : <span className="muted">؟ الخطوة المفقودة</span>) : <MathText text={s} />}
          </li>
        ))}
      </ol>
      <div className="grid gap-2 sm:grid-cols-2">
        {order.map((k) => (
          <button key={k} disabled={picked !== null} onClick={() => { setPicked(k); if (k === 0) setScore((x) => x + 15); }}
            className={`rounded-xl border-2 p-3 text-right ${picked !== null && k === 0 ? "border-ok-500 bg-ok-50" : picked === k ? "border-bad-500 bg-bad-50" : "line hover:border-brand-300"}`}>
            <MathText text={it.options[k]} />
          </button>
        ))}
      </div>
      {picked !== null && <button className="btn btn-primary" onClick={next}>{picked === 0 ? "صحيح! التالي" : "التالي"}</button>}
    </div>
  );
}

// ======================= 6) تحدي الرسوم البيانية =======================
type GQ = { kind: "eq" | "slope" | "speed"; prompt: string; options: string[]; answer: number; curve: { expr?: string; points?: [number, number][] }; x: [number, number]; y: [number, number]; xl?: string; yl?: string };

function makeGraphQ(): GQ {
  const k = ri(0, 2);
  if (k === 0) {
    const m = [-3, -2, -1, 1, 2, 3, 0.5][ri(0, 6)], c = ri(-3, 3);
    const eq = (mm: number, cc: number) => `ص = ${mm === 1 ? "" : mm === -1 ? "-" : mm}س ${cc < 0 ? `- ${-cc}` : `+ ${cc}`}`;
    const opts = shuffle([eq(m, c), eq(-m, c), eq(m, -c === c ? c + 1 : -c), eq(m === 2 ? 3 : 2, c)].filter((v, i, a) => a.indexOf(v) === i));
    return { kind: "eq", prompt: "أي معادلة تمثل المستقيم المرسوم؟", options: opts, answer: opts.indexOf(eq(m, c)), curve: { expr: `${m}*x+(${c})` }, x: [-5, 5], y: [-8, 8] };
  }
  if (k === 1) {
    const x1 = ri(-3, 0), dx = ri(1, 4), m = [-2, -1, 1, 2, 3, 0.5, -0.5][ri(0, 6)], y1 = ri(-3, 3);
    const pts: [number, number][] = [[x1, y1], [x1 + dx, y1 + m * dx]];
    const { options, answer } = numericOptions(m, [-m, 1 / m, m * 2]);
    return { kind: "slope", prompt: `ما ميل المستقيم المار بالنقطتين المحددتين (${pts[0].join("، ")}) و (${pts[1].join("، ")})؟`, options, answer, curve: { points: pts }, x: [-5, 6], y: [-8, 10] };
  }
  const t1 = ri(1, 3), d1 = ri(2, 6) * 10, rest = ri(1, 2);
  const pts: [number, number][] = [[0, 0], [t1, d1], [t1 + rest, d1], [t1 + rest + 2, 0]];
  const v = d1 / t1;
  const { options, answer } = numericOptions(Number(v.toFixed(2)), [d1, d1 / 2, Number((d1 / (t1 + rest)).toFixed(2))]);
  return { kind: "speed", prompt: "تمثيل المسافة (كم) – الزمن (ساعة). ما السرعة في المرحلة الأولى بالكيلومتر/ساعة؟", options, answer, curve: { points: pts }, x: [0, t1 + rest + 2], y: [0, d1 * 1.2], xl: "الزمن (ساعة)", yl: "المسافة (كم)" };
}

function GraphChallengeGame({ end }: { end: End }) {
  const [q, setQ] = useState<GQ>(() => makeGraphQ());
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const next = () => { if (n + 1 >= 8) end(score, `${score / 12.5} من 8`); else { setN(n + 1); setQ(makeGraphQ()); setPicked(null); } };
  return (
    <div className="card space-y-3 p-5">
      <HUD items={[["السؤال", `${n + 1}/8`], ["النقاط", score]]} />
      <div className="font-semibold"><MathText text={q.prompt} /></div>
      <Plane x={q.x} y={q.y} xLabel={q.xl} yLabel={q.yl} curves={[{ ...q.curve, color: "#2b7de9" }]} points={q.kind === "slope" && q.curve.points ? q.curve.points.map((p) => ({ at: p })) : []} />
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((o, k) => (
          <button key={k} disabled={picked !== null} onClick={() => { setPicked(k); if (k === q.answer) setScore((s) => s + 12.5); }}
            className={`rounded-xl border-2 p-3 text-lg ${picked !== null && k === q.answer ? "border-ok-500 bg-ok-50" : picked === k ? "border-bad-500 bg-bad-50" : "line hover:border-brand-300"}`}><MathText text={o} /></button>
        ))}
      </div>
      {picked !== null && <button className="btn btn-primary" onClick={next}>التالي</button>}
    </div>
  );
}

// ======================= 7) تصنيف البيانات =======================
function DataSortGame({ end }: { end: End }) {
  const cards = useMemo(() => shuffle(DATA_CARDS).slice(0, 15), []);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState<string | null>(null);
  const scoreRef = useRef(0); scoreRef.current = score;
  const left = useTimer(75, () => end(scoreRef.current, "انتهى الوقت"));
  const cats = ["نوعية", "عددية منفصلة", "عددية متصلة"];
  const choose = (c: number) => {
    const ok = cards[i].cat === c;
    const ns = score + (ok ? 7 : 0);
    setScore(ns);
    setFb(ok ? "✔" : `✘ (${cats[cards[i].cat]})`);
    setTimeout(() => setFb(null), 600);
    if (i + 1 >= cards.length) { setTimeout(() => end(ns + Math.floor(left / 3), `مكافأة الوقت المتبقي ${Math.floor(left / 3)}`), 300); return; }
    setI(i + 1);
  };
  return (
    <div className="card space-y-4 p-5">
      <HUD items={[["الوقت", left], ["البطاقة", `${i + 1}/${cards.length}`], ["النقاط", score]]} />
      <div className="anim-pop rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-8 text-center text-2xl font-bold text-white shadow-lg" key={i}>{cards[i].text}</div>
      {fb && <p className="text-center text-xl font-bold">{fb}</p>}
      <div className="grid gap-2 sm:grid-cols-3">{cats.map((c, k) => <button key={k} className="btn btn-soft !min-h-[64px] text-lg" onClick={() => choose(k)}>{c}</button>)}</div>
    </div>
  );
}

// ======================= 8) تحدي الدوائر والزوايا =======================
type CQ = { preset: "centre-angle" | "cyclic-quad" | "semicircle" | "alternate-segment"; prompt: string; answer: number };
function makeCircleQ(): CQ {
  const k = ri(0, 4);
  if (k === 0) { const a = ri(20, 80); return { preset: "centre-angle", prompt: `في الشكل، ق(أ جـ ب) = ${a}°. أوجد الزاوية المركزية ق(أ م ب).`, answer: 2 * a }; }
  if (k === 1) { const a = ri(25, 85); return { preset: "centre-angle", prompt: `في الشكل، ق(أ م ب) = ${2 * a}°. أوجد ق(أ جـ ب).`, answer: a }; }
  if (k === 2) { const a = ri(50, 130); return { preset: "cyclic-quad", prompt: `أ ب جـ د رباعي دائري، ق(أ) = ${a}°. أوجد ق(جـ).`, answer: 180 - a }; }
  if (k === 3) { const a = ri(20, 70); return { preset: "semicircle", prompt: `أب قطر، ق(جـ أ ب) = ${a}°. أوجد ق(جـ ب أ).`, answer: 90 - a }; }
  const a = ri(30, 80); return { preset: "alternate-segment", prompt: `الزاوية بين المماس عند أ والوتر أب تساوي ${a}°. أوجد ق(أ جـ ب).`, answer: a };
}
function CircleAnglesGame({ end }: { end: End }) {
  const [q, setQ] = useState<CQ>(() => makeCircleQ());
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState("");
  const [fb, setFb] = useState<string | null>(null);
  const submit = () => {
    const v = parseNumberInput(input);
    const ok = v !== null && Math.abs(v - q.answer) < 0.01;
    const ns = score + (ok ? 10 : 0);
    setScore(ns);
    setFb(ok ? "✔ صحيح" : `✘ الإجابة ${q.answer}°`);
    setTimeout(() => { setFb(null); setInput(""); if (n + 1 >= 10) end(ns, `${ns / 10} من 10`); else { setN(n + 1); setQ(makeCircleQ()); } }, 1100);
  };
  return (
    <div className="card space-y-3 p-5">
      <HUD items={[["السؤال", `${n + 1}/10`], ["النقاط", score]]} />
      <div className="flex justify-center"><CircleDiagram preset={q.preset} /></div>
      <p className="text-center text-lg font-semibold"><MathText text={q.prompt} /></p>
      <form className="mx-auto flex max-w-xs gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input className="input text-center text-2xl ltr" dir="ltr" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} aria-label="الزاوية بالدرجات" />
        <button className="btn btn-primary" disabled={!!fb}>تحقق</button>
      </form>
      {fb && <p className="text-center text-lg font-bold"><MathText text={fb} /></p>}
    </div>
  );
}

// ======================= 9) بناء الدالة =======================
type Op = { label: string; f: (x: number) => number };
const OP_BANK: Op[] = [
  ...[1, 2, 3, 4, 5].map((k) => ({ label: `+${k}`, f: (x: number) => x + k })),
  ...[1, 2, 3, 4, 5].map((k) => ({ label: `-${k}`, f: (x: number) => x - k })),
  ...[2, 3, 4, 5].map((k) => ({ label: `×${k}`, f: (x: number) => x * k })),
  { label: "تربيع", f: (x: number) => x * x },
];
function makeTarget(level: number): Op[] {
  const n = level < 3 ? 1 + (level > 1 ? 1 : 0) : 2;
  const ops: Op[] = [];
  while (ops.length < n) { const o = OP_BANK[ri(0, OP_BANK.length - 1)]; if (!ops.some((x) => x.label === o.label)) ops.push(o); }
  return ops;
}
function FunctionBuilderGame({ end }: { end: End }) {
  const [level, setLevel] = useState(1);
  const [target, setTarget] = useState<Op[]>(() => makeTarget(1));
  const [chain, setChain] = useState<Op[]>([]);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const inputs = [0, 1, 2, 3, 5];
  const apply = (ops: Op[], x: number) => ops.reduce((v, o) => o.f(v), x);
  const outs = inputs.map((x) => apply(target, x));
  const mine = inputs.map((x) => apply(chain, x));
  const solved = chain.length > 0 && mine.every((v, i) => v === outs[i]);
  useEffect(() => {
    if (!solved) return;
    const gained = Math.max(5, 20 - tries * 3);
    const ns = score + gained;
    setScore(ns);
    const t = setTimeout(() => { if (level >= 6) end(ns, "أكملت جميع المستويات!"); else { setLevel(level + 1); setTarget(makeTarget(level + 1)); setChain([]); setTries(0); } }, 1200);
    return () => clearTimeout(t);
  }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="card space-y-4 p-5">
      <HUD items={[["المستوى", `${level}/6`], ["النقاط", score]]} />
      <p>ابنِ مخطط تدفق (حتى عمليتين) يعطي المخرجات المطلوبة لكل مدخلة:</p>
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead><tr className="bg-black/5 dark:bg-white/10"><th className="p-2">المُدخلة س</th>{inputs.map((x) => <th key={x} className="p-2"><Num>{x}</Num></th>)}</tr></thead>
          <tbody>
            <tr><td className="p-2 font-bold">المطلوب د(س)</td>{outs.map((v, i) => <td key={i} className="p-2 font-bold"><Num>{v}</Num></td>)}</tr>
            <tr><td className="p-2 font-bold">مخططك</td>{mine.map((v, i) => <td key={i} className={`p-2 font-bold ${chain.length ? (v === outs[i] ? "text-ok-700" : "text-bad-700") : "muted"}`}>{chain.length ? <Num>{v}</Num> : "—"}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed line p-3 text-lg">
        <span className="chip bg-black/5 !py-2">س</span>
        {chain.map((o, i) => <React.Fragment key={i}><span>←</span><button className="chip bg-brand-600 !py-2 text-white" onClick={() => { setChain(chain.filter((_, j) => j !== i)); }}>{o.label} ✕</button></React.Fragment>)}
        <span>←</span><span className="chip bg-black/5 !py-2">د(س)</span>
      </div>
      {solved && <p className="anim-pop rounded-xl bg-ok-50 p-3 text-center font-bold text-ok-700">✔ ممتاز! الدالة صحيحة.</p>}
      <div className="flex flex-wrap gap-1.5">
        {OP_BANK.map((o) => <button key={o.label} className="btn btn-soft !min-h-[44px] !px-3" disabled={chain.length >= 2 || solved} onClick={() => { setChain([...chain, o]); setTries((t) => t + 1); }}>{o.label}</button>)}
      </div>
      <button className="btn btn-ghost" onClick={() => setChain([])}><Icon name="undo" size={18} /> ابدأ من جديد</button>
    </div>
  );
}

// ======================= 10) تحدي البرمجة الخطية =======================
type LPQ = { regions: Ineq[]; verts: [number, number][]; a: number; b: number; max: boolean; best: number[] };
function makeLP(): LPQ {
  for (let attempt = 0; attempt < 50; attempt++) {
    const p = ri(4, 8), q = ri(4, 8), r = ri(1, 3), s = ri(1, 3), t = ri(6, 14);
    const regions: Ineq[] = [{ a: 1, b: 0, op: ">=", c: 0 }, { a: 0, b: 1, op: ">=", c: 0 }, { a: 1, b: 0, op: "<=", c: p }, { a: 0, b: 1, op: "<=", c: q }, { a: r, b: s, op: "<=", c: t }];
    let poly: [number, number][] = [[-1, -1], [12, -1], [12, 12], [-1, 12]];
    for (const g of regions) poly = clipHalfPlane(poly, g);
    const verts: [number, number][] = [];
    for (const v of poly) if (!verts.some((w) => Math.abs(w[0] - v[0]) < 1e-6 && Math.abs(w[1] - v[1]) < 1e-6)) verts.push([Number(v[0].toFixed(3)), Number(v[1].toFixed(3))]);
    if (verts.length < 4) continue;
    const a = ri(1, 5), b = ri(1, 5), max = Math.random() < 0.7;
    const vals = verts.map((v) => a * v[0] + b * v[1]);
    const target = max ? Math.max(...vals) : Math.min(...vals.filter((_, i) => verts[i][0] + verts[i][1] > 0));
    const best = vals.map((v, i) => (Math.abs(v - target) < 1e-6 ? i : -1)).filter((i) => i >= 0);
    if (!max && best.length === 0) continue;
    return { regions, verts, a, b, max, best };
  }
  return makeLP();
}
function LPGame({ end }: { end: End }) {
  const [q, setQ] = useState<LPQ>(() => makeLP());
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const vals = q.verts.map((v) => q.a * v[0] + q.b * v[1]);
  const choose = (i: number) => { if (picked !== null) return; setPicked(i); if (q.best.includes(i)) setScore((s) => s + 20); };
  const next = () => { if (n + 1 >= 5) end(score, `${score / 20} من 5`); else { setN(n + 1); setQ(makeLP()); setPicked(null); } };
  const r2 = (v: number) => Number(v.toFixed(2));
  return (
    <div className="card space-y-3 p-5">
      <HUD items={[["الجولة", `${n + 1}/5`], ["النقاط", score]]} />
      <p className="font-semibold"><MathText text={`اضغط على الرأس الذي يعطي ${q.max ? "أكبر" : "أصغر"} قيمة للعبارة ${q.a}س + ${q.b}ص ${q.max ? "" : "(غير نقطة الأصل)"}`} /></p>
      <Plane x={[-1, 10]} y={[-1, 10]} regions={q.regions} shadeMode="unwanted"
        onClick={(p) => { let bi = -1, bd = 0.8; q.verts.forEach((v, i) => { const dd = Math.hypot(v[0] - p[0], v[1] - p[1]); if (dd < bd) { bd = dd; bi = i; } }); if (bi >= 0) choose(bi); }}
        points={q.verts.map((v, i) => ({ at: v, color: picked === null ? "#7c3aed" : q.best.includes(i) ? "#16a34a" : i === picked ? "#dc2626" : "#94a3b8", label: picked !== null ? `${r2(vals[i])}` : `(${r2(v[0])}، ${r2(v[1])})` }))} />
      <div className="flex flex-wrap gap-1.5">{q.verts.map((v, i) => <button key={i} className="btn btn-ghost !min-h-[40px] text-sm" disabled={picked !== null} onClick={() => choose(i)}><Num>{`(${r2(v[0])}، ${r2(v[1])})`}</Num></button>)}</div>
      {picked !== null && (
        <div className={`rounded-xl p-3 ${q.best.includes(picked) ? "bg-ok-50 text-ok-700" : "bg-bad-50 text-bad-700"}`}>
          {q.best.includes(picked) ? "✔ صحيح!" : "✘ ليس هذا الرأس."} القيم عند الرؤوس: <Num>{vals.map(r2).join("، ")}</Num>
          <div className="mt-2"><button className="btn btn-primary !min-h-[40px]" onClick={next}>التالي</button></div>
        </div>
      )}
    </div>
  );
}

const GAMES: Record<GameId, (p: { end: End }) => React.ReactElement> = {
  speed: SpeedGame, catcher: CatcherGame, race: RaceGame, "spot-error": SpotErrorGame, complete: CompleteGame,
  "graph-challenge": GraphChallengeGame, "data-sort": DataSortGame, "circle-angles": CircleAnglesGame, "function-builder": FunctionBuilderGame, "lp-challenge": LPGame,
};

export function GamePlayer({ id }: { id: GameId }) {
  const G = GAMES[id];
  return <GameShell id={id}>{(end) => <G end={end} />}</GameShell>;
}

