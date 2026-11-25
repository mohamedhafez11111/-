/**
 * مولّدات أسئلة بقيم عشوائية مرتبطة بمهارات المنهج.
 * تُستخدم في الألعاب السريعة وفي «سؤال مشابه» بعد الخطأ.
 * كل سؤال مولَّد يُحسب جوابه برمجياً ولا يُكتب يدوياً.
 */
import type { Question } from "./types";
import { mean, median, range } from "@/lib/math/stats";

export type Rng = () => number;
export const rand: Rng = Math.random;

function ri(min: number, max: number, rng: Rng = rand) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick<T>(arr: T[], rng: Rng = rand): T {
  return arr[Math.floor(rng() * arr.length)];
}
function nz(min: number, max: number, rng: Rng = rand) {
  let v = 0;
  while (v === 0) v = ri(min, max, rng);
  return v;
}
function signed(v: number) {
  return v < 0 ? `- ${-v}` : `+ ${v}`;
}
let counter = 0;
const gid = (skill: string) => `gen-${skill}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** خيارات مشتتة عددية قريبة من الإجابة */
export function numericOptions(answer: number, wrongs: number[], rng: Rng = rand): { options: string[]; answer: number } {
  const set = new Set<number>([answer]);
  for (const w of wrongs) if (Number.isFinite(w) && set.size < 4) set.add(Number(w.toFixed(4)));
  let k = 1;
  while (set.size < 4) {
    set.add(answer + k * (rng() < 0.5 ? -1 : 1) * Math.max(1, Math.round(Math.abs(answer) * 0.1)));
    k++;
  }
  const arr = [...set].sort(() => rng() - 0.5);
  return { options: arr.map((v) => String(Number(v.toFixed(4)))), answer: arr.indexOf(answer) };
}

type Gen = (rng?: Rng) => Question;

export const GENERATORS: Record<string, Gen> = {
  "1-1.currency": (rng = rand) => {
    const omr = ri(2, 40, rng) * 5;
    const usd = Number((omr * 2.6).toFixed(2));
    const toUsd = rng() < 0.5;
    return toUsd
      ? { id: gid("1-1.currency"), lessonId: "1-1", skill: "1-1.currency", difficulty: 1, type: "numeric", prompt: `إذا كان 1 ريال عُماني = 2.6 دولار، فكم دولاراً تساوي ${omr} ريالاً؟`, answer: usd, tolerance: 0.01, unit: "دولار", explanation: `${omr} × 2.6 = ${usd}` }
      : { id: gid("1-1.currency"), lessonId: "1-1", skill: "1-1.currency", difficulty: 1, type: "numeric", prompt: `إذا كان 1 ريال عُماني = 2.6 دولار، فكم ريالاً يساوي ${usd} دولاراً؟`, answer: omr, tolerance: 0.01, unit: "ريال", explanation: `${usd} ÷ 2.6 = ${omr}` };
  },
  "1-4.line": (rng = rand) => {
    const x1 = ri(-5, 3, rng), dx = ri(1, 5, rng), m = pick([-3, -2, -1, 1, 2, 3, 4, 0.5, -0.5], rng);
    const y1 = ri(-5, 5, rng);
    const x2 = x1 + dx, y2 = y1 + m * dx;
    return { id: gid("1-4.line"), lessonId: "1-4", skill: "1-4.line", difficulty: 1, type: "numeric", prompt: `أوجد ميل المستقيم المار بالنقطتين (${x1}، ${y1}) و (${x2}، ${y2}).`, answer: m, explanation: `الميل = (${y2} - ${y1 < 0 ? `(${y1})` : y1}) ÷ (${x2} - ${x1 < 0 ? `(${x1})` : x1}) = ${y2 - y1} ÷ ${dx} = ${m}` };
  },
  "1-5.dt-speed": (rng = rand) => {
    const v = pick([4, 5, 6, 8, 10, 12, 15, 20], rng), t = pick([2, 3, 4, 5, 10, 20, 30], rng);
    return { id: gid("1-5.dt-speed"), lessonId: "1-5", skill: "1-5.dt-speed", difficulty: 1, type: "numeric", prompt: `قطع جسم ${v * t} م في ${t} ثانية بسرعة ثابتة. ما سرعته (م/ث)؟`, answer: v, unit: "م/ث", explanation: `${v * t} ÷ ${t} = ${v}` };
  },
  "1-5.vt-accel": (rng = rand) => {
    const a = pick([0.5, 1, 1.5, 2, 2.5, 3, 4], rng), t = pick([2, 4, 5, 6, 8, 10], rng), u = ri(0, 10, rng);
    const v = u + a * t;
    return { id: gid("1-5.vt-accel"), lessonId: "1-5", skill: "1-5.vt-accel", difficulty: 2, type: "numeric", prompt: `تزداد سرعة جسم بانتظام من ${u} م/ث إلى ${v} م/ث خلال ${t} ثوانٍ. ما التسارع (م/ث^2)؟`, answer: a, unit: "م/ث^2", explanation: `(${v} - ${u}) ÷ ${t} = ${a}` };
  },
  "1-3.vertices": (rng = rand) => {
    const pts: [number, number][] = [[0, 0], [ri(4, 8, rng), 0], [ri(2, 4, rng), ri(3, 5, rng)], [0, ri(4, 7, rng)]];
    const a = ri(1, 4, rng), b = ri(1, 4, rng);
    const vals = pts.map(([x, y]) => a * x + b * y);
    const max = Math.max(...vals);
    return { id: gid("1-3.vertices"), lessonId: "1-3", skill: "1-3.vertices", difficulty: 2, type: "numeric", prompt: `منطقة رؤوسها ${pts.map(([x, y]) => `(${x}، ${y})`).join(" ، ")}. ما أكبر قيمة للعبارة ${a === 1 ? "" : a}س + ${b === 1 ? "" : b}ص ؟`, answer: max, explanation: `القيم عند الرؤوس: ${vals.join(" ، ")} ⇐ الأكبر ${max}` };
  },
  "3-1.simplify": (rng = rand) => {
    const p = nz(-6, 6, rng);
    let q = nz(-6, 6, rng);
    let r = nz(-6, 6, rng);
    while (q === p) q = nz(-6, 6, rng);
    while (r === p || r === q) r = nz(-6, 6, rng);
    const sum = (u: number, v: number) => u + v;
    const quad = (u: number, v: number) => `س^2 ${signed(sum(u, v))}س ${signed(u * v)}`.replace("+ 0س ", "").replace("- 0س ", "");
    const correct = `\\frac{س ${signed(q)}}{س ${signed(r)}}`;
    const opts = [correct, `\\frac{س ${signed(-q)}}{س ${signed(-r)}}`, `\\frac{${q}}{${r}}`, `\\frac{س ${signed(p)}}{س ${signed(r)}}`];
    const order = [0, 1, 2, 3].sort(() => rng() - 0.5);
    return { id: gid("3-1.simplify"), lessonId: "3-1", skill: "3-1.simplify", difficulty: 2, type: "mcq", prompt: `بسّط: \\frac{${quad(p, q)}}{${quad(p, r)}}`, options: order.map((i) => opts[i]), answer: order.indexOf(0), explanation: `حلّل: \\frac{(س ${signed(p)})(س ${signed(q)})}{(س ${signed(p)})(س ${signed(r)})} ثم احذف العامل المشترك (س ${signed(p)}).` };
  },
  "4-2.centre": (rng = rand) => {
    const ins = ri(15, 80, rng);
    const askCentre = rng() < 0.5;
    return askCentre
      ? { id: gid("4-2.centre"), lessonId: "4-2", skill: "4-2.centre", difficulty: 1, type: "numeric", prompt: `زاوية محيطية قياسها ${ins}°. ما قياس الزاوية المركزية المقابلة للقوس نفسه؟`, answer: 2 * ins, unit: "°", explanation: `2 × ${ins} = ${2 * ins}°` }
      : { id: gid("4-2.centre"), lessonId: "4-2", skill: "4-2.centre", difficulty: 1, type: "numeric", prompt: `زاوية مركزية قياسها ${2 * ins}°. ما قياس الزاوية المحيطية المقابلة للقوس نفسه؟`, answer: ins, unit: "°", explanation: `${2 * ins} ÷ 2 = ${ins}°` };
  },
  "4-2.cyclic": (rng = rand) => {
    const a = ri(40, 140, rng);
    return { id: gid("4-2.cyclic"), lessonId: "4-2", skill: "4-2.cyclic", difficulty: 1, type: "numeric", prompt: `في شكل رباعي دائري قياس إحدى الزوايا ${a}°. ما قياس الزاوية المقابلة لها؟`, answer: 180 - a, unit: "°", explanation: `180 - ${a} = ${180 - a}°` };
  },
  "4-2.semicircle": (rng = rand) => {
    const a = ri(20, 70, rng);
    return { id: gid("4-2.semicircle"), lessonId: "4-2", skill: "4-2.semicircle", difficulty: 1, type: "numeric", prompt: `أب قطر في دائرة و جـ على محيطها، ق(جـ أ ب) = ${a}°. أوجد ق(جـ ب أ).`, answer: 90 - a, unit: "°", explanation: `الزاوية في نصف الدائرة 90° ⇐ 180 - 90 - ${a} = ${90 - a}°` };
  },
  "4-1.chord": (rng = rand) => {
    const [d, h, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20], [7, 24, 25]], rng);
    return { id: gid("4-1.chord"), lessonId: "4-1", skill: "4-1.chord", difficulty: 2, type: "numeric", prompt: `وتر يبعد ${d} سم عن مركز دائرة نصف قطرها ${r} سم. أوجد طول الوتر.`, answer: 2 * h, unit: "سم", explanation: `نصف الوتر = \\sqrt{${r}^2 - ${d}^2} = ${h} ⇐ الوتر = ${2 * h} سم` };
  },
  "5-1.mean": (rng = rand) => {
    const n = ri(4, 7, rng);
    const m = ri(4, 20, rng);
    const data = Array.from({ length: n }, () => ri(1, 30, rng));
    // عدّل آخر قيمة ليكون الوسط عدداً صحيحاً
    const s = data.slice(0, -1).reduce((a, b) => a + b, 0);
    data[n - 1] = Math.max(0, m * n - s);
    const mu = mean(data);
    return { id: gid("5-1.mean"), lessonId: "5-1", skill: "5-1.mean", difficulty: 1, type: "numeric", prompt: `أوجد الوسط الحسابي: ${data.join("، ")}`, answer: Number(mu.toFixed(2)), tolerance: 0.01, explanation: `المجموع ${data.reduce((a, b) => a + b, 0)} ÷ ${n} = ${Number(mu.toFixed(2))}` };
  },
  "5-1.median": (rng = rand) => {
    const n = ri(5, 8, rng);
    const data = Array.from({ length: n }, () => ri(1, 40, rng));
    const askRange = rng() < 0.35;
    if (askRange) return { id: gid("5-1.median"), lessonId: "5-1", skill: "5-1.median", difficulty: 1, type: "numeric", prompt: `أوجد مدى القيم: ${data.join("، ")}`, answer: range(data), explanation: `${Math.max(...data)} - ${Math.min(...data)} = ${range(data)}` };
    const md = median(data);
    return { id: gid("5-1.median"), lessonId: "5-1", skill: "5-1.median", difficulty: 1, type: "numeric", prompt: `أوجد وسيط القيم: ${data.join("، ")}`, answer: md, explanation: `بعد الترتيب: ${[...data].sort((a, b) => a - b).join("، ")} ⇐ الوسيط ${md}` };
  },
  "6-1.direct": (rng = rand) => {
    const k = ri(2, 6, rng), p = pick([1, 2, 3], rng), x1 = ri(2, 4, rng), x2 = ri(2, 6, rng);
    const pow = p === 1 ? "س" : `س^${p}`;
    const y1 = k * x1 ** p, y2 = k * x2 ** p;
    return { id: gid("6-1.direct"), lessonId: "6-1", skill: "6-1.direct", difficulty: 2, type: "numeric", prompt: `ص تتناسب طردياً مع ${pow} ، و ص = ${y1} عندما س = ${x1}. أوجد ص عندما س = ${x2}.`, answer: y2, explanation: `ث = ${y1} ÷ ${x1 ** p} = ${k} ⇐ ص = ${k} × ${x2 ** p} = ${y2}` };
  },
  "6-1.inverse": (rng = rand) => {
    const kOpts = [12, 24, 36, 48, 60, 72, 120];
    const k = pick(kOpts, rng);
    const divs = [1, 2, 3, 4, 6, 12].filter((d) => k % d === 0);
    const x1 = pick(divs, rng), x2 = pick(divs.filter((d) => d !== x1), rng);
    return { id: gid("6-1.inverse"), lessonId: "6-1", skill: "6-1.inverse", difficulty: 2, type: "numeric", prompt: `ص تتناسب عكسياً مع س ، و ص = ${k / x1} عندما س = ${x1}. أوجد ص عندما س = ${x2}.`, answer: k / x2, explanation: `ث = ${k / x1} × ${x1} = ${k} ⇐ ص = ${k} ÷ ${x2} = ${k / x2}` };
  },
  "7-2.density": (rng = rand) => {
    const w = pick([2, 4, 5, 10, 20, 25], rng), d = pick([0.5, 1, 1.5, 2, 3, 4, 6], rng);
    const f = w * d;
    return { id: gid("7-2.density"), lessonId: "7-2", skill: "7-2.density", difficulty: 1, type: "numeric", prompt: `فئة طولها ${w} وتكرارها ${f}. ما كثافة تكرارها؟`, answer: d, explanation: `${f} ÷ ${w} = ${d}` };
  },
  "8-1.evaluate": (rng = rand) => {
    const a = nz(-4, 5, rng), b = ri(-9, 9, rng), x = ri(-4, 5, rng);
    const quad = rng() < 0.4;
    if (quad) {
      const v = x * x + a * x + b;
      return { id: gid("8-1.evaluate"), lessonId: "8-1", skill: "8-1.evaluate", difficulty: 2, type: "numeric", prompt: `إذا كانت د(س) = س^2 ${signed(a)}س ${signed(b)} ، فأوجد د(${x}).`, answer: v, explanation: `د(${x}) = ${x < 0 ? `(${x})` : x}^2 ${signed(a)} × ${x < 0 ? `(${x})` : x} ${signed(b)} = ${v}` };
    }
    const v = a * x + b;
    return { id: gid("8-1.evaluate"), lessonId: "8-1", skill: "8-1.evaluate", difficulty: 1, type: "numeric", prompt: `إذا كانت د(س) = ${a}س ${signed(b)} ، فأوجد د(${x}).`, answer: v, explanation: `${a} × ${x < 0 ? `(${x})` : x} ${signed(b)} = ${v}` };
  },
  "8-1.composite": (rng = rand) => {
    const a = ri(2, 4, rng), b = ri(-5, 5, rng), x = ri(-3, 4, rng);
    const inner = a * x + b;
    const v = inner * inner;
    return { id: gid("8-1.composite"), lessonId: "8-1", skill: "8-1.composite", difficulty: 2, type: "numeric", prompt: `د(س) = ${a}س ${signed(b)} ، ع(س) = س^2. أوجد (ع ∘ د)(${x}).`, answer: v, explanation: `د(${x}) = ${inner} ⇐ ع(${inner}) = ${v}` };
  },
  "8-1.inverse": (rng = rand) => {
    const a = ri(2, 6, rng), b = nz(-9, 9, rng), y = a * ri(-3, 5, rng) + b;
    const x = (y - b) / a;
    return { id: gid("8-1.inverse"), lessonId: "8-1", skill: "8-1.inverse", difficulty: 3, type: "numeric", prompt: `إذا كانت د(س) = ${a}س ${signed(b)} ، فأوجد د^{-1}(${y}).`, answer: x, explanation: `د^{-1}(س) = \\frac{س ${signed(-b)}}{${a}} ⇐ \\frac{${y} ${signed(-b)}}{${a}} = ${x}` };
  },
};

export function generate(skill: string, rng: Rng = rand): Question | null {
  const g = GENERATORS[skill];
  return g ? g(rng) : null;
}

export const GENERATOR_SKILLS = Object.keys(GENERATORS);

export function randomGenerated(skills: string[] = GENERATOR_SKILLS, rng: Rng = rand): Question {
  return GENERATORS[pick(skills.filter((s) => GENERATORS[s]), rng)](rng);
}
