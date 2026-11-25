/**
 * محرك الكسور الجبرية: كثيرات حدود في متغير واحد (س) بمعاملات نسبية،
 * مع تبسيط الكسور الجبرية وجمعها وطرحها وضربها وقسمتها وعرض الخطوات.
 */
import { Node, parse, MathError } from "./expr";

// ---------- الأعداد النسبية ----------
function gcdInt(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export class Q {
  readonly n: number;
  readonly d: number;
  constructor(n: number, d = 1) {
    if (d === 0) throw new MathError("لا يمكن القسمة على صفر");
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      // تحويل الكسر العشري إلى نسبي
      const scale = 1e6;
      n = Math.round((n / d) * scale);
      d = scale;
    }
    const g = gcdInt(n, d);
    const s = d < 0 ? -1 : 1;
    this.n = (s * n) / g || 0;
    this.d = (s * d) / g;
  }
  static of(v: number) { return new Q(v); }
  add(o: Q) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o: Q) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o: Q) { return new Q(this.n * o.n, this.d * o.d); }
  div(o: Q) { if (o.n === 0) throw new MathError("لا يمكن القسمة على صفر"); return new Q(this.n * o.d, this.d * o.n); }
  neg() { return new Q(-this.n, this.d); }
  isZero() { return this.n === 0; }
  isOne() { return this.n === 1 && this.d === 1; }
  eq(o: Q) { return this.n === o.n && this.d === o.d; }
  value() { return this.n / this.d; }
  toString() { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; }
}

// ---------- كثيرات الحدود ----------
/** المعامل في الموقع i هو معامل س^i */
export class Poly {
  readonly c: Q[];
  constructor(c: Q[]) {
    const arr = [...c];
    while (arr.length > 1 && arr[arr.length - 1].isZero()) arr.pop();
    if (!arr.length) arr.push(new Q(0));
    this.c = arr;
  }
  static const(v: number | Q) { return new Poly([v instanceof Q ? v : new Q(v)]); }
  static x() { return new Poly([new Q(0), new Q(1)]); }
  get deg() { return this.isZero() ? -Infinity : this.c.length - 1; }
  isZero() { return this.c.length === 1 && this.c[0].isZero(); }
  lead() { return this.c[this.c.length - 1]; }
  add(o: Poly) {
    const n = Math.max(this.c.length, o.c.length);
    const r: Q[] = [];
    for (let i = 0; i < n; i++) r.push((this.c[i] ?? new Q(0)).add(o.c[i] ?? new Q(0)));
    return new Poly(r);
  }
  neg() { return new Poly(this.c.map((q) => q.neg())); }
  sub(o: Poly) { return this.add(o.neg()); }
  mul(o: Poly) {
    const r: Q[] = Array.from({ length: this.c.length + o.c.length - 1 }, () => new Q(0));
    this.c.forEach((a, i) => o.c.forEach((b, j) => { r[i + j] = r[i + j].add(a.mul(b)); }));
    return new Poly(r);
  }
  scale(q: Q) { return new Poly(this.c.map((a) => a.mul(q))); }
  pow(k: number) {
    let r = Poly.const(1);
    for (let i = 0; i < k; i++) r = r.mul(this);
    return r;
  }
  divmod(o: Poly): [Poly, Poly] {
    if (o.isZero()) throw new MathError("لا يمكن القسمة على صفر");
    let rem: Poly = this;
    const q: Q[] = Array.from({ length: Math.max(1, this.c.length - o.c.length + 1) }, () => new Q(0));
    while (!rem.isZero() && rem.deg >= o.deg) {
      const k = rem.deg - o.deg;
      const coef = rem.lead().div(o.lead());
      q[k] = coef;
      const sub = new Poly([...Array(k).fill(new Q(0)), ...o.c.map((a) => a.mul(coef))]);
      rem = rem.sub(sub);
    }
    return [new Poly(q), rem];
  }
  monic() { return this.isZero() ? this : this.scale(new Q(1).div(this.lead())); }
  evalAt(x: Q) {
    let r = new Q(0);
    for (let i = this.c.length - 1; i >= 0; i--) r = r.mul(x).add(this.c[i]);
    return r;
  }
  eq(o: Poly) { return this.sub(o).isZero(); }
}

export function polyGcd(a: Poly, b: Poly): Poly {
  while (!b.isZero()) {
    const [, r] = a.divmod(b);
    a = b;
    b = r;
  }
  return a.isZero() ? Poly.const(1) : a.monic();
}

// ---------- الكسر الجبري ----------
export class RatFn {
  constructor(readonly num: Poly, readonly den: Poly) {
    if (den.isZero()) throw new MathError("المقام لا يمكن أن يساوي صفراً");
  }
  static poly(p: Poly) { return new RatFn(p, Poly.const(1)); }
  add(o: RatFn) { return new RatFn(this.num.mul(o.den).add(o.num.mul(this.den)), this.den.mul(o.den)); }
  sub(o: RatFn) { return new RatFn(this.num.mul(o.den).sub(o.num.mul(this.den)), this.den.mul(o.den)); }
  mul(o: RatFn) { return new RatFn(this.num.mul(o.num), this.den.mul(o.den)); }
  div(o: RatFn) {
    if (o.num.isZero()) throw new MathError("لا يمكن القسمة على كسر يساوي صفراً");
    return new RatFn(this.num.mul(o.den), this.den.mul(o.num));
  }
  /** التبسيط بحذف العامل المشترك الأكبر ثم جعل معاملات المقام صحيحة */
  simplify(): RatFn {
    if (this.num.isZero()) return new RatFn(Poly.const(0), Poly.const(1));
    const g = polyGcd(this.num, this.den);
    let n = this.num.divmod(g)[0];
    let d = this.den.divmod(g)[0];
    // اجعل المعاملات أعداداً صحيحة بأبسط صورة واجعل المعامل الرئيس للمقام موجباً
    const k = integerScale(n, d);
    n = n.scale(k);
    d = d.scale(k);
    if (d.lead().value() < 0) { n = n.neg(); d = d.neg(); }
    return new RatFn(n, d);
  }
}

function lcmInt(a: number, b: number) { return Math.abs(a * b) / gcdInt(a, b); }

function integerScale(n: Poly, d: Poly): Q {
  let L = 1;
  for (const q of [...n.c, ...d.c]) L = lcmInt(L, q.d);
  let G = 0;
  for (const q of [...n.c, ...d.c]) G = gcdInt(G, (q.n * L) / q.d);
  return new Q(L, G || 1);
}

/** تحويل شجرة التعبير إلى كسر جبري في المتغير x */
export function toRatFn(node: Node, v = "x"): RatFn {
  switch (node.k) {
    case "num": return RatFn.poly(Poly.const(new Q(node.v)));
    case "var":
      if (node.name !== v) throw new MathError("يُسمح بمتغير واحد فقط هو س");
      return RatFn.poly(Poly.x());
    case "neg": { const r = toRatFn(node.a, v); return new RatFn(r.num.neg(), r.den); }
    case "bin": {
      const a = toRatFn(node.a, v);
      if (node.op === "^") {
        const e = toRatFn(node.b, v);
        if (e.num.deg > 0 || e.den.deg > 0) throw new MathError("الأس يجب أن يكون عدداً");
        const ev = e.num.c[0].div(e.den.c[0]).value();
        if (!Number.isInteger(ev) || ev < 0 || ev > 12) throw new MathError("الأس يجب أن يكون عدداً صحيحاً غير سالب (حتى 12)");
        return new RatFn(a.num.pow(ev), a.den.pow(ev));
      }
      const b = toRatFn(node.b, v);
      switch (node.op) {
        case "+": return a.add(b);
        case "-": return a.sub(b);
        case "*": return a.mul(b);
        case "/": return a.div(b);
      }
      break;
    }
  }
  throw new MathError("العبارة تحتوي على عمليات غير مدعومة في الكسور الجبرية");
}

export function parseRat(src: string): RatFn {
  return toRatFn(parse(src));
}

// ---------- التحليل إلى عوامل ----------
export interface Factored {
  /** معامل عددي خارج الأقواس */
  k: Q;
  /** عوامل خطية ومتبقية مع أسسها */
  factors: { p: Poly; e: number }[];
}

function divisors(n: number): number[] {
  n = Math.abs(n);
  const r: number[] = [];
  for (let i = 1; i <= n && i <= 10000; i++) if (n % i === 0) r.push(i);
  return r;
}

/** تحليل كثيرة حدود إلى عوامل خطية (جذور نسبية) وعامل متبقٍّ */
export function factorPoly(p: Poly): Factored {
  if (p.isZero()) return { k: new Q(0), factors: [] };
  // اجعل المعاملات صحيحة
  let L = 1;
  for (const q of p.c) L = lcmInt(L, q.d);
  let ints = p.c.map((q) => (q.n * L) / q.d);
  let G = 0;
  for (const v of ints) G = gcdInt(G, v);
  if (ints[ints.length - 1] < 0) G = -G;
  ints = ints.map((v) => v / G);
  let k = new Q(G, L);
  let cur = new Poly(ints.map((v) => new Q(v)));
  const factors: { p: Poly; e: number }[] = [];
  const push = (f: Poly) => {
    const ex = factors.find((x) => x.p.eq(f));
    if (ex) ex.e++;
    else factors.push({ p: f, e: 1 });
  };
  // عامل س^k
  while (cur.deg > 0 && cur.c[0].isZero()) {
    push(Poly.x());
    cur = new Poly(cur.c.slice(1));
  }
  let progress = true;
  while (cur.deg >= 2 && progress) {
    progress = false;
    const a0 = cur.c[0].n, an = cur.lead().n;
    outer: for (const pp of divisors(a0)) {
      for (const qq of divisors(an)) {
        for (const s of [1, -1]) {
          const r = new Q(s * pp, qq);
          if (cur.evalAt(r).isZero()) {
            // العامل (qq س - s pp)
            const f = new Poly([new Q(-s * pp), new Q(qq)]);
            const fNorm = normalizeLinear(f);
            push(fNorm);
            cur = cur.divmod(fNorm)[0];
            progress = true;
            break outer;
          }
        }
      }
    }
  }
  // تبسيط المتبقي
  if (cur.deg >= 1) {
    if (cur.lead().value() < 0) { cur = cur.neg(); k = k.neg(); }
    push(cur);
  } else {
    k = k.mul(cur.c[0]);
  }
  // اجعل المعامل الرئيس لكل عامل موجباً
  return { k, factors };
}

function normalizeLinear(f: Poly): Poly {
  // (a س + b) مع a > 0 وقسمة على القاسم المشترك
  const a = f.c[1].n, b = f.c[0].n;
  const g = gcdInt(a, b);
  const s = a < 0 ? -1 : 1;
  return new Poly([new Q((s * b) / g), new Q((s * a) / g)]);
}

// ---------- العرض بالصيغة العربية ----------
/** عرض كثيرة الحدود بالترميز المستخدم في MathText، بترتيب تنازلي للقوى */
export function polyToString(p: Poly, v = "س"): string {
  if (p.isZero()) return "0";
  const parts: string[] = [];
  for (let i = p.c.length - 1; i >= 0; i--) {
    const q = p.c[i];
    if (q.isZero()) continue;
    const neg = q.value() < 0;
    const abs = neg ? q.neg() : q;
    let coef = abs.d === 1 ? String(abs.n) : `\\frac{${abs.n}}{${abs.d}}`;
    if (i > 0 && abs.isOne()) coef = "";
    const varPart = i === 0 ? "" : i === 1 ? v : `${v}^${i}`;
    const term = coef + varPart;
    if (!parts.length) parts.push((neg ? "-" : "") + term);
    else parts.push(neg ? ` - ${term}` : ` + ${term}`);
  }
  return parts.join("");
}

export function factoredToString(f: Factored, v = "س"): string {
  if (f.k.isZero()) return "0";
  const alone = f.factors.length === 1 && f.factors[0].e === 1 && f.k.isOne();
  const fs = f.factors.map(({ p, e }) => {
    const inner = polyToString(p, v);
    const single = p.deg === 1 && p.c[0].isZero(); // س فقط
    const base = (single && p.lead().isOne()) || alone ? inner : `(${inner})`;
    return e > 1 ? `${base}^${e}` : base;
  });
  let k = "";
  if (!f.k.isOne() || !fs.length) {
    if (f.k.eq(new Q(-1)) && fs.length) k = "-";
    else k = f.k.d === 1 ? String(f.k.n) : `\\frac{${f.k.n}}{${f.k.d}}`;
  }
  return k + fs.join("");
}

export function ratToString(r: RatFn, v = "س", factored = false): string {
  const show = (p: Poly) => (factored ? factoredToString(factorPoly(p), v) : polyToString(p, v));
  if (r.den.deg <= 0 && r.den.c[0].isOne()) return show(r.num);
  return `\\frac{${show(r.num)}}{${show(r.den)}}`;
}

/** القيم التي تجعل المقام صفراً (جذور نسبية فقط) */
export function excludedValues(den: Poly): Q[] {
  const f = factorPoly(den);
  const roots: Q[] = [];
  for (const { p } of f.factors) {
    if (p.deg === 1) roots.push(p.c[0].neg().div(p.c[1]));
  }
  return roots;
}

export function qToString(q: Q): string {
  return q.d === 1 ? String(q.n) : `\\frac{${q.n}}{${q.d}}`;
}

export type FracOp = "simplify" | "+" | "-" | "×" | "÷";

/** إجراء عملية على كسرين جبريين مع خطوات الحل بالعربية */
export function algebraicFractionSteps(op: FracOp, aSrc: string, bSrc?: string): { steps: string[]; result: RatFn; excluded: Q[] } {
  const A = parseRat(aSrc);
  const steps: string[] = [];
  const fac = (r: RatFn) => ratToString(r, "س", true);
  const excludedFrom: Poly[] = [A.den];
  if (op === "simplify") {
    steps.push(`حلّل البسط والمقام إلى عوامل: ${fac(A)}`);
    const s = A.simplify();
    const g = polyGcd(A.num, A.den);
    if (g.deg > 0) steps.push(`احذف العامل المشترك ${factoredToString(factorPoly(g))} من البسط والمقام.`);
    else steps.push("لا يوجد عامل مشترك بين البسط والمقام؛ الكسر في أبسط صورة.");
    steps.push(`النتيجة: ${ratToString(s, "س", true)}`);
    return { steps, result: s, excluded: uniqQ(excludedFrom.flatMap(excludedValues)) };
  }
  if (!bSrc) throw new MathError("أدخل الكسر الثاني");
  const B = parseRat(bSrc);
  excludedFrom.push(B.den);
  steps.push(`حلّل كل كسر إلى عوامل: ${fac(A)} ، ${fac(B)}`);
  let R: RatFn;
  if (op === "×") {
    steps.push("اضرب البسطين معاً والمقامين معاً، ثم احذف العوامل المشتركة.");
    R = A.mul(B);
  } else if (op === "÷") {
    if (B.num.isZero()) throw new MathError("لا يمكن القسمة على كسر يساوي صفراً");
    excludedFrom.push(B.num);
    const flipped = new RatFn(B.den, B.num);
    steps.push(`القسمة على كسر تعني الضرب في مقلوبه: ${fac(A)} × ${fac(flipped)}`);
    R = A.mul(flipped);
  } else {
    const g = polyGcd(A.den, B.den);
    const lcd = A.den.mul(B.den).divmod(g)[0];
    steps.push(`المقام المشترك الأصغر: ${factoredToString(factorPoly(lcd))}`);
    const fa = lcd.divmod(A.den)[0];
    const fb = lcd.divmod(B.den)[0];
    const na = A.num.mul(fa), nb = B.num.mul(fb);
    steps.push(`اكتب كل كسر بالمقام المشترك: البسط الأول يصبح ${polyToString(na)} ، والثاني يصبح ${polyToString(nb)}`);
    const n = op === "+" ? na.add(nb) : na.sub(nb);
    steps.push(`${op === "+" ? "اجمع" : "اطرح"} البسطين: ${polyToString(n)}`);
    R = new RatFn(n, lcd);
  }
  const s = R.simplify();
  steps.push(`بسّط الناتج: ${ratToString(s, "س", true)}`);
  return { steps, result: s, excluded: uniqQ(excludedFrom.flatMap(excludedValues)) };
}

function uniqQ(arr: Q[]): Q[] {
  const out: Q[] = [];
  for (const q of arr) if (!out.some((o) => o.eq(q))) out.push(q);
  return out.sort((a, b) => a.value() - b.value());
}
