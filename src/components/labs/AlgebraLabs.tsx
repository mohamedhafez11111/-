"use client";
import React, { useMemo, useState } from "react";
import { LabGrid, Slider, NumField, Stat } from "./ui";
import { MathText, Num } from "@/components/ui/MathText";
import { Plane } from "@/components/figures/Plane";
import { DataTable } from "@/components/figures/Figure";
import { algebraicFractionSteps, ratToString, qToString, type FracOp } from "@/lib/math/poly";
import { parse, evaluate, type Node, MathError, fmt, variablesOf } from "@/lib/math/expr";

const r3 = (v: number) => Number(v.toFixed(3));

/** تحويل إدخال الطالب إلى ترميز العرض (للمعاينة) */
function toDisplay(src: string): string {
  try { return nodeToText(parse(src)); } catch { return src; }
}

const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };
export function nodeToText(n: Node, parentPrec = 0): string {
  switch (n.k) {
    case "num": return fmt(n.v);
    case "var": return ({ x: "س", y: "ص", z: "ع", n: "ن", m: "م", l: "ل", k: "ك", t: "ت", f: "ف", r: "ر" } as Record<string, string>)[n.name] ?? n.name;
    case "neg": return `-${nodeToText(n.a, 3)}`;
    case "fact": return `${nodeToText(n.a, 4)}!`;
    case "call": return `${n.fn}(${n.args.map((a) => nodeToText(a)).join("، ")})`;
    case "bin": {
      if (n.op === "/") return `\\frac{${nodeToText(n.a)}}{${nodeToText(n.b)}}`;
      if (n.op === "^") return `${nodeToText(n.a, 4)}^{${nodeToText(n.b)}}`;
      const p = PREC[n.op];
      let s: string;
      if (n.op === "*") {
        const left = nodeToText(n.a, p), right = nodeToText(n.b, p + 1);
        const implicit = n.a.k === "num" && (n.b.k === "var" || (n.b.k === "bin" && n.b.op === "^") || n.b.k === "call");
        s = implicit ? `${left}${right}` : `${left} × ${right}`;
      } else s = `${nodeToText(n.a, p)} ${n.op} ${nodeToText(n.b, p + 1)}`;
      return p < parentPrec ? `(${s})` : s;
    }
  }
}

// ======================= الكسور الجبرية =======================
const EXAMPLES: { op: FracOp; a: string; b?: string; label: string }[] = [
  { op: "simplify", a: "(س^2-4س+3)/(س^2-7س+12)", label: "تبسيط" },
  { op: "×", a: "(س^2-9)/(2س+4)", b: "(س+2)/(س-3)", label: "ضرب" },
  { op: "÷", a: "(س+1)/س", b: "(س^2-1)/(3س)", label: "قسمة" },
  { op: "+", a: "2/(س+1)", b: "3/(س-2)", label: "جمع" },
  { op: "-", a: "1/(س-3)", b: "6/(س^2-9)", label: "طرح" },
];

export function AlgebraicFractionsLab() {
  const [op, setOp] = useState<FracOp>("simplify");
  const [a, setA] = useState(EXAMPLES[0].a);
  const [b, setB] = useState("(س+2)/(س-3)");
  const [xv, setXv] = useState(5);
  const out = useMemo(() => {
    try { return { ok: true as const, ...algebraicFractionSteps(op, a, op === "simplify" ? undefined : b) }; }
    catch (e) { return { ok: false as const, error: e instanceof MathError ? e.message : "تعذّر فهم العبارة. استخدم س متغيراً و / للقسمة و ^ للأس." }; }
  }, [op, a, b]);

  // التحقق العددي: قيمة العبارة الأصلية مقابل الناتج عند س معينة
  let check: { orig: number; res: number } | null = null;
  if (out.ok) {
    try {
      const src = op === "simplify" ? a : `(${a})${op === "×" ? "*" : op === "÷" ? "/" : op}(${b})`;
      const orig = evaluate(parse(src), { x: xv }, { strict: true });
      const resVal = evalRat(out.result, xv);
      check = { orig, res: resVal };
    } catch { check = null; }
  }

  return (
    <LabGrid controls={<>
      <div className="grid grid-cols-5 gap-1">
        {(["simplify", "+", "-", "×", "÷"] as FracOp[]).map((o) => <button key={o} className={`chip justify-center !py-2 ${op === o ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setOp(o)}>{o === "simplify" ? "تبسيط" : o}</button>)}
      </div>
      <label className="block"><span className="mb-1 block text-sm font-semibold">الكسر الأول</span><input className="input ltr" dir="ltr" value={a} onChange={(e) => setA(e.target.value)} /></label>
      {op !== "simplify" && <label className="block"><span className="mb-1 block text-sm font-semibold">الكسر الثاني</span><input className="input ltr" dir="ltr" value={b} onChange={(e) => setB(e.target.value)} /></label>}
      <div className="flex flex-wrap gap-1.5">{EXAMPLES.map((e) => <button key={e.label} className="chip bg-black/5 !py-1.5 text-xs" onClick={() => { setOp(e.op); setA(e.a); if (e.b) setB(e.b); }}>مثال: {e.label}</button>)}</div>
      <p className="text-xs muted">اكتب بالرموز: س ، ^ للأس ، / للقسمة ، والأقواس. مثال: (س^2-9)/(س+3)</p>
    </>}>
      <div className="rounded-xl border line p-4 text-lg">
        <MathText text={op === "simplify" ? toDisplay(a) : `${toDisplay(a)} ${op} ${toDisplay(b)}`} />
      </div>
      {!out.ok ? <div className="rounded-xl bg-bad-50 p-3 text-bad-700">{out.error}</div> : (<>
        <ol className="space-y-2">
          {out.steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-lg bg-black/[0.03] p-3 dark:bg-white/5"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white"><Num>{i + 1}</Num></span><MathText text={s} /></li>
          ))}
        </ol>
        <div className="rounded-xl bg-ok-50 p-4 text-lg font-bold text-ok-700 dark:bg-ok-700/20 dark:text-ok-50">النتيجة: <MathText text={ratToString(out.result, "س", true)} /></div>
        {out.excluded.length > 0 && <p className="text-sm">القيم المستبعدة (التي تجعل مقاماً أو مقسوماً عليه صفراً): <MathText text={out.excluded.map((q) => `س ≠ ${qToString(q)}`).join(" ، ")} /></p>}
        <div className="rounded-xl border line p-3">
          <div className="mb-2 font-semibold">تحقّق عددي: عوّض بقيمة لـ س</div>
          <div className="flex items-end gap-3">
            <NumField label="س =" value={xv} onChange={setXv} className="w-28" />
            {check ? (
              <div className="text-sm">العبارة الأصلية = <b><Num>{fmt(check.orig, 5)}</Num></b> ، الناتج = <b><Num>{fmt(check.res, 5)}</Num></b> {Math.abs(check.orig - check.res) < 1e-9 ? "✔ متساويتان" : "✘"}</div>
            ) : <div className="text-sm text-warn-700">هذه القيمة مستبعدة (تؤدي إلى القسمة على صفر).</div>}
          </div>
        </div>
      </>)}
    </LabGrid>
  );
}

function evalRat(r: { num: { c: { value(): number }[] }; den: { c: { value(): number }[] } }, x: number) {
  const ev = (c: { value(): number }[]) => c.reduceRight((acc, q) => acc * x + q.value(), 0);
  const d = ev(r.den.c);
  if (d === 0) throw new MathError("قسمة على صفر");
  return ev(r.num.c) / d;
}

// ======================= التناسب =======================
export function ProportionLab() {
  const [kind, setKind] = useState<"direct" | "inverse">("direct");
  const [pw, setPw] = useState(1);
  const [k, setK] = useState(2);
  const [x1, setX1] = useState(3);
  const [y1, setY1] = useState(18);
  const [x2, setX2] = useState(5);
  const powTxt = pw === 0.5 ? "\\sqrt{س}" : pw === 1 ? "س" : `س^${pw}`;
  const g = (x: number) => (pw === 0.5 ? Math.sqrt(x) : x ** pw);
  const expr = kind === "direct" ? (pw === 0.5 ? `${k}*sqrt(x)` : `${k}*x^${pw}`) : (pw === 0.5 ? `${k}/sqrt(x)` : `${k}/x^${pw}`);
  const xs = [0.5, 1, 2, 3, 4, 5, 6];
  const f = (x: number) => (kind === "direct" ? k * g(x) : g(x) === 0 ? NaN : k / g(x));
  // الحل من زوج معطى
  const kFound = kind === "direct" ? (g(x1) ? y1 / g(x1) : NaN) : y1 * g(x1);
  const y2 = kind === "direct" ? kFound * g(x2) : g(x2) ? kFound / g(x2) : NaN;
  const ymax = Math.max(4, ...xs.map(f).filter(Number.isFinite)) * 1.1;
  return (
    <LabGrid controls={<>
      <div className="grid grid-cols-2 gap-1">
        <button className={`chip justify-center !py-2 ${kind === "direct" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setKind("direct")}>طردي</button>
        <button className={`chip justify-center !py-2 ${kind === "inverse" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setKind("inverse")}>عكسي</button>
      </div>
      <label className="block"><span className="mb-1 block text-sm font-semibold">التناسب مع</span>
        <select className="input" value={pw} onChange={(e) => setPw(Number(e.target.value))}>
          <option value={1}>س</option><option value={2}>س²</option><option value={3}>س³</option><option value={0.5}>√س</option>
        </select>
      </label>
      <Slider label="ثابت التناسب ث" value={k} min={0.5} max={10} step={0.5} onChange={setK} />
      <div className="rounded-xl border line p-3">
        <div className="mb-2 text-sm font-semibold">حلّ مسألة: أوجد ث من زوج معطى</div>
        <div className="grid grid-cols-3 gap-1.5">
          <NumField label="س المعطاة" value={x1} onChange={setX1} />
          <NumField label="ص المعطاة" value={y1} onChange={setY1} />
          <NumField label="س المطلوبة" value={x2} onChange={setX2} />
        </div>
      </div>
    </>}>
      <div className="rounded-xl border line p-3 text-center text-lg">
        <MathText text={kind === "direct" ? `ص ∝ ${powTxt} ⇐ ص = ث${powTxt} = ${k}${powTxt}` : `ص ∝ \\frac{1}{${powTxt}} ⇐ ص = \\frac{ث}{${powTxt}} = \\frac{${k}}{${powTxt}}`} />
      </div>
      <Plane x={[0, 7]} y={[0, ymax]} xLabel="س" yLabel="ص" curves={[{ expr, domain: [kind === "inverse" ? 0.05 : 0, 7] }]} points={xs.filter((x) => Number.isFinite(f(x))).map((x) => ({ at: [x, f(x)] as [number, number] }))} />
      <DataTable head={["س", ...xs.map(String)]} rows={[["ص", ...xs.map((x) => r3(f(x)))], [kind === "direct" ? `ص ÷ ${powTxt}` : `ص × ${powTxt}`, ...xs.map((x) => r3(kind === "direct" ? f(x) / g(x) : f(x) * g(x)))]]} />
      <p className="text-sm muted">الصف الأخير ثابت دائماً ويساوي ث: هذا ما يميز التناسب.</p>
      <div className="rounded-xl bg-brand-50 p-3 dark:bg-brand-900/30">
        <MathText as="div" text={kind === "direct" ? `${y1} = ث × ${pw === 0.5 ? `\\sqrt{${x1}}` : pw === 1 ? x1 : `${x1}^${pw}`} ⇐ ث = ${r3(kFound)}` : `${y1} = \\frac{ث}{${pw === 0.5 ? `\\sqrt{${x1}}` : pw === 1 ? x1 : `${x1}^${pw}`}} ⇐ ث = ${r3(kFound)}`} />
        <MathText as="div" className="mt-1 font-bold" text={`عندما س = ${x2}: ص = ${Number.isFinite(y2) ? r3(y2) : "غير معرّفة"}`} />
      </div>
    </LabGrid>
  );
}

// ======================= الدوال =======================
type FlowStep = { label: string; inv: string; apply: (s: string) => string; applyInv: (s: string) => string };

/** بناء مخطط التدفق من شجرة العبارة (عندما يظهر س مرة واحدة) */
function flowSteps(n: Node): FlowStep[] | null {
  const hasX = (m: Node) => variablesOf(m).has("x");
  const cnt = (m: Node): number => (m.k === "var" ? (m.name === "x" ? 1 : 0) : m.k === "num" ? 0 : m.k === "neg" || m.k === "fact" ? cnt(m.a) : m.k === "bin" ? cnt(m.a) + cnt(m.b) : m.args.reduce((a, b) => a + cnt(b), 0));
  if (cnt(n) !== 1) return null;
  const steps: FlowStep[] = [];
  const walk = (m: Node): boolean => {
    if (m.k === "var") return true;
    if (m.k === "neg") { if (!walk(m.a)) return false; steps.push({ label: "×(-1)", inv: "×(-1)", apply: (s) => `-(${s})`, applyInv: (s) => `-(${s})` }); return true; }
    if (m.k === "bin") {
      const left = hasX(m.a);
      const other = left ? m.b : m.a;
      if (hasX(other)) return false;
      const c = nodeToText(other);
      const cs = `(${other.k === "num" ? fmt(other.v) : nodeToTextPlain(other)})`;
      if (!walk(left ? m.a : m.b)) return false;
      switch (m.op) {
        case "+": steps.push({ label: `+${c}`, inv: `-${c}`, apply: (s) => `${s}+${cs}`, applyInv: (s) => `${s}-${cs}` }); return true;
        case "-":
          if (left) steps.push({ label: `-${c}`, inv: `+${c}`, apply: (s) => `${s}-${cs}`, applyInv: (s) => `${s}+${cs}` });
          else steps.push({ label: `${c} - □`, inv: `${c} - □`, apply: (s) => `${cs}-(${s})`, applyInv: (s) => `${cs}-(${s})` });
          return true;
        case "*": steps.push({ label: `×${c}`, inv: `÷${c}`, apply: (s) => `(${s})*${cs}`, applyInv: (s) => `(${s})/${cs}` }); return true;
        case "/":
          if (left) steps.push({ label: `÷${c}`, inv: `×${c}`, apply: (s) => `(${s})/${cs}`, applyInv: (s) => `(${s})*${cs}` });
          else steps.push({ label: `${c} ÷ □`, inv: `${c} ÷ □`, apply: (s) => `${cs}/(${s})`, applyInv: (s) => `${cs}/(${s})` });
          return true;
        case "^":
          if (left && other.k === "num" && other.v === 3) { steps.push({ label: "تكعيب", inv: "الجذر التكعيبي", apply: (s) => `(${s})^3`, applyInv: (s) => `cbrt(${s})` }); return true; }
          return false;
      }
    }
    return false;
  };
  return walk(n) ? steps : null;
}

function nodeToTextPlain(n: Node): string {
  // صيغة قابلة للتحليل من جديد (بالحروف العربية)
  return nodeToText(n).replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/×/g, "*").replace(/\^\{([^{}]*)\}/g, "^($1)");
}

export function FunctionsLab() {
  const [fSrc, setF] = useState("2س + 5");
  const [gSrc, setG] = useState("س^2");
  const [x, setX] = useState(4);
  const [range, setRange] = useState<[number, number]>([-4, 4]);
  const parsed = useMemo(() => {
    const one = (s: string) => { try { const n = parse(s); const vs = [...variablesOf(n)].filter((v) => v !== "x"); if (vs.length) throw new MathError("استخدم المتغير س فقط"); return { n, err: null }; } catch (e) { return { n: null, err: e instanceof MathError ? e.message : "صيغة غير صحيحة" }; } };
    return { f: one(fSrc), g: one(gSrc) };
  }, [fSrc, gSrc]);
  const F = parsed.f.n, G = parsed.g.n;
  const ev = (n: Node | null, v: number) => { if (!n) return NaN; try { return evaluate(n, { x: v }, { strict: true }); } catch { return NaN; } };
  const fx = ev(F, x), gx = ev(G, x);
  const fog = ev(F, gx), gof = ev(G, fx);
  const table = Array.from({ length: Math.min(13, range[1] - range[0] + 1) }, (_, i) => range[0] + i);
  const flow = F ? flowSteps(F) : null;
  let inverse: string | null = null;
  if (flow) { let s = "x"; for (const st of [...flow].reverse()) s = st.applyInv(s); try { inverse = nodeToText(parse(s.replace(/x/g, "س"))); } catch { inverse = null; } }
  const fy = (v: number) => ev(F, v);
  const ys = table.map(fy).filter(Number.isFinite);
  const yr: [number, number] = ys.length ? [Math.min(0, ...ys) - 1, Math.max(1, ...ys) + 1] : [-5, 5];
  return (
    <LabGrid controls={<>
      <label className="block"><span className="mb-1 block text-sm font-semibold">د(س) =</span><input className={`input ltr ${parsed.f.err ? "!border-bad-500" : ""}`} dir="ltr" value={fSrc} onChange={(e) => setF(e.target.value)} /></label>
      {parsed.f.err && <p className="text-xs text-bad-700">{parsed.f.err}</p>}
      <label className="block"><span className="mb-1 block text-sm font-semibold">ع(س) =</span><input className={`input ltr ${parsed.g.err ? "!border-bad-500" : ""}`} dir="ltr" value={gSrc} onChange={(e) => setG(e.target.value)} /></label>
      {parsed.g.err && <p className="text-xs text-bad-700">{parsed.g.err}</p>}
      <NumField label="المُدخلة س" value={x} onChange={setX} />
      <div className="grid grid-cols-2 gap-1.5"><NumField label="جدول القيم من" value={range[0]} onChange={(v) => setRange([Math.round(v), Math.max(Math.round(v), range[1])])} /><NumField label="إلى" value={range[1]} onChange={(v) => setRange([range[0], Math.max(range[0], Math.round(v))])} /></div>
    </>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={`د(${x})`} value={Number.isFinite(fx) ? fmt(fx) : "غير معرّفة"} />
        <Stat label={`ع(${x})`} value={Number.isFinite(gx) ? fmt(gx) : "غير معرّفة"} />
        <Stat label={`(د ∘ ع)(${x}) = د(ع(${x}))`} value={Number.isFinite(fog) ? fmt(fog) : "غير معرّفة"} />
        <Stat label={`(ع ∘ د)(${x}) = ع(د(${x}))`} value={Number.isFinite(gof) ? fmt(gof) : "غير معرّفة"} />
      </div>
      {F && G && (
        <div className="rounded-xl border line p-3 text-sm">
          <div><b>(د ∘ ع)(س) = </b><MathText text={(() => { try { return nodeToText(parse(`(${fSrc})`.replace(/س/g, `(${gSrc})`))); } catch { return "—"; } })()} /></div>
          <div className="mt-1"><b>(ع ∘ د)(س) = </b><MathText text={(() => { try { return nodeToText(parse(`(${gSrc})`.replace(/س/g, `(${fSrc})`))); } catch { return "—"; } })()} /></div>
          <p className="mt-1 text-xs muted">الدالة الأقرب إلى س تُطبَّق أولاً.</p>
        </div>
      )}
      <Plane x={[range[0] - 0.5, range[1] + 0.5]} y={yr} xLabel="س" yLabel="ص"
        curves={[...(F ? [{ expr: fSrc, color: "#2b7de9" }] : []), ...(G ? [{ expr: gSrc, color: "#0e9f6e", dashed: true }] : [])]}
        points={Number.isFinite(fx) ? [{ at: [x, fx], label: `(${x}، ${fmt(fx)})` }] : []} />
      <p className="text-xs muted">الأزرق: د(س) ، الأخضر المتقطع: ع(س)</p>
      <DataTable head={["س", ...table.map(String)]} rows={[["د(س)", ...table.map((v) => { const y = fy(v); return Number.isFinite(y) ? fmt(y, 3) : "—"; })], ["ع(س)", ...table.map((v) => { const y = ev(G, v); return Number.isFinite(y) ? fmt(y, 3) : "—"; })]]} />
      <div className="rounded-xl border line p-3">
        <div className="mb-2 font-bold">مخطط التدفق والدالة العكسية لـ د</div>
        {flow ? (<>
          <div className="flex flex-wrap items-center gap-1.5 text-sm"><span className="chip bg-black/5">س</span>{flow.map((s, i) => <React.Fragment key={i}><span>←</span><span className="chip bg-brand-50 text-brand-800"><MathText text={s.label} /></span></React.Fragment>)}<span>←</span><span className="chip bg-black/5">د(س)</span></div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm"><span className="chip bg-black/5">س</span>{[...flow].reverse().map((s, i) => <React.Fragment key={i}><span>←</span><span className="chip bg-ok-50 text-ok-700"><MathText text={s.inv} /></span></React.Fragment>)}<span>←</span><span className="chip bg-black/5"><MathText text="د^{-1}(س)" /></span></div>
          {inverse && <div className="mt-3 text-lg font-bold"><MathText text={`د^{-1}(س) = ${inverse}`} /></div>}
          {inverse && Number.isFinite(fx) && <p className="mt-1 text-sm muted">تحقّق: د^-1(د({x})) = <Num>{fmt(ev(parse(inverseSrc(flow)), fx))}</Num></p>}
        </>) : <p className="text-sm muted">مخطط التدفق متاح عندما يظهر س مرة واحدة فقط في الدالة (مثل 3س - 4 أو ‏(5 - س)/2). الدوال مثل س² ليس لها معكوس دالّي على كل الأعداد.</p>}
      </div>
    </LabGrid>
  );
}

function inverseSrc(flow: FlowStep[]): string {
  let s = "x";
  for (const st of [...flow].reverse()) s = st.applyInv(s);
  return s.replace(/x/g, "س");
}

