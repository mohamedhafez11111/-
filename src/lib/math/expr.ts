/**
 * محلّل ومقيِّم آمن للعبارات الرياضية (بدون eval).
 * يدعم: + - × ÷ ^ والأقواس والضرب الضمني والدوال العلمية والمتغيرات (س، ص، ...).
 * يقبل الأرقام العربية الهندية (٠-٩) والرموز العربية (س، ص، جا، جتا، ظا، π، √).
 */

export class MathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MathError";
  }
}

export type Node =
  | { k: "num"; v: number }
  | { k: "var"; name: string }
  | { k: "neg"; a: Node }
  | { k: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { k: "call"; fn: string; args: Node[] }
  | { k: "fact"; a: Node };

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

/** تحويل الأرقام العربية الهندية إلى أرقام عربية غربية */
export function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d] ?? d).replace(/٫/g, ".");
}

const AR_TO_EN_DIGITS = "٠١٢٣٤٥٦٧٨٩";
/** تحويل الأرقام الغربية إلى عربية هندية (للعرض) */
export function toEasternDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => AR_TO_EN_DIGITS[Number(d)]);
}

/** المتغيرات العربية المسموح بها وما يقابلها داخلياً */
const VAR_MAP: Record<string, string> = { "س": "x", "ص": "y", "ع": "z", "ن": "n", "م": "m", "ل": "l", "ك": "k", "ت": "t", "ف": "f", "ر": "r" };

export function normalizeExpr(input: string): string {
  let s = toWesternDigits(input);
  s = s
    .replace(/[‎‏‪-‮؜]/g, "")
    .replace(/[×✕⋅·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/،/g, ",")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/∛/g, "cbrt")
    .replace(/جتا/g, "cos")
    .replace(/جا/g, "sin")
    .replace(/ظا/g, "tan")
    .replace(/لو/g, "log")
    .replace(/لط/g, "ln")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")");
  // المتغيرات العربية
  s = s.replace(/[سصعنملكتفر]/g, (c) => VAR_MAP[c] ?? c);
  return s;
}

type Tok =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string };

const FUNCS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan", "sqrt", "cbrt", "abs", "ln", "log", "exp", "round", "floor", "ceil",
]);
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenize(src: string): Tok[] {
  const s = normalizeExpr(src);
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      // صيغة علمية 1e5
      if ((s[j] === "E" || s[j] === "e") && (/[0-9]/.test(s[j + 1] ?? "") || (/[-+]/.test(s[j + 1] ?? "") && /[0-9]/.test(s[j + 2] ?? "")))) {
        j++;
        if (s[j] === "-" || s[j] === "+") j++;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
      }
      const str = s.slice(i, j);
      if ((str.match(/\./g) || []).length > 1) throw new MathError("عدد غير صحيح: " + str);
      out.push({ t: "num", v: parseFloat(str) });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      let word = s.slice(i, j);
      // تفكيك الكلمات: دوال/ثوابت معروفة، وإلا فكل حرف متغير مستقل (xy = x*y)
      while (word.length) {
        let matched = false;
        for (const name of [...FUNCS, ...Object.keys(CONSTS)].sort((a, b) => b.length - a.length)) {
          if (word.startsWith(name)) {
            out.push({ t: "id", v: name });
            word = word.slice(name.length);
            matched = true;
            break;
          }
        }
        if (!matched) {
          out.push({ t: "id", v: word[0] });
          word = word.slice(1);
        }
      }
      i = j;
      continue;
    }
    if ("+-*/^(),!%".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new MathError(`رمز غير مفهوم: «${c}»`);
  }
  return out;
}

class Parser {
  private p = 0;
  constructor(private toks: Tok[]) {}
  peek(): Tok | undefined { return this.toks[this.p]; }
  next(): Tok | undefined { return this.toks[this.p++]; }
  isOp(v: string) { const t = this.peek(); return !!t && t.t === "op" && t.v === v; }
  expect(v: string) {
    if (!this.isOp(v)) throw new MathError(v === ")" ? "يوجد قوس غير مغلق" : `متوقع «${v}»`);
    this.p++;
  }
  parse(): Node {
    if (!this.toks.length) throw new MathError("العبارة فارغة");
    const n = this.expr();
    if (this.p < this.toks.length) {
      const t = this.peek()!;
      throw new MathError(t.t === "op" && t.v === ")" ? "قوس إغلاق زائد" : "صيغة العبارة غير صحيحة");
    }
    return n;
  }
  expr(): Node {
    let a = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const op = (this.next() as { v: string }).v as "+" | "-";
      a = { k: "bin", op, a, b: this.term() };
    }
    return a;
  }
  startsFactor(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.t === "num" || t.t === "id") return true;
    return t.t === "op" && t.v === "(";
  }
  term(): Node {
    let a = this.unary();
    for (;;) {
      if (this.isOp("*") || this.isOp("/")) {
        const op = (this.next() as { v: string }).v as "*" | "/";
        a = { k: "bin", op, a, b: this.unary() };
      } else if (this.startsFactor()) {
        // ضرب ضمني: 2س ، 2(س+1) ، (س+1)(س-1)
        a = { k: "bin", op: "*", a, b: this.power() };
      } else break;
    }
    return a;
  }
  unary(): Node {
    if (this.isOp("-")) { this.next(); return { k: "neg", a: this.unary() }; }
    if (this.isOp("+")) { this.next(); return this.unary(); }
    return this.power();
  }
  power(): Node {
    const base = this.postfix();
    if (this.isOp("^")) {
      this.next();
      const exp = this.unary(); // يمين-ترابطي
      return { k: "bin", op: "^", a: base, b: exp };
    }
    return base;
  }
  postfix(): Node {
    let a = this.atom();
    for (;;) {
      if (this.isOp("!")) { this.next(); a = { k: "fact", a }; }
      else if (this.isOp("%")) { this.next(); a = { k: "bin", op: "/", a, b: { k: "num", v: 100 } }; }
      else break;
    }
    return a;
  }
  atom(): Node {
    const t = this.next();
    if (!t) throw new MathError("العبارة غير مكتملة");
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "id") {
      if (FUNCS.has(t.v)) {
        if (this.isOp("(")) {
          this.next();
          const args = [this.expr()];
          while (this.isOp(",")) { this.next(); args.push(this.expr()); }
          this.expect(")");
          return { k: "call", fn: t.v, args };
        }
        // sin 30 بدون أقواس
        return { k: "call", fn: t.v, args: [this.power()] };
      }
      if (t.v in CONSTS) return { k: "num", v: CONSTS[t.v] };
      return { k: "var", name: t.v };
    }
    if (t.v === "(") {
      const e = this.expr();
      this.expect(")");
      return e;
    }
    throw new MathError("صيغة العبارة غير صحيحة");
  }
}

export function parse(src: string): Node {
  return new Parser(tokenize(src)).parse();
}

export interface EvalOptions {
  angle?: "deg" | "rad";
  /** إذا كانت true تُرمى رسالة خطأ عند القسمة على صفر، وإلا يُعاد NaN */
  strict?: boolean;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new MathError("المضروب معرّف للأعداد الصحيحة غير السالبة فقط");
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function evaluate(node: Node, vars: Record<string, number> = {}, opts: EvalOptions = {}): number {
  const strict = opts.strict ?? true;
  const toRad = (v: number) => (opts.angle === "rad" ? v : (v * Math.PI) / 180);
  const fromRad = (v: number) => (opts.angle === "rad" ? v : (v * 180) / Math.PI);
  const ev = (n: Node): number => {
    switch (n.k) {
      case "num": return n.v;
      case "var": {
        if (!(n.name in vars)) throw new MathError(`المتغير «${displayVar(n.name)}» ليس له قيمة`);
        return vars[n.name];
      }
      case "neg": return -ev(n.a);
      case "fact": return factorial(ev(n.a));
      case "bin": {
        const a = ev(n.a), b = ev(n.b);
        switch (n.op) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/":
            if (b === 0) { if (strict) throw new MathError("لا يمكن القسمة على صفر"); return NaN; }
            return a / b;
          case "^": {
            if (a === 0 && b < 0) { if (strict) throw new MathError("لا يمكن القسمة على صفر"); return NaN; }
            if (a < 0 && !Number.isInteger(b)) {
              // جذر فردي لعدد سالب مثل (-8)^(1/3)
              const inv = 1 / b;
              if (Number.isInteger(Math.round(inv)) && Math.abs(inv - Math.round(inv)) < 1e-9 && Math.round(inv) % 2 !== 0) {
                return -Math.pow(-a, b);
              }
              if (strict) throw new MathError("القوة غير معرّفة في الأعداد الحقيقية");
              return NaN;
            }
            return Math.pow(a, b);
          }
        }
        break;
      }
      case "call": {
        const x = ev(n.args[0]);
        switch (n.fn) {
          case "sin": return cleanTrig(Math.sin(toRad(x)));
          case "cos": return cleanTrig(Math.cos(toRad(x)));
          case "tan": {
            const c = Math.cos(toRad(x));
            if (Math.abs(c) < 1e-12) { if (strict) throw new MathError("ظل الزاوية غير معرّف عند هذه القيمة"); return NaN; }
            return cleanTrig(Math.tan(toRad(x)));
          }
          case "asin": if (Math.abs(x) > 1) throw new MathError("القيمة خارج المجال [-1، 1]"); return fromRad(Math.asin(x));
          case "acos": if (Math.abs(x) > 1) throw new MathError("القيمة خارج المجال [-1، 1]"); return fromRad(Math.acos(x));
          case "atan": return fromRad(Math.atan(x));
          case "sqrt":
            if (x < 0) { if (strict) throw new MathError("لا يوجد جذر تربيعي حقيقي لعدد سالب"); return NaN; }
            return Math.sqrt(x);
          case "cbrt": return Math.cbrt(x);
          case "abs": return Math.abs(x);
          case "ln":
            if (x <= 0) { if (strict) throw new MathError("اللوغاريتم معرّف للأعداد الموجبة فقط"); return NaN; }
            return Math.log(x);
          case "log":
            if (x <= 0) { if (strict) throw new MathError("اللوغاريتم معرّف للأعداد الموجبة فقط"); return NaN; }
            return Math.log10(x);
          case "exp": return Math.exp(x);
          case "round": return Math.round(x);
          case "floor": return Math.floor(x);
          case "ceil": return Math.ceil(x);
        }
      }
    }
    throw new MathError("عملية غير مدعومة");
  };
  return ev(node);
}

function cleanTrig(v: number) {
  return Math.abs(v) < 1e-12 ? 0 : Math.abs(v - Math.round(v)) < 1e-12 ? Math.round(v) : v;
}

export function displayVar(name: string): string {
  const rev: Record<string, string> = {};
  for (const [ar, en] of Object.entries(VAR_MAP)) rev[en] = ar;
  return rev[name] ?? name;
}

/** حساب قيمة عبارة نصية مباشرة */
export function calc(src: string, vars: Record<string, number> = {}, opts: EvalOptions = {}): number {
  return evaluate(parse(src), vars, opts);
}

/** تحويل عبارة إلى دالة سريعة للرسم: تعيد NaN بدلاً من رمي الأخطاء */
export function compileFn(src: string, varName = "x"): (x: number) => number {
  const ast = parse(src);
  return (x: number) => {
    try {
      return evaluate(ast, { [varName]: x }, { strict: false, angle: "deg" });
    } catch {
      return NaN;
    }
  };
}

/** المتغيرات المستخدمة في العبارة */
export function variablesOf(node: Node, acc = new Set<string>()): Set<string> {
  switch (node.k) {
    case "var": acc.add(node.name); break;
    case "neg": case "fact": variablesOf(node.a, acc); break;
    case "bin": variablesOf(node.a, acc); variablesOf(node.b, acc); break;
    case "call": node.args.forEach((a) => variablesOf(a, acc)); break;
  }
  return acc;
}

/**
 * التحقق من تكافؤ عبارتين جبريتين بالتعويض العددي في نقاط متعددة.
 * يستخدم لتصحيح الإجابات القصيرة الجبرية (مثل معكوس دالة).
 */
export function equivalent(a: string, b: string, tol = 1e-6): boolean {
  let A: Node, B: Node;
  try { A = parse(a); B = parse(b); } catch { return false; }
  const vars = new Set([...variablesOf(A), ...variablesOf(B)]);
  const samples = [0.37, 1.91, -2.53, 3.17, -0.71, 5.29, 7.13];
  let compared = 0;
  for (let i = 0; i < samples.length; i++) {
    const env: Record<string, number> = {};
    let j = 0;
    for (const v of vars) env[v] = samples[(i + j++ * 3) % samples.length] + j * 0.13;
    let va: number, vb: number;
    try {
      va = evaluate(A, env, { strict: false });
      vb = evaluate(B, env, { strict: false });
    } catch { return false; }
    if (!Number.isFinite(va) && !Number.isFinite(vb)) continue;
    if (!Number.isFinite(va) || !Number.isFinite(vb)) return false;
    if (Math.abs(va - vb) > tol * Math.max(1, Math.abs(va), Math.abs(vb))) return false;
    compared++;
  }
  return compared >= 3;
}

/** تحويل إدخال الطالب إلى عدد (يقبل الكسور 3/4 والأرقام العربية والعبارات البسيطة) */
export function parseNumberInput(src: string): number | null {
  const s = src.trim();
  if (!s) return null;
  try {
    const ast = parse(s);
    if (variablesOf(ast).size) return null;
    const v = evaluate(ast, {}, { strict: true });
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** تنسيق عدد للعرض بعدد معقول من المنازل */
export function fmt(v: number, maxDecimals = 6): string {
  if (!Number.isFinite(v)) return v > 0 ? "∞" : v < 0 ? "-∞" : "غير معرّف";
  if (Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0)) {
    return v.toExponential(4).replace("e", "×10^");
  }
  const r = Number(v.toFixed(maxDecimals));
  return String(Object.is(r, -0) ? 0 : r);
}
