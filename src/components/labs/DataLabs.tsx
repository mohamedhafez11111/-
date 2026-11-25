"use client";
import React, { useMemo, useState } from "react";
import { LabGrid, Slider, NumField, Stat } from "./ui";
import { MathText, Num } from "@/components/ui/MathText";
import { Icon } from "@/components/ui/Icon";
import { Tally, DataTable, StemLeaf } from "@/components/figures/Figure";
import { BarChart, PieChart, BoxPlot, Histogram, CumulativeCurve, PALETTE } from "@/components/figures/Charts";
import { Plane } from "@/components/figures/Plane";
import { toWesternDigits, toEasternDigits as E } from "@/lib/math/expr";
import * as S from "@/lib/math/stats";

const r2 = (v: number) => (Number.isFinite(v) ? Number(v.toFixed(2)) : NaN);

/** قراءة قائمة قيم من نص (يقبل الفواصل العربية والأرقام الهندية) */
export function parseList(text: string): { nums: number[]; words: string[]; allNumeric: boolean } {
  const parts = toWesternDigits(text).split(/[\s,،؛;]+/).map((x) => x.trim()).filter(Boolean);
  const nums = parts.map(Number).filter((n) => Number.isFinite(n));
  return { nums, words: parts, allNumeric: parts.length > 0 && nums.length === parts.length };
}

// ======================= منظّم البيانات =======================
export function DataOrganizerLab() {
  const [text, setText] = useState(E("3 5 1 6 3 2 4 3 6 5 1 3 2 6 4 3 5 6 2 1"));
  const [grouped, setGrouped] = useState(false);
  const [start, setStart] = useState(0);
  const [width, setWidth] = useState(10);
  const { nums, words, allNumeric } = parseList(text);
  const freq = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of allNumeric ? nums.map(String) : words) m.set(w, (m.get(w) ?? 0) + 1);
    const arr = [...m.entries()];
    if (allNumeric) arr.sort((a, b) => Number(a[0]) - Number(b[0]));
    return arr;
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const classes = useMemo(() => {
    if (!allNumeric || !nums.length) return [];
    const max = Math.max(...nums);
    const out: { lower: number; upper: number; freq: number }[] = [];
    for (let lo = start; lo <= max && out.length < 30; lo += width) out.push({ lower: lo, upper: lo + width, freq: nums.filter((v) => v >= lo && v < lo + width).length });
    return out;
  }, [text, start, width]); // eslint-disable-line react-hooks/exhaustive-deps
  const outside = allNumeric ? nums.filter((v) => v < start).length : 0;
  const integers = allNumeric && nums.every((v) => Number.isInteger(v) && v >= 0 && v < 1000);
  const stems = integers ? [...new Set(nums.map((v) => Math.floor(v / 10)))].sort((a, b) => a - b) : [];
  const fullStems = stems.length ? Array.from({ length: stems[stems.length - 1] - stems[0] + 1 }, (_, i) => stems[0] + i) : [];
  const leaves = fullStems.map((s) => nums.filter((v) => Math.floor(v / 10) === s).map((v) => v % 10).sort((a, b) => a - b));

  return (
    <LabGrid controls={<>
      <label className="block"><span className="mb-1 block text-sm font-semibold">البيانات الخام (افصل بمسافة أو فاصلة)</span>
        <textarea className="input min-h-[120px]" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <button className="chip bg-black/5 !py-1.5" onClick={() => setText(E("3 5 1 6 3 2 4 3 6 5 1 3 2 6 4 3 5 6 2 1"))}>رميات نرد</button>
        <button className="chip bg-black/5 !py-1.5" onClick={() => { setText(E("45 52 38 61 47 55 49 38 60 52 41 67 58 44 50")); setStart(30); setWidth(10); }}>درجات</button>
        <button className="chip bg-black/5 !py-1.5" onClick={() => setText("أحمر أزرق أحمر أخضر أزرق أحمر أصفر أزرق أحمر أخضر")}>ألوان (نوعية)</button>
      </div>
      {allNumeric && (
        <div className="rounded-xl border line p-3">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} className="h-5 w-5 accent-brand-600" /> تجميع في فئات</label>
          {grouped && <div className="grid grid-cols-2 gap-2"><NumField label="بداية أول فئة" value={start} onChange={setStart} /><NumField label="طول الفئة" value={width} onChange={(v) => setWidth(Math.max(0.1, v))} /></div>}
        </div>
      )}
    </>}>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="عدد القيم" value={words.length} />
        <Stat label="نوع البيانات" value={allNumeric ? (nums.every(Number.isInteger) ? "عددية (قد تكون منفصلة)" : "عددية (متصلة غالباً)") : "نوعية"} />
        <Stat label="مجموع التكرارات" value={grouped ? classes.reduce((a, c) => a + c.freq, 0) : words.length} />
      </div>
      {!grouped ? (
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead><tr className="bg-brand-50 dark:bg-brand-900/40"><th className="border line p-2">القيمة</th><th className="border line p-2">علامات العد</th><th className="border line p-2">التكرار</th></tr></thead>
            <tbody>{freq.map(([v, f]) => <tr key={v}><td className="border line p-2 font-bold"><Num>{v}</Num></td><td className="border line p-2"><Tally n={f} /></td><td className="border line p-2"><Num>{f}</Num></td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <>
          <DataTable head={["الفئة", "علامات العد", "التكرار"]} rows={classes.map((c) => [`${c.lower} \\le س < ${c.upper}`, `@tally:${c.freq}`, c.freq])} />
          {outside > 0 && <p className="text-sm text-warn-700">تنبيه: {outside} قيمة أصغر من بداية أول فئة ولم تُحسب.</p>}
        </>
      )}
      {integers && fullStems.length > 0 && fullStems.length <= 15 && (
        <div>
          <div className="mb-1 font-bold">مخطط الساق والورقة</div>
          <StemLeaf stems={fullStems} leaves={leaves} keyText={`${fullStems[0]} | ${leaves[0][0] ?? 0} تعني ${fullStems[0] * 10 + (leaves[0][0] ?? 0)}`} />
        </div>
      )}
    </LabGrid>
  );
}

// ======================= صانع التمثيلات =======================
type ChartKind = "bar" | "double" | "hbar" | "pie" | "line" | "pictogram";

export function ChartsLab() {
  const [rows, setRows] = useState([{ l: "كرة القدم", a: 12, b: 9 }, { l: "السباحة", a: 7, b: 10 }, { l: "كرة السلة", a: 5, b: 6 }, { l: "الجري", a: 6, b: 4 }]);
  const [kind, setKind] = useState<ChartKind>("bar");
  const [legend, setLegend] = useState<[string, string]>(["الصف التاسع", "الصف العاشر"]);
  const [symbolVal, setSymbolVal] = useState(2);
  const labels = rows.map((r) => r.l), A = rows.map((r) => r.a), B = rows.map((r) => r.b);
  const KINDS: [ChartKind, string][] = [["bar", "أعمدة رأسية"], ["hbar", "أعمدة أفقية"], ["double", "أعمدة مزدوجة"], ["pie", "مخطط دائري"], ["line", "خطوط بيانية"], ["pictogram", "مصوّرات"]];
  return (
    <LabGrid controls={<>
      <div className="grid grid-cols-2 gap-1.5">{KINDS.map(([k, t]) => <button key={k} className={`chip justify-center !py-2 ${kind === k ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setKind(k)}>{t}</button>)}</div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_70px_28px] items-center gap-1.5">
            <input className="input !min-h-[38px] text-sm" value={r.l} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, l: e.target.value } : x)))} aria-label="الفئة" />
            <input type="number" className="input !min-h-[38px] text-center text-sm" value={r.a} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, a: Math.max(0, Number(e.target.value)) } : x)))} aria-label="القيمة الأولى" />
            <input type="number" className="input !min-h-[38px] text-center text-sm" value={r.b} disabled={kind !== "double"} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, b: Math.max(0, Number(e.target.value)) } : x)))} aria-label="القيمة الثانية" />
            <button className="muted" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="حذف"><Icon name="trash" size={16} /></button>
          </div>
        ))}
        {rows.length < 10 && <button className="btn btn-ghost w-full !min-h-[38px] text-sm" onClick={() => setRows([...rows, { l: `فئة ${rows.length + 1}`, a: 5, b: 5 }])}><Icon name="plus" size={16} /> أضف صفاً</button>}
      </div>
      {kind === "double" && <div className="grid grid-cols-2 gap-1.5"><input className="input text-sm" value={legend[0]} onChange={(e) => setLegend([e.target.value, legend[1]])} /><input className="input text-sm" value={legend[1]} onChange={(e) => setLegend([legend[0], e.target.value])} /></div>}
      {kind === "pictogram" && <NumField label="كل رمز ⭐ يمثل" value={symbolVal} onChange={(v) => setSymbolVal(Math.max(1, v))} />}
    </>}>
      <div className="rounded-xl border line p-3">
        {kind === "bar" && <BarChart labels={labels} values={A} />}
        {kind === "hbar" && <BarChart labels={labels} values={A} horizontal />}
        {kind === "double" && <BarChart labels={labels} values={A} values2={B} legend={legend} />}
        {kind === "pie" && <PieChart labels={labels} values={A} />}
        {kind === "line" && <Plane x={[1, Math.max(2, rows.length)]} y={[0, Math.max(1, ...A) * 1.2]} step={[1, undefined as unknown as number]} xLabel="الترتيب الزمني" curves={[{ points: A.map((v, i) => [i + 1, v]) }]} points={A.map((v, i) => ({ at: [i + 1, v] as [number, number], label: labels[i] }))} />}
        {kind === "pictogram" && (
          <div className="space-y-2">
            {rows.map((r, i) => {
              const full = Math.floor(r.a / symbolVal), part = (r.a % symbolVal) / symbolVal;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm font-semibold">{r.l}</span>
                  <span className="text-xl tracking-wider">{"⭐".repeat(full)}{part > 0 && <span className="inline-block overflow-hidden align-bottom" style={{ width: `${part * 1.25}em` }}>⭐</span>}</span>
                </div>
              );
            })}
            <p className="text-sm muted">المفتاح: ⭐ = <Num>{symbolVal}</Num></p>
          </div>
        )}
      </div>
      {kind === "pie" && (
        <DataTable head={["الفئة", "التكرار", "الزاوية = التكرار ÷ المجموع × 360"]} rows={rows.map((r) => [r.l, r.a, `${r2((r.a / (A.reduce((x, y) => x + y, 0) || 1)) * 360)}°`])} />
      )}
    </LabGrid>
  );
}

// ======================= المقاييس الإحصائية =======================
export function StatsMeasuresLab() {
  const [mode, setMode] = useState<"raw" | "freq" | "grouped">("raw");
  const [text, setText] = useState(E("12 15 11 15 18 14 13"));
  const [freqRows, setFreqRows] = useState([{ value: 0, freq: 4 }, { value: 1, freq: 7 }, { value: 2, freq: 5 }, { value: 3, freq: 3 }, { value: 4, freq: 1 }]);
  const [groups, setGroups] = useState([{ lower: 120, upper: 130, freq: 12 }, { lower: 130, upper: 140, freq: 16 }, { lower: 140, upper: 150, freq: 38 }, { lower: 150, upper: 160, freq: 24 }, { lower: 160, upper: 170, freq: 10 }]);
  const { nums } = parseList(text);
  const sorted = S.sorted(nums);
  const md = S.modes(nums);
  const fs = S.freqTableStats(freqRows);
  const gs = S.groupedStats(groups);

  return (
    <LabGrid controls={<>
      <div className="grid grid-cols-3 gap-1">
        {([["raw", "بيانات"], ["freq", "جدول تكراري"], ["grouped", "فئات"]] as const).map(([k, t]) => <button key={k} className={`chip justify-center !py-2 ${mode === k ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode(k)}>{t}</button>)}
      </div>
      {mode === "raw" && (<>
        <textarea className="input min-h-[100px]" value={text} onChange={(e) => setText(e.target.value)} aria-label="البيانات" />
        <button className="btn btn-soft w-full !min-h-[40px] text-sm" onClick={() => setText(text + " " + E(String(Math.max(...nums, 0) * 3 || 100)))}>أضف قيمة متطرفة</button>
      </>)}
      {mode === "freq" && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_1fr_28px] gap-1.5 text-xs font-semibold muted"><span>القيمة</span><span>التكرار</span><span /></div>
          {freqRows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_28px] gap-1.5">
              <input type="number" className="input !min-h-[38px] text-center" value={r.value} onChange={(e) => setFreqRows(freqRows.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)))} aria-label="القيمة" />
              <input type="number" className="input !min-h-[38px] text-center" value={r.freq} min={0} onChange={(e) => setFreqRows(freqRows.map((x, j) => (j === i ? { ...x, freq: Math.max(0, Math.round(Number(e.target.value))) } : x)))} aria-label="التكرار" />
              <button className="muted" onClick={() => setFreqRows(freqRows.filter((_, j) => j !== i))} aria-label="حذف"><Icon name="trash" size={16} /></button>
            </div>
          ))}
          <button className="btn btn-ghost w-full !min-h-[38px] text-sm" onClick={() => setFreqRows([...freqRows, { value: (freqRows[freqRows.length - 1]?.value ?? 0) + 1, freq: 1 }])}><Icon name="plus" size={16} /> أضف صفاً</button>
        </div>
      )}
      {mode === "grouped" && <ClassEditor rows={groups} onChange={setGroups} />}
    </>}>
      {mode === "raw" && (
        nums.length === 0 ? <p className="muted">أدخل بيانات عددية.</p> : <>
          <div className="rounded-xl border line p-3 text-sm"><b>البيانات مرتّبة: </b><Num>{sorted.join("، ")}</Num> <span className="muted">(ن = <Num>{nums.length}</Num>)</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="الوسط الحسابي" value={r2(S.mean(nums))} hint={`${r2(S.sum(nums))} ÷ ${nums.length}`} />
            <Stat label="الوسيط" value={S.median(nums)} hint={`الموقع ${(nums.length + 1) / 2}`} />
            <Stat label="المنوال" value={md.length ? md.join("، ") : "لا يوجد"} />
            <Stat label="المدى" value={r2(S.range(nums))} hint={`${sorted[sorted.length - 1]} - ${sorted[0]}`} />
          </div>
          <p className="text-sm muted">جرّب إضافة قيمة متطرفة: لاحظ أن الوسط الحسابي يتغير كثيراً، بينما يتغير الوسيط قليلاً.</p>
        </>
      )}
      {mode === "freq" && (<>
        <DataTable head={["القيمة (س)", "التكرار (ت)", "س × ت", "التكرار التراكمي"]} rows={[...freqRows.filter((r) => r.freq > 0).sort((a, b) => a.value - b.value).reduce<{ rows: (string | number)[][]; c: number }>((acc, r) => { acc.c += r.freq; acc.rows.push([r.value, r.freq, r2(r.value * r.freq), acc.c]); return acc; }, { rows: [], c: 0 }).rows, ["المجموع", fs.n, r2(fs.fx), ""]]} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="الوسط" value={r2(fs.mean)} hint={`${r2(fs.fx)} ÷ ${fs.n}`} />
          <Stat label="الوسيط" value={fs.median} hint={`الموقع ${(fs.n + 1) / 2}`} />
          <Stat label="المنوال" value={fs.modes.join("، ")} />
          <Stat label="المدى" value={fs.range} />
        </div>
      </>)}
      {mode === "grouped" && (<>
        <DataTable head={["الفئة", "التكرار (ت)", "مركز الفئة (م)", "ت × م", "التكرار التراكمي"]} rows={[...groups.map((g, i) => [`${g.lower} \\le س < ${g.upper}`, g.freq, gs.mids[i], r2(g.freq * gs.mids[i]), gs.cumFreq[i]]), ["المجموع", gs.n, "", r2(gs.fx), ""]]} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="الوسط التقديري" value={r2(gs.estimatedMean)} hint={`${r2(gs.fx)} ÷ ${gs.n}`} />
          <Stat label="الفئة المنوالية" value={gs.modalClass >= 0 ? `${groups[gs.modalClass].lower} \\le س < ${groups[gs.modalClass].upper}` : "—"} />
          <Stat label="الفئة الوسيطية" value={gs.medianClass >= 0 ? `${groups[gs.medianClass].lower} \\le س < ${groups[gs.medianClass].upper}` : "—"} hint={`موقع الوسيط ${(gs.n + 1) / 2}`} />
          <Stat label="المدى التقديري" value={gs.estimatedRange} />
        </div>
      </>)}
    </LabGrid>
  );
}

export function ClassEditor({ rows, onChange }: { rows: { lower: number; upper: number; freq: number }[]; onChange: (r: { lower: number; upper: number; freq: number }[]) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_1fr_1fr_28px] gap-1.5 text-xs font-semibold muted"><span>الحد الأدنى</span><span>الحد الأعلى</span><span>التكرار</span><span /></div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_28px] gap-1.5">
          {(["lower", "upper", "freq"] as const).map((k) => (
            <input key={k} type="number" className="input !min-h-[38px] !px-1 text-center" value={r[k]} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, [k]: k === "freq" ? Math.max(0, Math.round(Number(e.target.value))) : Number(e.target.value) } : x)))} aria-label={k} />
          ))}
          <button className="muted" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="حذف"><Icon name="trash" size={16} /></button>
        </div>
      ))}
      <button className="btn btn-ghost w-full !min-h-[38px] text-sm" onClick={() => { const last = rows[rows.length - 1]; const w = last ? last.upper - last.lower : 10; onChange([...rows, { lower: last?.upper ?? 0, upper: (last?.upper ?? 0) + w, freq: 1 }]); }}><Icon name="plus" size={16} /> أضف فئة</button>
      {rows.some((r) => r.upper <= r.lower) && <p className="text-xs text-bad-700">الحد الأعلى يجب أن يكون أكبر من الحد الأدنى.</p>}
    </div>
  );
}

// ======================= المخطط الصندوقي =======================
export function BoxPlotLab() {
  const [a, setA] = useState(E("8 9 10 14 14 15 19"));
  const [b, setB] = useState(E("1 5 6 8 8 10 11 12 12 13 14 16"));
  const [k, setK] = useState(80);
  const A = parseList(a).nums, B = parseList(b).nums;
  const qa = A.length ? S.quartiles(A) : null, qb = B.length ? S.quartiles(B) : null;
  const lo = Math.min(...A, ...B), hi = Math.max(...A, ...B);
  const pad = Math.max(1, (hi - lo) * 0.08);
  const posTxt = (p: number) => (Number.isInteger(p) ? `${p}` : `${p} (متوسط القيمتين ${Math.floor(p)} و ${Math.floor(p) + 1})`);
  return (
    <LabGrid controls={<>
      <label className="block"><span className="mb-1 block text-sm font-semibold">المجموعة (أ)</span><textarea className="input min-h-[70px]" value={a} onChange={(e) => setA(e.target.value)} /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">المجموعة (ب) (اختيارية)</span><textarea className="input min-h-[70px]" value={b} onChange={(e) => setB(e.target.value)} /></label>
      <Slider label="المئين ك" value={k} min={1} max={99} onChange={setK} />
    </>}>
      {qa && (
        <div className="rounded-xl border line p-2">
          <BoxPlot five={[qa.min, qa.q1, qa.q2, qa.q3, qa.max]} range={[lo - pad, hi + pad]} label="(أ)" second={qb ? { five: [qb.min, qb.q1, qb.q2, qb.q3, qb.max], label: "(ب)" } : undefined} />
        </div>
      )}
      {[["(أ)", A, qa], ["(ب)", B, qb]].map(([name, data, q]) => q ? (
        <div key={name as string} className="space-y-2 rounded-xl border line p-3">
          <div className="font-bold">المجموعة {name as string} مرتّبة (ن = <Num>{(data as number[]).length}</Num>): <span className="font-normal"><Num>{(q as ReturnType<typeof S.quartiles>).sorted.join("، ")}</Num></span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(() => { const Q = q as ReturnType<typeof S.quartiles>; return (<>
              <Stat label="الصغرى" value={Q.min} />
              <Stat label="ر_1" value={Q.q1} hint={`الموقع ${posTxt(Q.q1Pos)}`} />
              <Stat label="الوسيط" value={Q.q2} hint={`الموقع ${posTxt(Q.q2Pos)}`} />
              <Stat label="ر_3" value={Q.q3} hint={`الموقع ${posTxt(Q.q3Pos)}`} />
              <Stat label="العظمى" value={Q.max} />
              <Stat label="المدى الربيعي" value={r2(Q.iqr)} />
              <Stat label="المدى" value={r2(Q.max - Q.min)} />
              <Stat label={`المئين ${k}`} value={r2(S.percentile(data as number[], k))} hint={`الموقع ${r2((k * ((data as number[]).length + 1)) / 100)}`} />
            </>); })()}
          </div>
        </div>
      ) : null)}
      {qa && qb && (
        <div className="rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-900/30">
          <b>مقارنة: </b>{qa.q2 > qb.q2 ? "وسيط (أ) أكبر، فقيمها أكبر عموماً." : qa.q2 < qb.q2 ? "وسيط (ب) أكبر، فقيمها أكبر عموماً." : "الوسيطان متساويان."} {qa.iqr < qb.iqr ? "والمدى الربيعي لـ (أ) أصغر، فهي أكثر ثباتاً." : qa.iqr > qb.iqr ? "والمدى الربيعي لـ (ب) أصغر، فهي أكثر ثباتاً." : "والمديان الربيعيان متساويان."}
        </div>
      )}
      <p className="text-xs muted">تُحسب الربيعات بطريقة كتاب الطالب: الموقع ¼(ن+1) و ¾(ن+1)، وإذا لم يكن الموقع عدداً صحيحاً يؤخذ متوسط القيمتين على جانبيه.</p>
    </LabGrid>
  );
}

// ======================= مخطط الانتشار =======================
export function ScatterLab() {
  const [pts, setPts] = useState<[number, number][]>([[31, 65.9], [22, 46.7], [10, 17.1], [0, 4.5], [3, 2.3], [21, 40.1], [32, 65.7], [12, 21.2], [18, 55.6], [4, 12.3]]);
  const [showLine, setShowLine] = useState(false);
  const [est, setEst] = useState(25);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const r = pts.length >= 3 ? S.correlation(xs, ys) : 0;
  const bf = pts.length >= 2 ? S.bestFitLine(xs, ys) : null;
  const inRange = est >= Math.min(...xs) && est <= Math.max(...xs);
  return (
    <LabGrid controls={<>
      <p className="text-sm muted">انقر على المستوى لإضافة نقطة، واسحب النقاط لتحريكها.</p>
      <div className="flex flex-wrap gap-1.5">
        <button className="btn btn-ghost !min-h-[38px] text-sm" onClick={() => setPts([])}>مسح النقاط</button>
        <button className="btn btn-ghost !min-h-[38px] text-sm" onClick={() => setPts(Array.from({ length: 12 }, (_, i) => [i * 3, Math.max(0, 70 - i * 5 + (Math.random() - 0.5) * 12)]))}>ارتباط سالب</button>
        <button className="btn btn-ghost !min-h-[38px] text-sm" onClick={() => setPts(Array.from({ length: 12 }, () => [Math.random() * 35, Math.random() * 70]))}>بلا ارتباط</button>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={showLine} onChange={(e) => setShowLine(e.target.checked)} /> أظهر المستقيم الأفضل تمثيلاً (إثرائي)</label>
      {showLine && bf && <Slider label="قدّر ص عندما س =" value={est} min={-5} max={45} step={0.5} onChange={setEst} />}
    </>}>
      <Plane x={[-2, 40]} y={[-5, 80]} xLabel="س" yLabel="ص" onClick={(p) => setPts([...pts, [Number(p[0].toFixed(1)), Number(p[1].toFixed(1))]])}
        curves={showLine && bf ? [{ expr: `(${bf.m})*x+(${bf.c})`, color: "#ea580c", dashed: true }] : []}
        points={showLine && bf ? [{ at: [est, bf.m * est + bf.c], color: inRange ? "#16a34a" : "#dc2626", label: `(${est}، ${r2(bf.m * est + bf.c)})` }] : []}
        drag={pts.map((p, i) => ({ id: "p" + i, at: p, color: "#2b7de9", onMove: (q) => setPts(pts.map((x, j) => (j === i ? [Number(q[0].toFixed(1)), Number(q[1].toFixed(1))] : x))) }))} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="عدد النقاط" value={pts.length} />
        <Stat label="وصف الارتباط" value={pts.length >= 3 ? S.describeCorrelation(r) : "أضف نقاطاً"} />
        <Stat label="قوة الارتباط (معامل إثرائي)" value={pts.length >= 3 ? r2(r) : "—"} hint="خارج المنهج: قيمة بين -1 و 1" />
      </div>
      {showLine && bf && (
        <div className={`rounded-xl p-3 text-sm ${inRange ? "bg-ok-50 text-ok-700" : "bg-bad-50 text-bad-700"}`}>
          {inRange ? "التقدير ضمن مدى البيانات، فهو مقبول." : "تحذير: هذه القيمة خارج مدى البيانات؛ التقدير غير موثوق (القاعدة الذهبية)."}
          <div className="mt-1 text-xs">المستقيم المعروض محسوب بطريقة المربعات الصغرى ويمر بنقطة الوسط (<Num>{`${r2(bf.mx)}، ${r2(bf.my)}`}</Num>). في الكتاب يُرسم المستقيم بالنظر.</div>
        </div>
      )}
    </LabGrid>
  );
}

// ======================= المدرج التكراري =======================
export function HistogramLab() {
  const [rows, setRows] = useState([{ lower: 100, upper: 200, freq: 18 }, { lower: 200, upper: 250, freq: 32 }, { lower: 250, upper: 300, freq: 31 }, { lower: 300, upper: 350, freq: 21 }, { lower: 350, upper: 400, freq: 20 }, { lower: 400, upper: 500, freq: 18 }]);
  const widths = rows.map((r) => r.upper - r.lower);
  const unequal = new Set(widths).size > 1;
  const [forceFreq, setForceFreq] = useState(false);
  const density = unequal && !forceFreq;
  const dens = rows.map((r) => r.freq / (r.upper - r.lower));
  const g = S.groupedStats(rows);
  const valid = rows.length > 0 && rows.every((r) => r.upper > r.lower);
  return (
    <LabGrid controls={<>
      <ClassEditor rows={rows} onChange={setRows} />
      {unequal && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={forceFreq} onChange={(e) => setForceFreq(e.target.checked)} /> ارسم التكرار بدل الكثافة (لترى لماذا يكون ذلك مضللاً)</label>}
    </>}>
      {valid && <div className="rounded-xl border line p-2"><Histogram classes={rows} density={density} /></div>}
      {forceFreq && unequal && <p className="rounded-lg bg-warn-50 p-2 text-sm text-warn-700">الرسم الآن مضلل: الفئات العريضة تبدو أكبر مما هي. مع الفئات غير المتساوية نرسم كثافة التكرار.</p>}
      <DataTable head={["الفئة", "التكرار", "طول الفئة", "كثافة التكرار = التكرار ÷ الطول"]} rows={rows.map((r, i) => [`${r.lower} \\le س < ${r.upper}`, r.freq, widths[i], r2(dens[i])])} />
      <div className="grid grid-cols-2 gap-2">
        <Stat label="الفئات" value={unequal ? "غير متساوية ⇐ المحور الرأسي: كثافة التكرار" : "متساوية ⇐ المحور الرأسي: التكرار"} />
        <Stat label="الفئة المنوالية" value={valid ? (() => { const i = unequal ? g.modalClassByDensity : g.modalClass; return `${rows[i].lower} \\le س < ${rows[i].upper}`; })() : "—"} hint={unequal ? "أكبر كثافة تكرار" : "أكبر تكرار"} />
      </div>
    </LabGrid>
  );
}

// ======================= التكرار التراكمي =======================
export function CumulativeLab() {
  const [rows, setRows] = useState([{ lower: 0, upper: 10, freq: 3 }, { lower: 10, upper: 20, freq: 7 }, { lower: 20, upper: 30, freq: 13 }, { lower: 30, upper: 40, freq: 29 }, { lower: 40, upper: 50, freq: 44 }, { lower: 50, upper: 60, freq: 65 }, { lower: 60, upper: 70, freq: 70 }, { lower: 70, upper: 80, freq: 49 }, { lower: 80, upper: 90, freq: 14 }, { lower: 90, upper: 100, freq: 6 }]);
  const [k, setK] = useState(50);
  const valid = rows.length > 0 && rows.every((r) => r.upper > r.lower);
  const est = valid ? S.cumulativeEstimates(rows) : null;
  const n = est?.n ?? 0;
  const target = (k / 100) * n;
  const pk = valid ? S.readCumulativeCurve(rows, target) : NaN;
  let c = 0;
  return (
    <LabGrid controls={<>
      <ClassEditor rows={rows} onChange={setRows} />
      <Slider label="المئين ك" value={k} min={1} max={99} onChange={setK} />
    </>}>
      {valid && <div className="rounded-xl border line p-2"><CumulativeCurve classes={rows} xLabel="القيمة" marks={[target]} /></div>}
      <DataTable head={["الحد الأعلى", "التكرار", "التكرار التراكمي"]} rows={rows.map((r) => { c += r.freq; return [`أقل من ${r.upper}`, r.freq, c]; })} />
      {est && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="ن" value={n} />
          <Stat label="الوسيط (عند ن÷2)" value={r2(est.median)} hint={`ن÷2 = ${n / 2}`} />
          <Stat label="ر_1 (عند ن÷4)" value={r2(est.q1)} />
          <Stat label="ر_3 (عند 3ن÷4)" value={r2(est.q3)} />
          <Stat label="المدى الربيعي" value={r2(est.iqr)} />
          <Stat label={`المئين ${k}`} value={r2(pk)} hint={`عند ${r2(target)} على المحور الرأسي`} />
        </div>
      )}
      <p className="text-xs muted">القيم المحسوبة هنا بالاستكمال الخطي بين النقاط، وقد تختلف قليلاً عن قراءتك من منحنى أملس مرسوم باليد.</p>
    </LabGrid>
  );
}

export { PALETTE };
