import { describe, it, expect } from "vitest";
import { UNITS, LESSONS, ALL_QUESTIONS, BANK_QUESTIONS, LESSON_BY_ID, SKILL_BY_ID } from "@/content";
import { GENERATORS } from "@/content/generators";
import { parse, equivalent } from "@/lib/math/expr";
import { grade, emptyResponse } from "@/lib/grading";
import type { Figure, Question } from "@/content/types";

const LAB_IDS = ["conversion", "regions", "linear-programming", "gradient", "motion", "data-organizer", "charts", "algebraic-fractions", "circle-symmetry", "circle-angles", "stats-measures", "box-plot", "proportion", "scatter", "histogram", "cumulative", "functions"];

describe("curriculum structure (matches the textbook table of contents)", () => {
  it("has the 8 units and 19 lessons in order", () => {
    expect(UNITS.map((u) => u.id)).toEqual(["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"]);
    expect(LESSONS.map((l) => l.id)).toEqual([
      "1-1", "1-2", "1-3", "1-4", "1-5", "2-1", "2-2", "2-3", "3-1", "4-1", "4-2",
      "5-1", "5-2", "5-3", "6-1", "7-1", "7-2", "7-3", "8-1",
    ]);
    for (const u of UNITS) for (const id of u.lessonIds) expect(LESSON_BY_ID[id]?.unitId).toBe(u.id);
  });
  it("lesson titles match the student book", () => {
    const titles: Record<string, string> = {
      "1-1": "التمثيلات البيانية للتحويل", "1-2": "تمثيل المناطق في المستوى الإحداثي", "1-3": "البرمجة الخطية", "1-4": "الميل", "1-5": "التمثيلات البيانية للحركة",
      "2-1": "جمع البيانات وتصنيفها", "2-2": "تنظيم البيانات", "2-3": "استخدام الجداول لعرض البيانات", "3-1": "الكسور الجبرية",
      "4-1": "خصائص التماثل في الدائرة", "4-2": "العلاقات بين الزوايا في الدائرة", "5-1": "المقاييس الإحصائية", "5-2": "الجداول التكرارية",
      "5-3": "المئينات والربيعات والمخطط الصندوقي", "6-1": "التناسب الطردي والتناسب العكسي في الحدود الجبرية", "7-1": "بيانات بمتغيرين",
      "7-2": "المدرج التكراري", "7-3": "التكرار التراكمي", "8-1": "الدوال وصيغة الدالة",
    };
    for (const l of LESSONS) expect(l.title).toBe(titles[l.id]);
  });
  it("every lesson is complete", () => {
    for (const l of LESSONS) {
      expect(l.objectives.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.sections.length, l.id).toBeGreaterThanOrEqual(1);
      expect(l.examples.map((e) => e.level).sort(), l.id).toEqual(["advanced", "basic", "intermediate"]);
      expect(l.summary.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.mistakes.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.skills.length, l.id).toBeGreaterThanOrEqual(2);
      for (const lab of l.labs) expect(LAB_IDS, `${l.id} lab ${lab}`).toContain(lab);
      for (const p of l.prerequisites) if (p.lessonId) expect(LESSON_BY_ID[p.lessonId], l.id).toBeDefined();
    }
  });
});

function checkFigure(f: Figure | undefined, ctx: string) {
  if (!f) return;
  if (f.kind === "plane") for (const c of f.curves ?? []) if (c.expr) expect(() => parse(c.expr!), ctx).not.toThrow();
  if (f.kind === "pie" || f.kind === "bars") expect(f.labels.length, ctx).toBe(f.values.length);
  if (f.kind === "stemleaf") expect(f.stems.length, ctx).toBe(f.leaves.length);
  if (f.kind === "box") {
    const s = [...f.five].sort((a, b) => a - b);
    expect(f.five, ctx).toEqual(s);
  }
}

function validateQuestion(q: Question) {
  const ctx = q.id;
  expect(LESSON_BY_ID[q.lessonId], ctx).toBeDefined();
  expect(SKILL_BY_ID[q.skill], `${ctx} skill ${q.skill}`).toBeDefined();
  expect(SKILL_BY_ID[q.skill].lessonId, ctx).toBe(q.lessonId);
  expect([1, 2, 3, 4], ctx).toContain(q.difficulty);
  expect(q.explanation.length, ctx).toBeGreaterThan(3);
  checkFigure(q.figure, ctx);
  switch (q.type) {
    case "mcq":
      expect(q.answer, ctx).toBeGreaterThanOrEqual(0);
      expect(q.answer, ctx).toBeLessThan(q.options.length);
      expect(new Set(q.options).size, `${ctx} duplicate options`).toBe(q.options.length);
      break;
    case "numeric":
      expect(Number.isFinite(q.answer), ctx).toBe(true);
      break;
    case "match":
      expect(new Set(q.pairs.map((p) => p[1])).size, `${ctx} duplicate right side`).toBe(q.pairs.length);
      expect(new Set(q.pairs.map((p) => p[0])).size, ctx).toBe(q.pairs.length);
      break;
    case "classify":
      for (const it of q.items) expect(it.cat, ctx).toBeLessThan(q.categories.length);
      break;
    case "short":
      if (q.mode === "expr") for (const a of q.accept) { expect(() => parse(a), ctx).not.toThrow(); expect(equivalent(a, q.accept[0]), ctx).toBe(true); }
      break;
    case "multi":
      for (const p of q.parts) expect(Number.isFinite(p.answer), ctx).toBe(true);
      break;
  }
  // الإجابة الفارغة لا تُصحَّح على أنها صحيحة
  expect(grade(q, emptyResponse(q)).correct, `${ctx} empty answer graded correct`).toBe(false);
}

describe("question bank", () => {
  it("ids are unique and stable", () => {
    const ids = ALL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every lesson has at least 7 bank questions across difficulties", () => {
    for (const l of LESSONS) {
      const qs = BANK_QUESTIONS.filter((q) => q.lessonId === l.id);
      expect(qs.length, l.id).toBeGreaterThanOrEqual(7);
      expect(new Set(qs.map((q) => q.difficulty)).size, l.id).toBeGreaterThanOrEqual(2);
    }
  });
  it("all questions are well formed", () => {
    for (const q of ALL_QUESTIONS) validateQuestion(q);
  });
  it("correct responses grade as correct", () => {
    for (const q of ALL_QUESTIONS) {
      let r;
      switch (q.type) {
        case "mcq": r = { type: "mcq", value: q.answer } as const; break;
        case "tf": r = { type: "tf", value: q.answer } as const; break;
        case "numeric": r = { type: "numeric", value: String(q.answer) } as const; break;
        case "fill": r = { type: "fill", value: q.answers.map((a) => String(a[0])) } as const; break;
        case "short": r = { type: "short", value: q.accept[0] } as const; break;
        case "match": r = { type: "match", value: q.pairs.map((_, i) => i) } as const; break;
        case "order": r = { type: "order", value: q.steps.map((_, i) => i) } as const; break;
        case "classify": r = { type: "classify", value: q.items.map((i) => i.cat) } as const; break;
        case "multi": r = { type: "multi", value: q.parts.map((p) => String(p.answer)) } as const; break;
      }
      expect(grade(q, r).correct, q.id).toBe(true);
    }
  });
});

describe("generators", () => {
  it("produce valid, self-consistent questions", () => {
    for (const [skill, g] of Object.entries(GENERATORS)) {
      for (let i = 0; i < 40; i++) {
        const q = g();
        expect(q.skill).toBe(skill);
        validateQuestion(q);
        if (q.type === "numeric") expect(grade(q, { type: "numeric", value: String(q.answer) }).correct).toBe(true);
      }
    }
  });
});
