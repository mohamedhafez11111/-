"use client";
import React, { useMemo, useState } from "react";
import { Plane, clipHalfPlane, satisfies, type Ineq } from "@/components/figures/Plane";
import { LabGrid, Slider, NumField, Stat, IneqEditor, ineqText } from "./ui";
import { MathText, Num } from "@/components/ui/MathText";
import { compileFn, parse } from "@/lib/math/expr";
import { Icon } from "@/components/ui/Icon";

type Pt = [number, number];
const r2 = (v: number) => Number(v.toFixed(2));

// ======================= التحويل =======================
const PRESETS = [
  { name: "ريال عُماني ← دولار أمريكي", from: "ريال", to: "دولار", rate: 2.6, offset: 0, max: 100 },
  { name: "ميل ← كيلومتر", from: "ميل", to: "كم", rate: 1.6, offset: 0, max: 50 },
  { name: "كيلوغرام ← رطل", from: "كغم", to: "رطل", rate: 2.2, offset: 0, max: 50 },
  { name: "درجة سيليزية ← فهرنهايتية", from: "°س", to: "°ف", rate: 1.8, offset: 32, max: 100 },
];

export function ConversionLab() {
  const [pi, setPi] = useState(0);
  const P = PRESETS[pi];
  const [rate, setRate] = useState(P.rate);
  const [offset, setOffset] = useState(P.offset);
  const [x, setX] = useState(P.max / 2);
  const [input, setInput] = useState("");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const y = rate * x + offset;
  const ymax = Math.ceil((rate * P.max + offset) / 10) * 10;
  const conv = Number(input);
  const result = input === "" || !Number.isFinite(conv) ? null : dir === "fwd" ? rate * conv + offset : (conv - offset) / rate;

  return (
    <LabGrid controls={<>
      <label className="block"><span className="mb-1 block text-sm font-semibold">نوع التحويل</span>
        <select className="input" value={pi} onChange={(e) => { const i = Number(e.target.value); setPi(i); setRate(PRESETS[i].rate); setOffset(PRESETS[i].offset); setX(PRESETS[i].max / 2); }}>
          {PRESETS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
        </select>
      </label>
      <Slider label={`المعدل (سعر الصرف): 1 ${P.from} = ? ${P.to}`} value={rate} min={0.2} max={5} step={0.05} onChange={setRate} />
      {P.offset !== 0 && <Slider label="المقطع الصادي (الإزاحة)" value={offset} min={0} max={60} onChange={setOffset} />}
      <div className="rounded-xl border line p-3">
        <div className="mb-2 flex gap-1">
          <button className={`chip flex-1 justify-center !py-2 ${dir === "fwd" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setDir("fwd")}>{P.from} ← {P.to}</button>
          <button className={`chip flex-1 justify-center !py-2 ${dir === "back" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setDir("back")}>{P.to} ← {P.from}</button>
        </div>
        <input className="input ltr text-center" dir="ltr" inputMode="decimal" placeholder={dir === "fwd" ? P.from : P.to} value={input} onChange={(e) => setInput(e.target.value)} />
        {result !== null && <div className="mt-2 text-center text-lg font-bold"><Num>{`${input} ${dir === "fwd" ? P.from : P.to} = ${r2(result)} ${dir === "fwd" ? P.to : P.from}`}</Num></div>}
      </div>
    </>}>
      <Plane x={[0, P.max]} y={[0, ymax]} xLabel={P.from} yLabel={P.to} curves={[{ expr: `${rate}*x+${offset}` }]}
        drag={[{ id: "p", at: [x, y], label: `(${r2(x)}، ${r2(y)})`, onMove: (p) => setX(Math.max(0, Math.min(P.max, p[0]))), constrain: (p) => [p[0], rate * p[0] + offset] }]}
        overlay={(s) => (
          <g stroke="#ea580c" strokeDasharray="5 4" strokeWidth={1.6}>
            <line x1={s.X(x)} x2={s.X(x)} y1={s.Y(0)} y2={s.Y(y)} />
            <line x1={s.X(0)} x2={s.X(x)} y1={s.Y(y)} y2={s.Y(y)} />
          </g>
        )} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label={P.from} value={r2(x)} />
        <Stat label={P.to} value={r2(y)} />
        <Stat label="هل يمر بنقطة الأصل؟" value={offset === 0 ? "نعم (تناسب طردي)" : "لا"} />
      </div>
      <p className="text-sm muted">اسحب النقطة البرتقالية على المستقيم، وتتبّع الخطين المتقطعين إلى المحورين لقراءة القيمتين المتكافئتين.</p>
    </LabGrid>
  );
}

// ======================= المناطق =======================
function feasiblePolygon(regions: Ineq[], box: Pt[]): Pt[] {
  let poly = box;
  for (const q of regions) poly = clipHalfPlane(poly, q);
  // إزالة النقاط المكررة
  const out: Pt[] = [];
  for (const p of poly) if (!out.some((o) => Math.abs(o[0] - p[0]) < 1e-6 && Math.abs(o[1] - p[1]) < 1e-6)) out.push(p);
  return out;
}

function lineIntersections(regions: Ineq[]): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
    const A = regions[i], B = regions[j];
    const det = A.a * B.b - A.b * B.a;
    if (Math.abs(det) < 1e-12) continue;
    pts.push([(A.c * B.b - A.b * B.c) / det, (A.a * B.c - A.c * B.a) / det]);
  }
  return pts;
}

export function RegionsLab() {
  const [regions, setRegions] = useState<Ineq[]>([{ a: 2, b: 3, op: "<=", c: 12 }, { a: 0, b: 1, op: ">=", c: 0 }, { a: 1, b: 0, op: ">", c: 0 }]);
  const [mode, setMode] = useState<"unwanted" | "wanted">("unwanted");
  const [test, setTest] = useState<Pt>([1, 1]);
  const ints = lineIntersections(regions);
  return (
    <LabGrid controls={<>
      <IneqEditor list={regions} onChange={setRegions} />
      <div className="flex gap-1">
        <button className={`chip flex-1 justify-center !py-2 ${mode === "unwanted" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode("unwanted")}>ظلّل غير المطلوبة</button>
        <button className={`chip flex-1 justify-center !py-2 ${mode === "wanted" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode("wanted")}>ظلّل المطلوبة</button>
      </div>
    </>}>
      <Plane x={[-4, 8]} y={[-4, 8]} regions={regions} shadeMode={mode} onClick={(p) => setTest([r2(p[0]), r2(p[1])])}
        points={ints.filter((p) => Math.abs(p[0]) < 50 && Math.abs(p[1]) < 50).map((p) => ({ at: p, color: "#7c3aed", label: `(${r2(p[0])}، ${r2(p[1])})` }))}
        drag={[{ id: "t", at: test, color: regions.every((q) => satisfies(test, q)) ? "#16a34a" : "#dc2626", label: "اختبار", onMove: (p) => setTest([r2(p[0]), r2(p[1])]) }]} />
      <div className="rounded-xl border line p-3 text-sm">
        <div className="mb-1 font-bold">اختبار النقطة (<Num>{`${test[0]}، ${test[1]}`}</Num>): اسحبها أو انقر على المستوى</div>
        <ul className="space-y-1">
          {regions.map((q, i) => {
            const v = q.a * test[0] + q.b * test[1];
            const ok = satisfies(test, q);
            return <li key={i} className={ok ? "text-ok-700 dark:text-ok-50" : "text-bad-700 dark:text-bad-50"}>{ok ? "✔" : "✘"} <MathText text={`${ineqText(q)} : ${q.a}(${test[0]}) + ${q.b}(${test[1]}) = ${r2(v)}`} /></li>;
          })}
        </ul>
        <p className="mt-2 font-semibold">{regions.every((q) => satisfies(test, q)) ? "النقطة تقع في المنطقة المطلوبة." : "النقطة لا تقع في المنطقة المطلوبة."}</p>
      </div>
      <p className="text-xs muted">الخط المتقطع للرمزين &lt; و &gt;، والمتصل للرمزين ≤ و ≥. النقاط البنفسجية: نقاط تقاطع مستقيمات الحدود.</p>
    </LabGrid>
  );
}

// ======================= البرمجة الخطية =======================
export function LinearProgrammingLab() {
  const [regions, setRegions] = useState<Ineq[]>([{ a: 1, b: 0, op: ">=", c: 0 }, { a: 0, b: 1, op: ">=", c: 0 }, { a: 1, b: 1, op: "<=", c: 6 }, { a: 1, b: 2, op: "<=", c: 8 }]);
  const [oa, setOa] = useState(3);
  const [ob, setOb] = useState(2);
  const [k, setK] = useState(6);
  const BOX: Pt[] = [[-2, -2], [12, -2], [12, 12], [-2, 12]];
  const poly = useMemo(() => feasiblePolygon(regions, BOX), [regions]); // eslint-disable-line react-hooks/exhaustive-deps
  const onBox = (p: Pt) => Math.abs(p[0] - 12) < 1e-6 || Math.abs(p[1] - 12) < 1e-6 || Math.abs(p[0] + 2) < 1e-6 || Math.abs(p[1] + 2) < 1e-6;
  const unbounded = poly.some(onBox);
  const verts = poly.filter((p) => !onBox(p));
  const vals = verts.map((p) => oa * p[0] + ob * p[1]);
  const maxV = Math.max(...vals), minV = Math.min(...vals);
  const objExpr = ob !== 0 ? `((${k})-(${oa})*x)/(${ob})` : "";
  return (
    <LabGrid controls={<>
      <div className="font-semibold">القيود</div>
      <IneqEditor list={regions} onChange={setRegions} />
      <div className="rounded-xl border line p-3">
        <div className="mb-2 font-semibold">العبارة الهدف</div>
        <div className="grid grid-cols-2 gap-2">
          <NumField label="معامل س" value={oa} onChange={setOa} />
          <NumField label="معامل ص" value={ob} onChange={setOb} />
        </div>
        <div className="mt-2"><Slider label={`مستقيم الهدف: ${oa}س + ${ob}ص = جـ`} value={k} min={-10} max={60} step={0.5} onChange={setK} /></div>
      </div>
    </>}>
      <Plane x={[-1, 10]} y={[-1, 10]} regions={regions} shadeMode="unwanted"
        curves={objExpr ? [{ expr: objExpr, color: "#ea580c", width: 3 }] : []}
        points={verts.map((p, i) => ({ at: p, label: `(${r2(p[0])}، ${r2(p[1])})`, color: vals[i] === maxV ? "#16a34a" : vals[i] === minV ? "#7c3aed" : "#dc2626" }))} />
      {poly.length < 3 ? (
        <div className="rounded-xl bg-warn-50 p-3 text-warn-700">لا توجد منطقة تحقق جميع القيود (المنطقة الممكنة فارغة).</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead><tr className="bg-black/5 dark:bg-white/10"><th className="p-2">الرأس</th><th className="p-2"><MathText text={`${oa}س + ${ob}ص`} /></th><th className="p-2">ملاحظة</th></tr></thead>
            <tbody>
              {verts.map((p, i) => (
                <tr key={i} className="border-b line">
                  <td className="p-2"><Num>{`(${r2(p[0])}، ${r2(p[1])})`}</Num></td>
                  <td className="p-2 font-bold"><Num>{r2(vals[i])}</Num></td>
                  <td className="p-2">{vals[i] === maxV && !unbounded ? "أكبر قيمة" : vals[i] === minV ? "أصغر قيمة" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {unbounded && <p className="mt-2 text-sm text-warn-700">تنبيه: المنطقة غير محدودة (تمتد خارج الرسم)، لذا قد لا توجد قيمة عظمى أو صغرى للعبارة.</p>}
        </div>
      )}
      <p className="text-xs muted">حرّك المنزلق: المستقيم البرتقالي يتحرك موازياً لنفسه. آخر رأس يلمسه من المنطقة يعطي القيمة العظمى (أو الصغرى).</p>
    </LabGrid>
  );
}

// ======================= الميل =======================
const CURVES = [
  { label: "ص = س^2", expr: "x^2", x: [-4, 4] as Pt, y: [-2, 12] as Pt },
  { label: "ص = س^2 - 4س", expr: "x^2-4x", x: [-1, 6] as Pt, y: [-6, 8] as Pt },
  { label: "ص = \\frac{1}{4}س^3 - س", expr: "x^3/4-x", x: [-4, 4] as Pt, y: [-8, 8] as Pt },
  { label: "ص = \\frac{12}{س}", expr: "12/x", x: [0.5, 8] as Pt, y: [0, 16] as Pt },
];

export function GradientLab() {
  const [mode, setMode] = useState<"line" | "curve">("curve");
  const [A, setA] = useState<Pt>([1, 2]);
  const [B, setB] = useState<Pt>([4, 8]);
  const [ci, setCi] = useState(0);
  const [custom, setCustom] = useState("");
  const C = CURVES[ci];
  let expr = C.expr;
  let valid = true;
  if (custom.trim()) { try { parse(custom); expr = custom; } catch { valid = false; } }
  const f = useMemo(() => { try { return compileFn(expr); } catch { return (x: number) => NaN; } }, [expr]); // eslint-disable-line react-hooks/exhaustive-deps
  const [t, setT] = useState(2);
  const h = 1e-4;
  const slope = (f(t + h) - f(t - h)) / (2 * h);
  const yt = f(t);
  const lineSlope = B[0] !== A[0] ? (B[1] - A[1]) / (B[0] - A[0]) : NaN;
  const sx = A, sy = B;

  return (
    <LabGrid controls={<>
      <div className="flex gap-1">
        <button className={`chip flex-1 justify-center !py-2 ${mode === "line" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode("line")}>ميل مستقيم</button>
        <button className={`chip flex-1 justify-center !py-2 ${mode === "curve" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode("curve")}>ميل منحنى (المماس)</button>
      </div>
      {mode === "curve" ? (<>
        <label className="block"><span className="mb-1 block text-sm font-semibold">المنحنى</span>
          <select className="input" value={ci} onChange={(e) => { setCi(Number(e.target.value)); setCustom(""); setT(2); }}>{CURVES.map((c, i) => <option key={i} value={i}>{c.label.replace(/\\frac\{1\}\{4\}/, "¼").replace(/\\frac\{12\}\{س\}/, "12/س").replace("^2", "²").replace("^3", "³")}</option>)}</select>
        </label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">أو اكتب دالة بدلالة س</span>
          <input className={`input ltr ${valid ? "" : "!border-bad-500"}`} dir="ltr" placeholder="مثال: س^2 - 2س" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </label>
        <Slider label="الإحداثي س لنقطة التماس" value={t} min={C.x[0]} max={C.x[1]} step={0.1} onChange={setT} />
      </>) : <p className="text-sm muted">اسحب النقطتين أ و ب.</p>}
    </>}>
      {mode === "line" ? (
        <>
          <Plane x={[-2, 8]} y={[-2, 12]}
            curves={B[0] !== A[0] ? [{ expr: `(${lineSlope})*(x-(${A[0]}))+(${A[1]})` }] : []}
            overlay={(s) => (
              <g strokeWidth={2.5}>
                <line x1={s.X(sx[0])} y1={s.Y(sx[1])} x2={s.X(sy[0])} y2={s.Y(sx[1])} stroke="#0e9f6e" strokeDasharray="6 4" />
                <line x1={s.X(sy[0])} y1={s.Y(sx[1])} x2={s.X(sy[0])} y2={s.Y(sy[1])} stroke="#ea580c" strokeDasharray="6 4" />
              </g>
            )}
            drag={[
              { id: "a", at: A, label: "أ", onMove: (p) => setA([Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2]) },
              { id: "b", at: B, label: "ب", color: "#7c3aed", onMove: (p) => setB([Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2]) },
            ]} />
          <div className="grid grid-cols-3 gap-2">
            <Stat label="التغيّر في ص (رأسي)" value={r2(B[1] - A[1])} />
            <Stat label="التغيّر في س (أفقي)" value={r2(B[0] - A[0])} />
            <Stat label="الميل" value={Number.isFinite(lineSlope) ? `\\frac{${r2(B[1] - A[1])}}{${r2(B[0] - A[0])}} = ${r2(lineSlope)}` : "غير معرّف (مستقيم رأسي)"} />
          </div>
        </>
      ) : (
        <>
          <Plane x={C.x} y={C.y} curves={[{ expr }, ...(Number.isFinite(slope) && Number.isFinite(yt) ? [{ expr: `${slope}*(x-(${t}))+(${yt})`, color: "#ea580c", dashed: true }] : [])]}
            drag={Number.isFinite(yt) ? [{ id: "t", at: [t, yt], label: "نقطة التماس", onMove: (p) => setT(r2(p[0])), constrain: (p) => [p[0], f(p[0])] }] : []} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="نقطة التماس" value={Number.isFinite(yt) ? `(${r2(t)}، ${r2(yt)})` : "غير معرّفة"} />
            <Stat label="ميل المماس" value={Number.isFinite(slope) ? r2(slope) : "—"} hint="قيمة محسوبة بدقة للمقارنة مع تقديرك بالرسم" />
            <Stat label="نقطتان على المماس للتقدير" value={Number.isFinite(slope) ? `(${r2(t)}، ${r2(yt)}) و (${r2(t + 1)}، ${r2(yt + slope)})` : "—"} />
          </div>
          <p className="text-sm muted">في الكتاب نرسم المماس بالمسطرة ثم نقرأ نقطتين عليه؛ قارن تقديرك بالقيمة المحسوبة هنا.</p>
        </>
      )}
    </LabGrid>
  );
}

// ======================= الحركة =======================
interface Seg { dur: number; end: number }

export function MotionLab() {
  const [kind, setKind] = useState<"dt" | "vt">("vt");
  const [segs, setSegs] = useState<Seg[]>([{ dur: 10, end: 20 }, { dur: 30, end: 20 }, { dur: 15, end: 0 }]);
  const [dtSegs, setDtSegs] = useState<Seg[]>([{ dur: 0.75, end: 12 }, { dur: 0.25, end: 12 }, { dur: 0.5, end: 0 }]);
  const list = kind === "vt" ? segs : dtSegs;
  const setList = kind === "vt" ? setSegs : setDtSegs;
  const pts: Pt[] = [[0, 0]];
  let t = 0;
  for (const s of list) { t += s.dur; pts.push([t, s.end]); }
  const T = t || 1;
  const ymax = Math.max(1, ...pts.map((p) => p[1])) * 1.2;
  const rows = list.map((s, i) => {
    const [t0, y0] = pts[i];
    const slope = s.dur ? (s.end - y0) / s.dur : 0;
    const area = ((y0 + s.end) / 2) * s.dur;
    return { i, t0, t1: t0 + s.dur, y0, y1: s.end, slope, area };
  });
  const totalArea = rows.reduce((a, r) => a + r.area, 0);
  const dtTotalDist = rows.reduce((a, r) => a + Math.abs(r.y1 - r.y0), 0);
  const unitsT = kind === "vt" ? "ث" : "ساعة";
  const unitsY = kind === "vt" ? "م/ث" : "كم";

  return (
    <LabGrid controls={<>
      <div className="flex gap-1">
        <button className={`chip flex-1 justify-center !py-2 ${kind === "dt" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setKind("dt")}>المسافة-الزمن</button>
        <button className={`chip flex-1 justify-center !py-2 ${kind === "vt" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setKind("vt")}>السرعة-الزمن</button>
      </div>
      {list.map((s, i) => (
        <div key={i} className="rounded-xl border line p-2">
          <div className="mb-1 flex justify-between text-sm font-bold">المرحلة <Num>{i + 1}</Num><button className="muted" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="حذف المرحلة"><Icon name="trash" size={16} /></button></div>
          <div className="grid grid-cols-2 gap-2">
            <NumField label={`المدة (${unitsT})`} value={s.dur} step={kind === "vt" ? 1 : 0.25} onChange={(v) => setList(list.map((x, j) => (j === i ? { ...x, dur: Math.max(0, v) } : x)))} />
            <NumField label={kind === "vt" ? "السرعة في نهايتها (م/ث)" : "المسافة من البداية في نهايتها (كم)"} value={s.end} onChange={(v) => setList(list.map((x, j) => (j === i ? { ...x, end: Math.max(0, v) } : x)))} />
          </div>
        </div>
      ))}
      {list.length < 6 && <button className="btn btn-ghost w-full !min-h-[40px] text-sm" onClick={() => setList([...list, { dur: kind === "vt" ? 10 : 0.5, end: list[list.length - 1]?.end ?? 0 }])}><Icon name="plus" size={16} /> أضف مرحلة</button>}
    </>}>
      <Plane x={[0, T]} y={[0, ymax]} xLabel={`الزمن (${unitsT})`} yLabel={kind === "vt" ? "السرعة (م/ث)" : "المسافة (كم)"}
        under={(s) => kind === "vt" ? <polygon points={[...pts, [T, 0]].map((p) => `${s.X(p[0])},${s.Y(p[1])}`).join(" ")} fill="#0e9f6e" opacity={0.18} /> : null}
        curves={[{ points: pts, color: kind === "vt" ? "#ea580c" : "#2b7de9", width: 3 }]} />
      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead><tr className="bg-black/5 dark:bg-white/10"><th className="p-2">المرحلة</th><th className="p-2">من–إلى</th><th className="p-2">{kind === "vt" ? "التسارع (الميل)" : "السرعة (الميل)"}</th>{kind === "vt" && <th className="p-2">المسافة (المساحة)</th>}<th className="p-2">الوصف</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.i} className="border-b line">
                <td className="p-2"><Num>{r.i + 1}</Num></td>
                <td className="p-2"><Num>{`${r2(r.t0)}–${r2(r.t1)}`}</Num></td>
                <td className="p-2 font-bold"><MathText text={`${r2(r.slope)} ${kind === "vt" ? "م/ث^2" : "كم/ساعة"}`} /></td>
                {kind === "vt" && <td className="p-2"><Num>{`${r2(r.area)} م`}</Num></td>}
                <td className="p-2">{kind === "vt" ? (r.slope > 0 ? "تسارع" : r.slope < 0 ? "تباطؤ" : r.y0 === 0 ? "متوقف" : "سرعة ثابتة") : (r.slope > 0 ? "يبتعد" : r.slope < 0 ? "يعود" : "متوقف")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {kind === "vt" ? (<>
          <Stat label="المسافة الكلية = المساحة تحت المنحنى" value={`${r2(totalArea)} م`} />
          <Stat label="السرعة المتوسطة" value={`${r2(totalArea / T)} م/ث`} />
        </>) : (<>
          <Stat label="المسافة الكلية المقطوعة" value={`${r2(dtTotalDist)} كم`} />
          <Stat label="السرعة المتوسطة" value={`${r2(dtTotalDist / T)} كم/ساعة`} />
        </>)}
      </div>
      <p className="text-xs muted">الوحدات: {unitsT} و {unitsY}. {kind === "vt" ? "الميل = التسارع، والمساحة المظللة = المسافة." : "الميل = السرعة، والجزء الأفقي = توقف."}</p>
    </LabGrid>
  );
}

