/**
 * دوال الإحصاء وفق طرق كتاب الطالب (الصف العاشر – الفصل الأول):
 * - موقع الربيع الأدنى = ¼(ن + 1)، الربيع الأعلى = ¾(ن + 1)؛ وإذا لم يكن الموقع عدداً صحيحاً
 *   يؤخذ الوسط الحسابي للقيمتين الواقعتين على جانبي الموقع (كتاب الطالب، الدرس 5-3).
 * - الوسط الحسابي التقديري للبيانات المجمعة باستخدام مراكز الفئات (الدرس 5-2).
 * - الفئة الوسيطية: الفئة التي يقع فيها موقع الوسيط (الدرس 5-2).
 * - كثافة التكرار = تكرار الفئة ÷ طول الفئة (الدرس 7-2).
 * - تقدير الوسيط من منحنى التكرار التراكمي عند ن ÷ 2 (الدرس 7-3).
 */

export function sorted(data: number[]): number[] {
  return [...data].sort((a, b) => a - b);
}

export function sum(data: number[]) {
  return data.reduce((a, b) => a + b, 0);
}

export function mean(data: number[]): number {
  if (!data.length) return NaN;
  return sum(data) / data.length;
}

/** القيمة في موقع (يبدأ من 1) في بيانات مرتبة؛ إذا كان الموقع غير صحيح يُؤخذ متوسط القيمتين المجاورتين */
export function valueAtPosition(s: number[], pos: number): number {
  if (!s.length) return NaN;
  if (pos <= 1) return s[0];
  if (pos >= s.length) return s[s.length - 1];
  if (Number.isInteger(pos)) return s[pos - 1];
  const lo = Math.floor(pos);
  return (s[lo - 1] + s[lo]) / 2;
}

export function median(data: number[]): number {
  const s = sorted(data);
  return valueAtPosition(s, (s.length + 1) / 2);
}

export function modes(data: number[]): number[] {
  const m = new Map<number, number>();
  for (const v of data) m.set(v, (m.get(v) ?? 0) + 1);
  const max = Math.max(...m.values());
  if (max <= 1 && data.length > 1) return []; // لا يوجد منوال
  return [...m.entries()].filter(([, c]) => c === max).map(([v]) => v).sort((a, b) => a - b);
}

export function range(data: number[]) {
  if (!data.length) return NaN;
  return Math.max(...data) - Math.min(...data);
}

export function quartiles(data: number[]) {
  const s = sorted(data);
  const n = s.length;
  const q1Pos = (n + 1) / 4;
  const q2Pos = (n + 1) / 2;
  const q3Pos = (3 * (n + 1)) / 4;
  const q1 = valueAtPosition(s, q1Pos);
  const q2 = valueAtPosition(s, q2Pos);
  const q3 = valueAtPosition(s, q3Pos);
  return { q1, q2, q3, iqr: q3 - q1, q1Pos, q2Pos, q3Pos, min: s[0], max: s[n - 1], sorted: s };
}

/** المئيني ذو الرتبة k: موقعه k(ن+1)/100 بنفس قاعدة الربيعات */
export function percentile(data: number[], k: number): number {
  const s = sorted(data);
  return valueAtPosition(s, (k * (s.length + 1)) / 100);
}

// ---------- الجداول التكرارية (بيانات منفصلة) ----------
export interface FreqRow { value: number; freq: number }

export function freqTableStats(rows: FreqRow[]) {
  const clean = rows.filter((r) => r.freq > 0).sort((a, b) => a.value - b.value);
  const n = sum(clean.map((r) => r.freq));
  const fx = sum(clean.map((r) => r.value * r.freq));
  const expanded: number[] = [];
  for (const r of clean) for (let i = 0; i < r.freq; i++) expanded.push(r.value);
  const maxF = Math.max(...clean.map((r) => r.freq));
  return {
    n,
    fx,
    mean: n ? fx / n : NaN,
    median: median(expanded),
    modes: clean.filter((r) => r.freq === maxF).map((r) => r.value),
    range: clean.length ? clean[clean.length - 1].value - clean[0].value : NaN,
  };
}

// ---------- البيانات المجمّعة في فئات ----------
export interface ClassRow { lower: number; upper: number; freq: number }

export function groupedStats(rows: ClassRow[]) {
  const n = sum(rows.map((r) => r.freq));
  const mids = rows.map((r) => (r.lower + r.upper) / 2);
  const fx = sum(rows.map((r, i) => r.freq * mids[i]));
  const maxF = Math.max(...rows.map((r) => r.freq));
  // الفئة الوسيطية: الفئة التي يقع فيها موقع الوسيط (ن+1)/2
  const medPos = (n + 1) / 2;
  let cum = 0;
  let medianClass = -1;
  const cumFreq: number[] = [];
  rows.forEach((r, i) => {
    cum += r.freq;
    cumFreq.push(cum);
    if (medianClass < 0 && cum >= medPos) medianClass = i;
  });
  const densities = rows.map((r) => r.freq / (r.upper - r.lower));
  const maxD = Math.max(...densities);
  return {
    n,
    mids,
    fx,
    estimatedMean: n ? fx / n : NaN,
    modalClass: rows.findIndex((r) => r.freq === maxF),
    /** عند اختلاف أطوال الفئات: الفئة المنوالية هي ذات أكبر كثافة تكرار */
    modalClassByDensity: densities.indexOf(maxD),
    medianClass,
    cumFreq,
    densities,
    estimatedRange: rows.length ? rows[rows.length - 1].upper - rows[0].lower : NaN,
  };
}

/** تقدير قيمة من منحنى التكرار التراكمي بالاستكمال الخطي بين النقاط (الحد الأعلى، التكرار التراكمي) */
export function readCumulativeCurve(rows: ClassRow[], targetCum: number): number {
  const pts: [number, number][] = [[rows[0].lower, 0]];
  let c = 0;
  for (const r of rows) { c += r.freq; pts.push([r.upper, c]); }
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (targetCum <= y1) {
      if (y1 === y0) return x0;
      return x0 + ((targetCum - y0) / (y1 - y0)) * (x1 - x0);
    }
  }
  return pts[pts.length - 1][0];
}

export function cumulativeEstimates(rows: ClassRow[]) {
  const n = sum(rows.map((r) => r.freq));
  const q1 = readCumulativeCurve(rows, n / 4);
  const med = readCumulativeCurve(rows, n / 2);
  const q3 = readCumulativeCurve(rows, (3 * n) / 4);
  return { n, q1, median: med, q3, iqr: q3 - q1 };
}

// ---------- بيانات بمتغيرين ----------
export function correlation(xs: number[], ys: number[]): number {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** وصف الارتباط بالمصطلحات الواردة في الكتاب */
export function describeCorrelation(r: number): string {
  const a = Math.abs(r);
  if (a < 0.3) return "لا يوجد ارتباط";
  const dir = r > 0 ? "موجب" : "سالب";
  return `ارتباط ${dir} ${a >= 0.7 ? "قوي" : "ضعيف"}`;
}

/** مستقيم المربعات الصغرى (إثرائي) — يمر بنقطة الوسط الحسابي (س̄، ص̄) */
export function bestFitLine(xs: number[], ys: number[]) {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const m = sxx ? sxy / sxx : 0;
  return { m, c: my - m * mx, mx, my };
}

export function round(v: number, dp = 2) {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
