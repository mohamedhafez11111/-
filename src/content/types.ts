/**
 * نموذج بيانات المحتوى التعليمي.
 * Curriculum → Units → Lessons → (Objectives, Concepts/Sections, Rules, Examples, Activities, Questions, Labs)
 * لكل وحدة ودرس وسؤال معرّف ثابت لا يتغير.
 */

export type UnitId = "u1" | "u2" | "u3" | "u4" | "u5" | "u6" | "u7" | "u8";
export type Level = "basic" | "intermediate" | "advanced";
/** 1 سهل، 2 متوسط، 3 متقدم، 4 تحدٍّ وإثراء */
export type Difficulty = 1 | 2 | 3 | 4;

export const LEVEL_LABEL: Record<Level, string> = {
  basic: "أساسي",
  intermediate: "متوسط",
  advanced: "متقدم",
};
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "سهل", 2: "متوسط", 3: "متقدم", 4: "تحدٍّ وإثراء" };

export type LabId =
  | "conversion"
  | "regions"
  | "linear-programming"
  | "gradient"
  | "motion"
  | "data-organizer"
  | "charts"
  | "algebraic-fractions"
  | "circle-symmetry"
  | "circle-angles"
  | "stats-measures"
  | "box-plot"
  | "proportion"
  | "scatter"
  | "histogram"
  | "cumulative"
  | "functions";

export type GameId =
  | "speed"
  | "catcher"
  | "race"
  | "spot-error"
  | "complete"
  | "graph-challenge"
  | "data-sort"
  | "circle-angles"
  | "function-builder"
  | "lp-challenge";

export interface Unit {
  id: UnitId;
  number: number;
  title: string;
  color: string; // لون مميز (hex)
  icon: IconName;
  description: string;
  lessonIds: string[];
  /** رقم صفحة بداية الوحدة في كتاب الطالب */
  sbPage: number;
  /** صفحة التمارين المتنوعة في كتاب النشاط */
  abMixedPage?: number;
}

export type IconName =
  | "graph" | "data" | "algebra" | "circle" | "stats" | "ratio" | "scatter" | "function"
  | "home" | "map" | "book" | "bot" | "board" | "flask" | "bank" | "exam" | "game" | "notes"
  | "review" | "trophy" | "tools" | "admin" | "menu" | "close" | "check" | "x" | "star" | "bolt"
  | "arrow-left" | "arrow-right" | "bulb" | "alert" | "play" | "pause" | "download" | "upload"
  | "trash" | "undo" | "redo" | "pen" | "eraser" | "select" | "text" | "line" | "arrow" | "square"
  | "triangle" | "grid" | "axes" | "image" | "expand" | "calc" | "bookmark" | "flame" | "wifi-off" | "send" | "camera" | "settings" | "print" | "plus" | "minus" | "refresh" | "clock" | "flag" | "eye";

export interface Skill {
  id: string; // مثال: "1-1.read-conversion"
  name: string;
}

// ---------- الأشكال (تُرسم برمجياً بـ SVG) ----------
export type Figure =
  | {
      kind: "plane";
      x: [number, number];
      y: [number, number];
      xLabel?: string;
      yLabel?: string;
      step?: [number, number];
      /** منحنيات بدلالة س بصيغة نصية، أو مضلعات بنقاط */
      curves?: { expr?: string; points?: [number, number][]; color?: string; dashed?: boolean; label?: string; domain?: [number, number] }[];
      points?: { at: [number, number]; label?: string; color?: string }[];
      /** مناطق: متباينات خطية (أ س + ب ص  رمز  جـ) */
      regions?: { a: number; b: number; op: "<" | "<=" | ">" | ">="; c: number }[];
      shadeMode?: "wanted" | "unwanted";
      height?: number;
    }
  | { kind: "bars"; labels: string[]; values: number[]; title?: string; yLabel?: string; color?: string }
  | { kind: "histogram"; classes: { lower: number; upper: number; freq: number }[]; density?: boolean; xLabel?: string }
  | { kind: "box"; five: [number, number, number, number, number]; range: [number, number]; label?: string; second?: { five: [number, number, number, number, number]; label: string } }
  | { kind: "pie"; labels: string[]; values: number[] }
  | { kind: "scatter"; points: [number, number][]; xLabel?: string; yLabel?: string; line?: boolean }
  | { kind: "cumulative"; classes: { lower: number; upper: number; freq: number }[]; xLabel?: string; marks?: number[] }
  | { kind: "circle"; preset: CirclePreset; values?: Record<string, string | number> }
  | { kind: "table"; head: string[]; rows: (string | number)[][]; caption?: string }
  | { kind: "stemleaf"; stems: number[]; leaves: number[][]; key: string };

export type CirclePreset =
  | "chord-perpendicular"
  | "two-tangents"
  | "semicircle"
  | "tangent-radius"
  | "centre-angle"
  | "same-segment"
  | "cyclic-quad"
  | "alternate-segment";

// ---------- الأسئلة ----------
interface QBase {
  id: string; // ثابت: "q-1-1-001"
  lessonId: string;
  skill: string; // معرّف المهارة
  difficulty: Difficulty;
  prompt: string;
  figure?: Figure;
  hint?: string;
  /** شرح سبب صحة الإجابة */
  explanation: string;
  /** تصنيف إضافي لعرض نوع السؤال */
  format?: "graph" | "table" | "multistep" | "word";
  /** مصدر السؤال: أصلي أو مضاف من المعلم */
  source?: "original" | "teacher";
}

export type Question =
  | (QBase & { type: "mcq"; options: string[]; answer: number; /** أسباب الخطأ لكل خيار */ distractorNotes?: (string | undefined)[]; shuffle?: boolean })
  | (QBase & { type: "tf"; answer: boolean })
  | (QBase & { type: "numeric"; answer: number; tolerance?: number; unit?: string })
  | (QBase & { type: "fill"; /** النص يحتوي ___ لكل فراغ */ answers: (string | number)[][] })
  | (QBase & { type: "short"; accept: string[]; mode: "text" | "expr" })
  | (QBase & { type: "match"; pairs: [string, string][] })
  | (QBase & { type: "order"; steps: string[] })
  | (QBase & { type: "classify"; categories: string[]; items: { text: string; cat: number }[] })
  | (QBase & { type: "multi"; parts: { prompt: string; answer: number; tolerance?: number; unit?: string }[] });

export type QuestionType = Question["type"];

export const QTYPE_LABEL: Record<QuestionType, string> = {
  mcq: "اختيار من متعدد",
  tf: "صح أو خطأ",
  numeric: "إجابة رقمية",
  fill: "أكمل الفراغ",
  short: "إجابة قصيرة",
  match: "مطابقة",
  order: "ترتيب خطوات الحل",
  classify: "سحب وإفلات (تصنيف)",
  multi: "مسألة متعددة الخطوات",
};

// ---------- الدرس ----------
export type Block =
  | { type: "p"; text: string }
  | { type: "rule"; title: string; text: string }
  | { type: "note"; tone: "info" | "warn" | "tip" | "prev"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "figure"; figure: Figure; caption?: string }
  | { type: "check"; question: Question }
  | { type: "widget"; lab: LabId; caption?: string }
  | { type: "steps"; title: string; steps: string[] }
  | { type: "levels"; basic: string; intermediate: string; advanced: string };

export interface Section {
  id: string;
  /** رمز الجزء كما في الكتاب، مثل "1-2أ" */
  code?: string;
  title: string;
  blocks: Block[];
}

export interface WorkedExample {
  id: string;
  level: Level;
  title: string;
  problem: string;
  figure?: Figure;
  steps: { text: string; why?: string }[];
  answer: string;
}

export interface Lesson {
  id: string; // "1-1"
  unitId: UnitId;
  title: string;
  /** صفحة الدرس في كتاب الطالب ونطاق صفحات كتاب النشاط */
  sbPage: number;
  abPages: string;
  objectives: string[];
  prerequisites: { text: string; lessonId?: string }[];
  hook: string;
  sections: Section[];
  rules: { title: string; text: string }[];
  examples: WorkedExample[];
  realLife: string[];
  mistakes: { wrong: string; right: string }[];
  summary: string[];
  skills: Skill[];
  labs: LabId[];
  games: GameId[];
  /** ملاحظات تحتاج إلى مراجعة المعلم (لا نخمّن) */
  reviewNotes?: string[];
  vocabulary?: { ar: string; en: string }[];
}
