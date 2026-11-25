/** دوال مساعدة لكتابة الأسئلة بإيجاز مع الحفاظ على الأنواع */
import type { Difficulty, Figure, Question } from "./types";

type Extra = { hint?: string; figure?: Figure; format?: "graph" | "table" | "multistep" | "word" };

export function makeQ(lessonId: string, idPrefix = lessonId) {
  let n = 0;
  const id = () => `q-${idPrefix}-${String(++n).padStart(3, "0")}`;
  return {
    mcq: (skill: string, difficulty: Difficulty, prompt: string, options: string[], answer: number, explanation: string, extra: Extra & { distractorNotes?: (string | undefined)[]; shuffle?: boolean } = {}): Question =>
      ({ id: id(), lessonId, skill, difficulty, type: "mcq", prompt, options, answer, explanation, ...extra }),
    tf: (skill: string, difficulty: Difficulty, prompt: string, answer: boolean, explanation: string, extra: Extra = {}): Question =>
      ({ id: id(), lessonId, skill, difficulty, type: "tf", prompt, answer, explanation, ...extra }),
    num: (skill: string, difficulty: Difficulty, prompt: string, answer: number, explanation: string, extra: Extra & { tolerance?: number; unit?: string } = {}): Question =>
      ({ id: id(), lessonId, skill, difficulty, type: "numeric", prompt, answer, explanation, ...extra }),
    fill: (skill: string, difficulty: Difficulty, prompt: string, answers: (string | number)[][], explanation: string, extra: Extra = {}): Question =>
      ({ id: id(), lessonId, skill, difficulty, type: "fill", prompt, answers, explanation, ...extra }),
    short: (skill: string, difficulty: Difficulty, prompt: string, accept: string[], mode: "text" | "expr", explanation: string, extra: Extra = {}): Question =>
      ({ id: id(), lessonId, skill, difficulty, type: "short", prompt, accept, mode, explanation, ...extra }),
    match: (skill: string, difficulty: Difficulty, prompt: string, pairs: [string, string][], explanation: string, extra: Extra = {}): Question =>
      ({ id: id(), lessonId, skill, difficulty, type: "match", prompt, pairs, explanation, ...extra }),
    order: (skill: string, difficulty: Difficulty, prompt: string, steps: string[], explanation: string, extra: Extra = {}): Question =>
      ({ id: id(), lessonId, skill, difficulty, type: "order", prompt, steps, explanation, ...extra }),
    classify: (skill: string, difficulty: Difficulty, prompt: string, categories: string[], items: { text: string; cat: number }[], explanation: string, extra: Extra = {}): Question =>
      ({ id: id(), lessonId, skill, difficulty, type: "classify", prompt, categories, items, explanation, ...extra }),
    multi: (skill: string, difficulty: Difficulty, prompt: string, parts: { prompt: string; answer: number; tolerance?: number; unit?: string }[], explanation: string, extra: Extra = {}): Question =>
      ({ id: id(), lessonId, skill, difficulty, type: "multi", prompt, parts, explanation, format: "multistep", ...extra }),
  };
}

/** أسئلة التحقق داخل الشرح لها معرّفات مستقلة: q-<درس>-c-001 */
export const makeCheck = (lessonId: string) => makeQ(lessonId, `${lessonId}-c`);
