"use client";
import React, { useMemo, useState } from "react";
import { calc, fmt, MathError, parse, toWesternDigits } from "@/lib/math/expr";
import { Q } from "@/lib/math/poly";
import { MathText, Num } from "@/components/ui/MathText";
import { Plane } from "@/components/figures/Plane";
import { DataTable } from "@/components/figures/Figure";
import { Icon } from "@/components/ui/Icon";
import { useLocal } from "@/lib/storage";
import { PALETTE } from "@/components/figures/Charts";

// ======================= الآلة الحاسبة =======================
export function Calculator({ scientific = true }: { scientific?: boolean }) {
  const [expr, setExpr] = useState("");
  const [angle, setAngle] = useLocal<"deg" | "rad">("calc-angle", "deg");
  const [history, setHistory] = useLocal<{ e: string; r: string }[]>("calc-history", []);
  const [ans, setAns] = useState<number | null>(null);
  let preview = "";
  let error = "";
  if (expr.trim()) {
    try { preview = fmt(calc(expr.replace(/Ans/g, String(ans ?? 0)), {}, { angle })); }
    catch (e) { error = e instanceof MathError ? e.message : "خطأ"; }
  }
  const press = (k: string) => setExpr((e) => e + k);
  const equals = () => {
    if (!expr.trim()) return;
    try {
      const v = calc(expr.replace(/Ans/g, String(ans ?? 0)), {}, { angle });
      setAns(v);
      setHistory((h) => [{ e: expr, r: fmt(v) }, ...h].slice(0, 30));
      setExpr(fmt(v).includes("×10^") ? String(v) : fmt(v));
    } catch { /* يظهر الخطأ أسفل الشاشة */ }
  };
  const sciKeys = ["sin(", "cos(", "tan(", "asin(", "acos(", "atan(", "√(", "^", "^2", "log(", "ln(", "π", "(", ")", "!", "abs(", "Ans", "e"];
  const basic = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "%", "+"];
  return (
    <div className="mx-auto max-w-md space-y-3">
      <div className="rounded-2xl bg-slate-900 p-4 text-white">
        <input className="w-full bg-transparent text-left text-2xl outline-none ltr" dir="ltr" value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") equals(); }} placeholder="0" aria-label="العبارة" />
        <div className={`mt-1 min-h-[1.5rem] text-left text-lg ltr ${error ? "text-red-300" : "text-sky-300"}`} dir="ltr">{error ? <span dir="rtl">{error}</span> : preview && `= ${preview}`}</div>
        {scientific && <div className="mt-1 text-xs text-slate-400">وحدة الزوايا: {angle === "deg" ? "درجات" : "راديان"}</div>}
      </div>
      {scientific && (
        <div className="grid grid-cols-6 gap-1.5">
          {sciKeys.map((k) => <button key={k} className="btn btn-soft !min-h-[42px] !px-1 text-sm ltr" onClick={() => press(k === "√(" ? "sqrt(" : k)}>{k.replace("(", "")}</button>)}
        </div>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        {basic.map((k) => <button key={k} className={`btn !min-h-[52px] text-xl ${/[0-9.]/.test(k) ? "btn-ghost" : "btn-soft"}`} onClick={() => press(k)}>{k}</button>)}
        <button className="btn btn-bad !min-h-[52px]" onClick={() => setExpr("")}>AC</button>
        <button className="btn btn-ghost !min-h-[52px]" onClick={() => setExpr((e) => e.slice(0, -1))} aria-label="حذف آخر رمز">⌫</button>
        {scientific ? <button className="btn btn-ghost !min-h-[52px] text-sm" onClick={() => setAngle(angle === "deg" ? "rad" : "deg")}>{angle === "deg" ? "DEG" : "RAD"}</button> : <button className="btn btn-ghost !min-h-[52px]" onClick={() => press("(")}>(</button>}
        <button className="btn btn-primary !min-h-[52px] text-2xl" onClick={equals}>=</button>
      </div>
      {history.length > 0 && (
        <div className="rounded-xl border line p-3 text-sm">
          <div className="mb-1 flex justify-between font-semibold">السجل <button className="text-xs muted" onClick={() => setHistory([])}>مسح</button></div>
          <ul className="max-h-40 space-y-1 overflow-y-auto ltr" dir="ltr">{history.map((h, i) => <li key={i}><button className="hover:text-brand-600" onClick={() => setExpr(h.e)}>{h.e} = <b>{h.r}</b></button></li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ======================= حاسبة الكسور =======================
function parseFrac(s: string): Q | null {
  const t = toWesternDigits(s).trim().replace(/\s+/g, " ");
  if (!t) return null;
  try {
    const mixed = /^(-?\d+) (\d+)\/(\d+)$/.exec(t);
    if (mixed) { const w = Number(mixed[1]); const f = new Q(Number(mixed[2]), Number(mixed[3])); return w < 0 ? new Q(w).sub(f) : new Q(w).add(f); }
    const fr = /^(-?\d+)\/(-?\d+)$/.exec(t);
    if (fr) return new Q(Number(fr[1]), Number(fr[2]));
    const v = calc(t);
    return new Q(v);
  } catch { return null; }
}
function qDisplay(q: Q) {
  if (q.d === 1) return String(q.n);
  const whole = Math.trunc(q.n / q.d), rem = Math.abs(q.n % q.d);
  return `\\frac{${q.n}}{${q.d}}${whole !== 0 ? `  =  ${whole} \\frac{${rem}}{${q.d}}` : ""}`;
}
const qShort = (q: Q) => (q.d === 1 ? String(q.n) : `\\frac{${q.n}}{${q.d}}`);
export function FractionCalc() {
  const [a, setA] = useState("3/4");
  const [b, setB] = useState("2/3");
  const [op, setOp] = useState("+");
  const A = parseFrac(a), B = parseFrac(b);
  let res: Q | null = null, err = "";
  try { if (A && B) res = op === "+" ? A.add(B) : op === "-" ? A.sub(B) : op === "×" ? A.mul(B) : A.div(B); } catch (e) { err = e instanceof Error ? e.message : "خطأ"; }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input w-32 text-center ltr" dir="ltr" value={a} onChange={(e) => setA(e.target.value)} aria-label="الكسر الأول" />
        <select className="input w-20 text-center" value={op} onChange={(e) => setOp(e.target.value)} aria-label="العملية">{["+", "-", "×", "÷"].map((o) => <option key={o}>{o}</option>)}</select>
        <input className="input w-32 text-center ltr" dir="ltr" value={b} onChange={(e) => setB(e.target.value)} aria-label="الكسر الثاني" />
      </div>
      <p className="text-xs muted">اكتب الكسر هكذا: 3/4 ، أو العدد الكسري هكذا: 1 1/2</p>
      {(!A || !B) && <p className="text-sm text-bad-700">تعذّرت قراءة أحد الكسرين.</p>}
      {err && <p className="text-sm text-bad-700">{err}</p>}
      {res && <div className="rounded-xl bg-ok-50 p-4 text-xl font-bold text-ok-700 dark:bg-ok-700/20 dark:text-ok-50"><MathText text={`${qShort(A!)} ${op} ${qShort(B!)}`} /> = <MathText text={qDisplay(res)} /> <span className="text-base font-normal">≈ <Num>{fmt(res.value(), 6)}</Num></span></div>}
    </div>
  );
}

// ======================= النسب المئوية =======================
export function PercentCalc() {
  const [p, setP] = useState(15), [x, setX] = useState(80), [a, setA] = useState(50), [b, setB] = useState(65), [part, setPart] = useState(18), [whole, setWhole] = useState(24);
  const N = ({ v, set, label }: { v: number; set: (n: number) => void; label: string }) => <input type="number" className="input w-28 text-center" value={v} onChange={(e) => set(Number(e.target.value))} aria-label={label} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border line p-3"><N v={p} set={setP} label="النسبة" />% من <N v={x} set={setX} label="العدد" /> = <b className="text-lg"><Num>{fmt((p / 100) * x)}</Num></b></div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border line p-3"><N v={part} set={setPart} label="الجزء" /> من <N v={whole} set={setWhole} label="الكل" /> = <b className="text-lg"><Num>{whole ? `${fmt((part / whole) * 100, 3)}%` : "—"}</Num></b></div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border line p-3">التغيّر من <N v={a} set={setA} label="القيمة الأصلية" /> إلى <N v={b} set={setB} label="القيمة الجديدة" /> = <b className="text-lg"><Num>{a ? `${fmt(((b - a) / a) * 100, 3)}%` : "—"}</Num></b> {a ? (b >= a ? "زيادة" : "نقصان") : ""}</div>
    </div>
  );
}

// ======================= جدول القيم =======================
export function TableTool() {
  const [f, setF] = useState("2س + 1");
  const [from, setFrom] = useState(-3), [to, setTo] = useState(3), [step, setStep] = useState(1);
  const xs: number[] = [];
  if (step > 0) for (let v = from; v <= to + 1e-9 && xs.length < 41; v += step) xs.push(Number(v.toFixed(6)));
  let ok = true;
  try { parse(f); } catch { ok = false; }
  const ys = xs.map((x) => { try { return fmt(calc(f, { x }), 4); } catch (e) { return e instanceof MathError && e.message.includes("صفر") ? "غير معرّفة" : "—"; } });
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="sm:col-span-4"><span className="mb-1 block text-sm font-semibold">ص =</span><input className={`input ltr ${ok ? "" : "!border-bad-500"}`} dir="ltr" value={f} onChange={(e) => setF(e.target.value)} /></label>
        <label><span className="mb-1 block text-xs muted">من س =</span><input type="number" className="input" value={from} onChange={(e) => setFrom(Number(e.target.value))} /></label>
        <label><span className="mb-1 block text-xs muted">إلى س =</span><input type="number" className="input" value={to} onChange={(e) => setTo(Number(e.target.value))} /></label>
        <label><span className="mb-1 block text-xs muted">الخطوة</span><input type="number" className="input" value={step} min={0.1} step={0.5} onChange={(e) => setStep(Math.max(0.1, Number(e.target.value)))} /></label>
      </div>
      {ok ? <DataTable head={["س", ...xs.map(String)]} rows={[["ص", ...ys]]} /> : <p className="text-bad-700">صيغة غير صحيحة.</p>}
    </div>
  );
}

// ======================= رسم الدوال =======================
export function FunctionPlotter() {
  const [fs, setFs] = useLocal<string[]>("plotter-fns", ["س^2 - 2", "2س + 1"]);
  const [xr, setXr] = useState<[number, number]>([-6, 6]);
  const [yr, setYr] = useState<[number, number]>([-6, 10]);
  const valid = fs.map((f) => { try { parse(f); return true; } catch { return false; } });
  return (
    <div className="space-y-3">
      {fs.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-4 w-4 shrink-0 rounded" style={{ background: PALETTE[i % PALETTE.length] }} />
          <span className="shrink-0 text-sm">ص =</span>
          <input className={`input ltr ${valid[i] ? "" : "!border-bad-500"}`} dir="ltr" value={f} onChange={(e) => setFs(fs.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`الدالة ${i + 1}`} />
          <button className="muted" onClick={() => setFs(fs.filter((_, j) => j !== i))} aria-label="حذف"><Icon name="trash" size={18} /></button>
        </div>
      ))}
      {fs.length < 6 && <button className="btn btn-ghost !min-h-[40px] text-sm" onClick={() => setFs([...fs, "س"])}><Icon name="plus" size={16} /> أضف دالة</button>}
      <div className="flex flex-wrap gap-2 text-sm">
        <label>س من <input type="number" className="input inline w-20" value={xr[0]} onChange={(e) => setXr([Number(e.target.value), xr[1]])} /></label>
        <label>إلى <input type="number" className="input inline w-20" value={xr[1]} onChange={(e) => setXr([xr[0], Number(e.target.value)])} /></label>
        <label>ص من <input type="number" className="input inline w-20" value={yr[0]} onChange={(e) => setYr([Number(e.target.value), yr[1]])} /></label>
        <label>إلى <input type="number" className="input inline w-20" value={yr[1]} onChange={(e) => setYr([yr[0], Number(e.target.value)])} /></label>
      </div>
      {xr[1] > xr[0] && yr[1] > yr[0] && <Plane x={xr} y={yr} xLabel="س" yLabel="ص" curves={fs.map((f, i) => (valid[i] ? { expr: f, color: PALETTE[i % PALETTE.length] } : {}))} />}
      <p className="text-xs muted">أمثلة: س^2 - 4س ، 12/س ، sqrt(س) ، 2^س. القسمة على صفر تظهر فجوة في الرسم.</p>
    </div>
  );
}

// ======================= رسم المستقيمات =======================
export function LineTool() {
  const [mode, setMode] = useState<"mc" | "pts">("mc");
  const [m, setM] = useState(2), [c, setC] = useState(-1);
  const [p1, setP1] = useState<[number, number]>([-2, 1]), [p2, setP2] = useState<[number, number]>([3, 6]);
  const mm = mode === "mc" ? m : p2[0] !== p1[0] ? (p2[1] - p1[1]) / (p2[0] - p1[0]) : NaN;
  const cc = mode === "mc" ? c : p1[1] - mm * p1[0];
  const eq = Number.isFinite(mm) ? `ص = ${fmt(mm, 3)}س ${cc < 0 ? `- ${fmt(-cc, 3)}` : `+ ${fmt(cc, 3)}`}` : `س = ${p1[0]}`;
  return (
    <div className="space-y-3">
      <div className="flex gap-1"><button className={`chip !py-2 ${mode === "mc" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode("mc")}>بالميل والمقطع</button><button className={`chip !py-2 ${mode === "pts" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode("pts")}>بنقطتين (اسحبهما)</button></div>
      {mode === "mc" && <div className="flex flex-wrap gap-3 text-sm"><label>الميل م = <input type="number" step={0.5} className="input inline w-24" value={m} onChange={(e) => setM(Number(e.target.value))} /></label><label>المقطع جـ = <input type="number" className="input inline w-24" value={c} onChange={(e) => setC(Number(e.target.value))} /></label></div>}
      <div className="text-lg font-bold"><MathText text={eq} /></div>
      <Plane x={[-8, 8]} y={[-8, 8]} curves={Number.isFinite(mm) ? [{ expr: `(${mm})*x+(${cc})` }] : []}
        drag={mode === "pts" ? [{ id: "a", at: p1, label: "أ", onMove: (p) => setP1([Math.round(p[0]), Math.round(p[1])]) }, { id: "b", at: p2, label: "ب", color: "#7c3aed", onMove: (p) => setP2([Math.round(p[0]), Math.round(p[1])]) }] : []} />
    </div>
  );
}

// ======================= المستوى الإحداثي =======================
export function CoordinateTool() {
  const [pts, setPts] = useLocal<[number, number][]>("coord-pts", [[1, 2], [4, 6]]);
  const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
  return (
    <div className="space-y-3">
      <p className="text-sm muted">انقر على المستوى لإضافة نقطة (تُقرّب لأقرب نصف وحدة)، واسحب النقاط لتحريكها. تُحسب المسافة ونقطة المنتصف والميل لآخر نقطتين.</p>
      <Plane x={[-10, 10]} y={[-10, 10]} onClick={(p) => setPts([...pts, [Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2]])}
        curves={a && b ? [{ points: [a, b], color: "#94a3b8", dashed: true }] : []}
        drag={pts.map((p, i) => ({ id: "p" + i, at: p, label: `(${p[0]}، ${p[1]})`, onMove: (q) => setPts(pts.map((x, j) => (j === i ? [Math.round(q[0] * 2) / 2, Math.round(q[1] * 2) / 2] : x))) }))} />
      {a && b && (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl border line p-2">المسافة: <b><Num>{fmt(Math.hypot(b[0] - a[0], b[1] - a[1]), 3)}</Num></b></div>
          <div className="rounded-xl border line p-2">المنتصف: <b><Num>{`(${fmt((a[0] + b[0]) / 2)}، ${fmt((a[1] + b[1]) / 2)})`}</Num></b></div>
          <div className="rounded-xl border line p-2">الميل: <b><Num>{b[0] !== a[0] ? fmt((b[1] - a[1]) / (b[0] - a[0]), 3) : "غير معرّف"}</Num></b></div>
        </div>
      )}
      <button className="btn btn-ghost !min-h-[40px] text-sm" onClick={() => setPts([])}>مسح النقاط</button>
    </div>
  );
}

// ======================= محرر المعادلات =======================
export function EquationEditor() {
  const [src, setSrc] = useLocal("eq-editor", "ص = \\frac{3س + 2}{س - 1}");
  const [copied, setCopied] = useState(false);
  const insert = (t: string) => setSrc(src + t);
  const KEYS: [string, string][] = [["كسر", "\\frac{}{}"], ["أس", "^{}"], ["دليل", "_{}"], ["جذر", "\\sqrt{}"], ["≤", "\\le "], ["≥", "\\ge "], ["≠", "\\ne "], ["×", "\\times "], ["÷", "\\div "], ["∝", "\\propto "], ["∘", "\\circ "], ["π", "\\pi "], ["°", "°"], ["س", "س"], ["ص", "ص"], ["د(س)", "د(س)"]];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">{KEYS.map(([l, t]) => <button key={l} className="btn btn-soft !min-h-[40px] !px-3" onClick={() => insert(t)}>{l}</button>)}</div>
      <textarea className="input min-h-[80px] ltr font-mono" dir="ltr" value={src} onChange={(e) => setSrc(e.target.value)} aria-label="المعادلة" />
      <div className="rounded-xl border-2 border-dashed line p-6 text-center text-2xl"><MathText text={src} /></div>
      <button className="btn btn-ghost" onClick={async () => { try { await navigator.clipboard.writeText(src); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ } }}>{copied ? "تم النسخ ✔" : "انسخ الصيغة"}</button>
      <p className="text-xs muted">يمكنك لصق الصيغة في السبورة (أداة المعادلة) أو في ملاحظاتك.</p>
    </div>
  );
}

export function useToolsList() {
  return useMemo(() => [
    { id: "sci", title: "آلة حاسبة علمية", icon: "calc" as const, C: () => <Calculator /> },
    { id: "basic", title: "آلة حاسبة أساسية", icon: "calc" as const, C: () => <Calculator scientific={false} /> },
    { id: "frac", title: "حاسبة الكسور", icon: "algebra" as const, C: FractionCalc },
    { id: "pct", title: "حاسبة النسب المئوية", icon: "ratio" as const, C: PercentCalc },
    { id: "table", title: "أداة إنشاء الجداول", icon: "grid" as const, C: TableTool },
    { id: "line", title: "أداة رسم المستقيمات", icon: "line" as const, C: LineTool },
    { id: "plot", title: "أداة رسم الدوال", icon: "function" as const, C: FunctionPlotter },
    { id: "coord", title: "أداة المستوى الإحداثي", icon: "axes" as const, C: CoordinateTool },
    { id: "eq", title: "محرر المعادلات", icon: "text" as const, C: EquationEditor },
  ], []);
}
