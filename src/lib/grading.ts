import type { Question } from "@/content/types";
import { equivalent, parseNumberInput, toWesternDigits } from "./math/expr";

export type Response =
  | { type: "mcq"; value: number | null }
  | { type: "tf"; value: boolean | null }
  | { type: "numeric"; value: string }
  | { type: "fill"; value: string[] }
  | { type: "short"; value: string }
  | { type: "match"; value: (number | null)[] }
  | { type: "order"; value: number[] }
  | { type: "classify"; value: (number | null)[] }
  | { type: "multi"; value: string[] };

export interface GradeResult {
  correct: boolean;
  /** نسبة بين 0 و 1 (للأسئلة متعددة الأجزاء) */
  score: number;
  /** ملاحظة على الخطأ إن وجدت */
  note?: string;
  /** لكل جزء: صحيح أم لا */
  parts?: boolean[];
}

const near = (a: number, b: number, tol?: number) => {
  const t = tol ?? Math.max(1e-6, Math.abs(b) * 1e-6);
  return Math.abs(a - b) <= t + 1e-9;
};

export function normalizeText(s: string): string {
  return toWesternDigits(s)
    .replace(/[ً-ْـ]/g, "") // التشكيل والتطويل
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/≤|≦|\\le/g, "<=")
    .replace(/≥|≧|\\ge/g, ">=")
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .toLowerCase();
}

function numericMatch(input: string, answer: number, tol?: number): boolean {
  const v = parseNumberInput(input);
  return v !== null && near(v, answer, tol);
}

export function isAnswered(r: Response | undefined): boolean {
  if (!r) return false;
  switch (r.type) {
    case "mcq": return r.value !== null;
    case "tf": return r.value !== null;
    case "numeric": case "short": return r.value.trim() !== "";
    case "fill": case "multi": return r.value.some((v) => v.trim() !== "");
    case "match": case "classify": return r.value.some((v) => v !== null);
    case "order": return r.value.length > 0;
  }
}

export function grade(q: Question, r: Response | undefined): GradeResult {
  if (!r || r.type !== q.type) return { correct: false, score: 0, note: "لم تتم الإجابة" };
  switch (q.type) {
    case "mcq": {
      const v = (r as Extract<Response, { type: "mcq" }>).value;
      const ok = v === q.answer;
      return { correct: ok, score: ok ? 1 : 0, note: !ok && v !== null ? q.distractorNotes?.[v] : undefined };
    }
    case "tf": {
      const ok = (r as Extract<Response, { type: "tf" }>).value === q.answer;
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case "numeric": {
      const raw = (r as Extract<Response, { type: "numeric" }>).value;
      const ok = numericMatch(raw, q.answer, q.tolerance);
      let note: string | undefined;
      if (!ok) {
        const v = parseNumberInput(raw);
        if (v === null && raw.trim()) note = "تعذّر قراءة الإجابة كعدد. اكتب عدداً مثل 12 أو 2.5 أو 3/4.";
        else if (v !== null && near(-v, q.answer, q.tolerance)) note = "انتبه للإشارة: إجابتك بعكس الإشارة الصحيحة.";
        else if (v !== null && q.answer !== 0 && near(v * 10, q.answer, q.tolerance) || v !== null && near(v / 10, q.answer, q.tolerance)) note = "تحقق من موضع الفاصلة العشرية.";
      }
      return { correct: ok, score: ok ? 1 : 0, note };
    }
    case "fill": {
      const vals = (r as Extract<Response, { type: "fill" }>).value;
      const parts = q.answers.map((accepted, i) => {
        const input = vals[i] ?? "";
        return accepted.some((a) => (typeof a === "number" ? numericMatch(input, a) : normalizeText(input) === normalizeText(a) || (parseNumberInput(String(a)) !== null && numericMatch(input, parseNumberInput(String(a))!))));
      });
      const score = parts.filter(Boolean).length / parts.length;
      return { correct: score === 1, score, parts };
    }
    case "short": {
      const v = (r as Extract<Response, { type: "short" }>).value;
      const ok = q.mode === "expr"
        ? q.accept.some((a) => equivalent(v, a))
        : q.accept.some((a) => normalizeText(a) === normalizeText(v));
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case "match": {
      const v = (r as Extract<Response, { type: "match" }>).value;
      const parts = q.pairs.map((_, i) => v[i] === i);
      const score = parts.filter(Boolean).length / parts.length;
      return { correct: score === 1, score, parts };
    }
    case "order": {
      const v = (r as Extract<Response, { type: "order" }>).value;
      const parts = q.steps.map((_, i) => v[i] === i);
      const score = parts.filter(Boolean).length / parts.length;
      return { correct: score === 1, score, parts };
    }
    case "classify": {
      const v = (r as Extract<Response, { type: "classify" }>).value;
      const parts = q.items.map((it, i) => v[i] === it.cat);
      const score = parts.filter(Boolean).length / parts.length;
      return { correct: score === 1, score, parts };
    }
    case "multi": {
      const v = (r as Extract<Response, { type: "multi" }>).value;
      const parts = q.parts.map((p, i) => numericMatch(v[i] ?? "", p.answer, p.tolerance));
      const score = parts.filter(Boolean).length / parts.length;
      return { correct: score === 1, score, parts };
    }
  }
}

/** نص الإجابة الصحيحة للعرض */
export function correctAnswerText(q: Question): string {
  switch (q.type) {
    case "mcq": return q.options[q.answer];
    case "tf": return q.answer ? "صح" : "خطأ";
    case "numeric": return `${q.answer}${q.unit ? " " + q.unit : ""}`;
    case "fill": return q.answers.map((a) => String(a[0])).join(" ، ");
    case "short": return q.accept[0];
    case "match": return q.pairs.map(([l, r]) => `${l} ← ${r}`).join(" ؛ ");
    case "order": return q.steps.map((s, i) => `${i + 1}) ${s}`).join("  ");
    case "classify": return q.items.map((it) => `${it.text}: ${q.categories[it.cat]}`).join(" ؛ ");
    case "multi": return q.parts.map((p) => `${p.prompt}: ${p.answer}${p.unit ? " " + p.unit : ""}`).join(" ؛ ");
  }
}

export function emptyResponse(q: Question): Response {
  switch (q.type) {
    case "mcq": return { type: "mcq", value: null };
    case "tf": return { type: "tf", value: null };
    case "numeric": return { type: "numeric", value: "" };
    case "fill": return { type: "fill", value: q.answers.map(() => "") };
    case "short": return { type: "short", value: "" };
    case "match": return { type: "match", value: q.pairs.map(() => null) };
    case "order": return { type: "order", value: [] };
    case "classify": return { type: "classify", value: q.items.map(() => null) };
    case "multi": return { type: "multi", value: q.parts.map(() => "") };
  }
}
