"use client";
/**
 * عرض الرياضيات بالعربية (من اليمين إلى اليسار) بترميز خفيف:
 *   \frac{أ}{ب}  \sqrt{أ}  س^2  س^{-1}  ص_1  \le \ge \ne \times \div \pm \propto \circ \pi \infty
 *   **نص عريض**
 * يحوّل الأرقام إلى الهندية (٠١٢٣) عند اختيار ذلك في الإعدادات.
 */
import React from "react";
import { useSettings } from "@/lib/settings";
import { toEasternDigits } from "@/lib/math/expr";

const SYMBOLS: Record<string, string> = {
  le: "≤", ge: "≥", ne: "≠", times: "×", div: "÷", pm: "±", propto: "∝", circ: "∘", pi: "π", infty: "∞",
  deg: "°", theta: "θ", to: "→", approx: "≈", cdot: "·", therefore: "∴", angle: "∠", perp: "⊥", parallel: "∥", Rightarrow: "⇐",
};

type MNode = string | { t: "frac"; n: MNode[]; d: MNode[] } | { t: "sqrt"; a: MNode[] } | { t: "sup"; a: MNode[] } | { t: "sub"; a: MNode[] } | { t: "b"; a: MNode[] };

function readGroup(s: string, i: number): [string, number] {
  // s[i] === "{"
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}") {
      depth--;
      if (depth === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  return [s.slice(i + 1), s.length];
}

export function parseMath(s: string): MNode[] {
  const out: MNode[] = [];
  let buf = "";
  const flush = () => { if (buf) { out.push(buf); buf = ""; } };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
      if (m) {
        const name = m[1];
        i += m[0].length;
        if (name === "frac" && s[i] === "{") {
          flush();
          const [a, j] = readGroup(s, i);
          const [b, k] = s[j] === "{" ? readGroup(s, j) : ["", j];
          out.push({ t: "frac", n: parseMath(a), d: parseMath(b) });
          i = k;
          continue;
        }
        if (name === "sqrt" && s[i] === "{") {
          flush();
          const [a, j] = readGroup(s, i);
          out.push({ t: "sqrt", a: parseMath(a) });
          i = j;
          continue;
        }
        if (SYMBOLS[name]) { buf += SYMBOLS[name]; continue; }
        buf += name;
        continue;
      }
    }
    if ((c === "^" || c === "_") && i + 1 < s.length) {
      flush();
      let content: string;
      if (s[i + 1] === "{") {
        const [a, j] = readGroup(s, i + 1);
        content = a;
        i = j;
      } else {
        const m = /^-?[0-9]+|^./.exec(s.slice(i + 1))!;
        content = m[0];
        i += 1 + m[0].length;
      }
      out.push({ t: c === "^" ? "sup" : "sub", a: parseMath(content) });
      continue;
    }
    if (c === "*" && s[i + 1] === "*") {
      const end = s.indexOf("**", i + 2);
      if (end > 0) {
        flush();
        out.push({ t: "b", a: parseMath(s.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    buf += c;
    i++;
  }
  flush();
  return out;
}

function render(nodes: MNode[], eastern: boolean, key = ""): React.ReactNode[] {
  return nodes.map((n, idx) => {
    const k = key + idx;
    if (typeof n === "string") return <React.Fragment key={k}>{eastern ? toEasternDigits(n) : n}</React.Fragment>;
    switch (n.t) {
      case "frac":
        return (
          <span className="frac" key={k}>
            <span className="num">{render(n.n, eastern, k + "n")}</span>
            <span className="den">{render(n.d, eastern, k + "d")}</span>
          </span>
        );
      case "sqrt":
        return (
          <span className="sqrt" key={k}>
            <span aria-hidden>√</span>
            <span className="rad">{render(n.a, eastern, k + "r")}</span>
          </span>
        );
      case "sup":
        return <sup key={k}>{render(n.a, eastern, k + "s")}</sup>;
      case "sub":
        return <sub key={k}>{render(n.a, eastern, k + "b")}</sub>;
      case "b":
        return <strong key={k}>{render(n.a, eastern, k + "B")}</strong>;
    }
  });
}

export function MathText({ text, className, as = "span" }: { text: string; className?: string; as?: "span" | "div" | "p" }) {
  const { settings } = useSettings();
  const Tag = as;
  return <Tag className={`math ${className ?? ""}`}>{render(parseMath(text), settings.digits === "eastern")}</Tag>;
}

/** نص خام بدون ترميز (للعناوين القصيرة والقوائم) مع تحويل الأرقام */
export function Num({ children }: { children: string | number }) {
  const { settings } = useSettings();
  const s = String(children);
  return <>{settings.digits === "eastern" ? toEasternDigits(s) : s}</>;
}

/** تحويل الترميز إلى نص عادي (للنسخ والطباعة والذكاء الاصطناعي) */
export function plainMath(s: string): string {
  const walk = (ns: MNode[]): string =>
    ns.map((n) => (typeof n === "string" ? n : n.t === "frac" ? `(${walk(n.n)})/(${walk(n.d)})` : n.t === "sqrt" ? `√(${walk(n.a)})` : n.t === "sup" ? `^${walk(n.a)}` : n.t === "sub" ? walk(n.a) : walk(n.a))).join("");
  return walk(parseMath(s));
}
