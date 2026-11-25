import { describe, it, expect } from "vitest";
import { calc, equivalent, parseNumberInput, MathError, compileFn } from "@/lib/math/expr";
import { algebraicFractionSteps, parseRat, ratToString, factorPoly, factoredToString, Poly, Q } from "@/lib/math/poly";
import { quartiles, median, mean, modes, groupedStats, freqTableStats, cumulativeEstimates, percentile } from "@/lib/math/stats";

describe("expression parser", () => {
  it("handles precedence and implicit multiplication", () => {
    expect(calc("2+3*4")).toBe(14);
    expect(calc("2(3+4)")).toBe(14);
    expect(calc("-3^2")).toBe(-9);
    expect(calc("(-3)^2")).toBe(9);
    expect(calc("2^3^2")).toBe(512);
    expect(calc("3س", { x: 4 })).toBe(12);
    expect(calc("س^2 - 3س", { x: 6 })).toBe(18); // مثال الكتاب د(6)=18
    expect(calc("س^2 - 3س", { x: -3 })).toBe(18);
  });
  it("accepts Arabic-Indic digits and symbols", () => {
    expect(calc("٢٫٥ × ٤")).toBe(10);
    expect(calc("١٢ ÷ ٣")).toBe(4);
    expect(calc("√١٦")).toBe(4);
  });
  it("trig in degrees", () => {
    expect(calc("sin(30)")).toBeCloseTo(0.5);
    expect(calc("جا 90")).toBe(1);
    expect(calc("cos(60)")).toBeCloseTo(0.5);
  });
  it("rejects division by zero clearly", () => {
    expect(() => calc("5/0")).toThrow(MathError);
    expect(() => calc("5/(2-2)")).toThrow("لا يمكن القسمة على صفر");
    expect(compileFn("1/x")(0)).toBeNaN();
  });
  it("reports syntax errors", () => {
    expect(() => calc("(2+3")).toThrow("قوس");
    expect(() => calc("")).toThrow();
  });
  it("checks algebraic equivalence", () => {
    expect(equivalent("(س+4)/3", "س/3 + 4/3")).toBe(true);
    expect(equivalent("(5-س)/2", "(س-5)/2")).toBe(false);
    expect(equivalent("2(س+1)", "2س+2")).toBe(true);
  });
  it("parses numeric student input", () => {
    expect(parseNumberInput("3/4")).toBe(0.75);
    expect(parseNumberInput("٠٫٥")).toBe(0.5);
    expect(parseNumberInput("س")).toBeNull();
  });
});

describe("algebraic fractions", () => {
  it("simplifies (x^2-4x+3)/(x^2-7x+12) to (x-1)/(x-4)", () => {
    const r = parseRat("(س^2-4س+3)/(س^2-7س+12)").simplify();
    expect(ratToString(r)).toBe("\\frac{س - 1}{س - 4}");
  });
  it("factors polynomials", () => {
    const f = factorPoly(parseRat("2س^2+5س-3").num);
    expect(factoredToString(f)).toBe("(2س - 1)(س + 3)");
    const g = factorPoly(parseRat("س^2-9").num);
    expect(factoredToString(g)).toMatch(/\(س [-+] 3\)\(س [-+] 3\)/);
  });
  it("adds fractions", () => {
    const { result } = algebraicFractionSteps("+", "1/(س+1)", "1/(س-1)");
    // 2س/(س^2-1)
    expect(ratToString(result)).toBe("\\frac{2س}{س^2 - 1}");
  });
  it("divides fractions and lists excluded values", () => {
    const { result, excluded } = algebraicFractionSteps("÷", "(س^2-1)/س", "(س+1)/(2س)");
    expect(ratToString(result)).toBe("2س - 2");
    expect(excluded.map((q) => q.value()).sort()).toEqual([-1, 0]);
  });
  it("Q arithmetic", () => {
    expect(new Q(1, 2).add(new Q(1, 3)).toString()).toBe("5/6");
    expect(Poly.x().pow(2).sub(Poly.const(1)).evalAt(new Q(1)).isZero()).toBe(true);
  });
});

describe("statistics (book methods)", () => {
  it("quartiles – book example 5a", () => {
    const q = quartiles([9, 14, 15, 19, 8, 10, 14]);
    expect(q.q2).toBe(14);
    expect(q.q1).toBe(9);
    expect(q.q3).toBe(15);
    expect(q.iqr).toBe(6);
  });
  it("quartiles – book example 5b", () => {
    const q = quartiles([12, 16, 10, 1, 5, 8, 14, 11, 6, 8, 12, 13]);
    expect(q.q2).toBe(10.5);
    expect(q.q1).toBe(7);
    expect(q.q3).toBe(12.5);
    expect(q.iqr).toBe(5.5);
  });
  it("mean/median/mode", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(median([5, 1, 3])).toBe(3);
    expect(modes([1, 2, 2, 3, 3])).toEqual([2, 3]);
    expect(modes([1, 2, 3])).toEqual([]);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9], 50)).toBe(5);
  });
  it("frequency table – book dice example", () => {
    const s = freqTableStats([
      { value: 1, freq: 16 }, { value: 2, freq: 13 }, { value: 3, freq: 14 },
      { value: 4, freq: 17 }, { value: 5, freq: 19 }, { value: 6, freq: 21 },
    ]);
    expect(s.n).toBe(100);
    expect(s.mean).toBeCloseTo(3.73);
  });
  it("grouped – book heights example (mean 145.4)", () => {
    const g = groupedStats([
      { lower: 120, upper: 130, freq: 12 },
      { lower: 130, upper: 140, freq: 16 },
      { lower: 140, upper: 150, freq: 38 },
      { lower: 150, upper: 160, freq: 24 },
      { lower: 160, upper: 170, freq: 10 },
    ]);
    expect(g.estimatedMean).toBeCloseTo(145.4);
    expect(g.medianClass).toBe(2);
    expect(g.modalClass).toBe(2);
    expect(g.estimatedRange).toBe(50);
  });
  it("cumulative estimates", () => {
    const e = cumulativeEstimates([
      { lower: 0, upper: 10, freq: 10 },
      { lower: 10, upper: 20, freq: 20 },
      { lower: 20, upper: 30, freq: 10 },
    ]);
    expect(e.median).toBe(15);
    expect(e.q1).toBe(10);
    expect(e.q3).toBe(20);
  });
});
