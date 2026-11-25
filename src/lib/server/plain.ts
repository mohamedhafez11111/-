/** تحويل ترميز الرياضيات الخفيف إلى نص عادي (للاستخدام في الخادم) */
export function plainMathServer(s: string): string {
  let out = s;
  for (let i = 0; i < 5; i++) out = out.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
  return out
    .replace(/\\le/g, "≤").replace(/\\ge/g, "≥").replace(/\\ne/g, "≠").replace(/\\times/g, "×").replace(/\\div/g, "÷")
    .replace(/\\propto/g, "∝").replace(/\\circ/g, "∘").replace(/\\pi/g, "π")
    .replace(/\^\{([^{}]*)\}/g, "^$1").replace(/_\{([^{}]*)\}/g, "_$1");
}
