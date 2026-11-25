import type { Lesson, Question, Unit, UnitId } from "./types";
import { UNITS, UNIT_BY_ID } from "./curriculum";
import { U1_LESSONS } from "./lessons/u1";
import { U2_LESSONS } from "./lessons/u2";
import { U3_LESSONS, U4_LESSONS } from "./lessons/u3u4";
import { U5_LESSONS, U6_LESSONS } from "./lessons/u5u6";
import { U7_LESSONS, U8_LESSONS } from "./lessons/u7u8";
import { U1_QUESTIONS } from "./questions/u1";
import { U2_QUESTIONS, U3_QUESTIONS, U4_QUESTIONS } from "./questions/u2u3u4";
import { U5_QUESTIONS, U6_QUESTIONS, U7_QUESTIONS, U8_QUESTIONS } from "./questions/u5to8";

export { UNITS, UNIT_BY_ID };

export const LESSONS: Lesson[] = [
  ...U1_LESSONS, ...U2_LESSONS, ...U3_LESSONS, ...U4_LESSONS, ...U5_LESSONS, ...U6_LESSONS, ...U7_LESSONS, ...U8_LESSONS,
];

export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]));

/** أسئلة البنك الأساسية */
export const BANK_QUESTIONS: Question[] = [
  ...U1_QUESTIONS, ...U2_QUESTIONS, ...U3_QUESTIONS, ...U4_QUESTIONS, ...U5_QUESTIONS, ...U6_QUESTIONS, ...U7_QUESTIONS, ...U8_QUESTIONS,
].map((q) => ({ ...q, source: q.source ?? "original" }));

/** أسئلة التحقق المضمّنة داخل الشرح */
export const CHECK_QUESTIONS: Question[] = LESSONS.flatMap((l) =>
  l.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === "check" ? [b.question] : []))),
);

export const ALL_QUESTIONS: Question[] = [...BANK_QUESTIONS, ...CHECK_QUESTIONS];
export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q]));

export function lessonsOfUnit(unitId: UnitId): Lesson[] {
  return UNIT_BY_ID[unitId].lessonIds.map((id) => LESSON_BY_ID[id]);
}

export function unitOfLesson(lessonId: string): Unit {
  return UNIT_BY_ID[LESSON_BY_ID[lessonId].unitId];
}

export function questionsOfLesson(lessonId: string, includeChecks = false): Question[] {
  return (includeChecks ? ALL_QUESTIONS : BANK_QUESTIONS).filter((q) => q.lessonId === lessonId);
}

export const SKILLS = LESSONS.flatMap((l) => l.skills.map((s) => ({ ...s, lessonId: l.id, unitId: l.unitId })));
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export function skillName(id: string): string {
  return SKILL_BY_ID[id]?.name ?? id;
}

/** الدرس التالي والسابق في ترتيب المنهج */
export function neighbours(lessonId: string): { prev?: Lesson; next?: Lesson } {
  const i = LESSONS.findIndex((l) => l.id === lessonId);
  return { prev: LESSONS[i - 1], next: LESSONS[i + 1] };
}

/** تحويل رقم الدرس إلى الصيغة العربية المستخدمة في الكتاب، مثال "1-2" */
export function lessonLabel(id: string): string {
  return id;
}

/**
 * رمز الدرس كما يظهر في الكتاب: الوحدة على اليمين ثم رقم الدرس (مثلاً الدرس الثاني من الوحدة الأولى يظهر «2-1»).
 * المعرّف الداخلي يبقى "1-2"؛ هذه الدالة للعرض فقط.
 */
export function lc(id: string): string {
  const m = /^(\d+)-(\d+)$/.exec(id);
  return m ? `${m[2]}-${m[1]}` : id;
}

/**
 * رمز الجزء من الدرس كما في الكتاب: "1-2أ" يُعرض من اليسار إلى اليمين «أ-2-1»
 * فيُقرأ من اليمين: الوحدة 1 ثم الدرس 2 ثم الجزء أ. يُعرض داخل عنصر LTR معزول.
 */
export function sc(code: string): string {
  const m = /^(\d+)-(\d+)(.*)$/.exec(code);
  return m ? (m[3] ? `${m[3]}-${m[2]}-${m[1]}` : `${m[2]}-${m[1]}`) : code;
}
