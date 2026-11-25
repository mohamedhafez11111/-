"use client";
/**
 * تقدم الطالب ونظام التحفيز — يُحفظ محلياً على الجهاز فقط.
 * لا يمثل أداء الطالب على أجهزة أخرى ما لم تُفعّل حسابات ومزامنة سحابية.
 */
import { useMemo } from "react";
import { useLocal, readLS, writeLS } from "./storage";
import type { Question } from "@/content/types";
import { LESSONS, SKILL_BY_ID, UNITS, BANK_QUESTIONS } from "@/content";

export interface ProgressState {
  v: 1;
  xp: number;
  lessons: Record<string, { opened: number; sections: string[]; completed?: number; quizBest?: number }>;
  answers: Record<string, { c: number; w: number; last: boolean; ts: number }>;
  skills: Record<string, { c: number; w: number }>;
  exams: { id: string; title: string; ts: number; score: number; total: number; pct: number; weak: string[] }[];
  games: { game: string; ts: number; score: number }[];
  activity: { ts: number; text: string; href?: string }[];
  badges: string[];
  daily: { date: string; done: number };
  streak: { last: string; count: number };
  lastLesson?: string;
}

export const EMPTY_PROGRESS: ProgressState = {
  v: 1, xp: 0, lessons: {}, answers: {}, skills: {}, exams: [], games: [], activity: [], badges: [],
  daily: { date: "", done: 0 }, streak: { last: "", count: 0 },
};

const KEY = "progress";

export const XP = { correct: 10, correctHard: 15, lessonSection: 5, lessonComplete: 40, exam: 30, game: 15, daily: 50 };

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const LEVELS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000, 5200];
export const LEVEL_NAMES = ["مبتدئ", "مستكشف", "متعلّم نشط", "باحث", "متمكّن", "متقدّم", "خبير", "متميّز", "نجم الرياضيات", "عبقري", "أسطورة"];

export function levelOf(xp: number) {
  let lvl = 0;
  while (lvl + 1 < LEVELS.length && xp >= LEVELS[lvl + 1]) lvl++;
  const cur = LEVELS[lvl], next = LEVELS[lvl + 1] ?? cur;
  return { level: lvl + 1, name: LEVEL_NAMES[lvl], cur, next, pct: next > cur ? (xp - cur) / (next - cur) : 1 };
}

export interface BadgeDef { id: string; name: string; desc: string; icon: string; test: (p: ProgressState) => boolean }

export const BADGES: BadgeDef[] = [
  { id: "first-step", name: "الخطوة الأولى", desc: "أجبت عن أول سؤال", icon: "🌱", test: (p) => Object.keys(p.answers).length >= 1 },
  { id: "ten-right", name: "عشرة صحيحة", desc: "10 إجابات صحيحة", icon: "🎯", test: (p) => Object.values(p.answers).filter((a) => a.c > 0).length >= 10 },
  { id: "fifty-right", name: "رامي الأهداف", desc: "50 إجابة صحيحة", icon: "🏹", test: (p) => Object.values(p.answers).filter((a) => a.c > 0).length >= 50 },
  { id: "first-lesson", name: "أول درس", desc: "أكملت درساً كاملاً", icon: "📘", test: (p) => Object.values(p.lessons).some((l) => l.completed) },
  { id: "five-lessons", name: "قارئ نهم", desc: "أكملت 5 دروس", icon: "📚", test: (p) => Object.values(p.lessons).filter((l) => l.completed).length >= 5 },
  { id: "all-lessons", name: "ختمت المنهج", desc: "أكملت جميع دروس الفصل الأول", icon: "🏆", test: (p) => LESSONS.every((l) => p.lessons[l.id]?.completed) },
  { id: "unit-master", name: "سيد الوحدة", desc: "أتقنت جميع مهارات وحدة", icon: "👑", test: (p) => UNITS.some((u) => unitMastery(p, u.id) >= 0.8) },
  { id: "exam-90", name: "امتياز", desc: "90% أو أكثر في اختبار", icon: "⭐", test: (p) => p.exams.some((e) => e.pct >= 90) },
  { id: "gamer", name: "لاعب ذكي", desc: "لعبت 5 ألعاب", icon: "🎮", test: (p) => p.games.length >= 5 },
  { id: "daily", name: "التزام يومي", desc: "أنهيت التحدي اليومي", icon: "📅", test: (p) => p.daily.done >= 5 },
  { id: "streak-3", name: "ثلاثة أيام متتالية", desc: "تعلّمت 3 أيام متتالية", icon: "🔥", test: (p) => p.streak.count >= 3 },
  { id: "xp-1000", name: "ألف نقطة", desc: "جمعت 1000 نقطة خبرة", icon: "💎", test: (p) => p.xp >= 1000 },
];

function withBadges(p: ProgressState): { p: ProgressState; newBadges: BadgeDef[] } {
  const newBadges = BADGES.filter((b) => !p.badges.includes(b.id) && b.test(p));
  if (!newBadges.length) return { p, newBadges };
  return { p: { ...p, badges: [...p.badges, ...newBadges.map((b) => b.id)] }, newBadges };
}

function touchStreak(p: ProgressState): ProgressState {
  const t = today();
  if (p.streak.last === t) return p;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const ys = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  return { ...p, streak: { last: t, count: p.streak.last === ys ? p.streak.count + 1 : 1 } };
}

function addActivity(p: ProgressState, text: string, href?: string): ProgressState {
  return { ...p, activity: [{ ts: Date.now(), text, href }, ...p.activity].slice(0, 30) };
}

/** تحديث التقدم وإطلاق حدث للشارات الجديدة */
export function updateProgress(fn: (p: ProgressState) => ProgressState) {
  const cur = { ...EMPTY_PROGRESS, ...readLS<ProgressState>(KEY, EMPTY_PROGRESS) };
  const { p, newBadges } = withBadges(touchStreak(fn(cur)));
  writeLS(KEY, p);
  if (newBadges.length && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("m10-badge", { detail: newBadges.map((b) => ({ name: b.name, icon: b.icon })) }));
  }
  return p;
}

export function recordAnswer(q: Question, correct: boolean, opts: { silent?: boolean } = {}) {
  updateProgress((p) => {
    const a = p.answers[q.id] ?? { c: 0, w: 0, last: false, ts: 0 };
    const s = p.skills[q.skill] ?? { c: 0, w: 0 };
    const firstCorrect = correct && a.c === 0;
    let next: ProgressState = {
      ...p,
      answers: { ...p.answers, [q.id]: { c: a.c + (correct ? 1 : 0), w: a.w + (correct ? 0 : 1), last: correct, ts: Date.now() } },
      skills: { ...p.skills, [q.skill]: { c: s.c + (correct ? 1 : 0), w: s.w + (correct ? 0 : 1) } },
      xp: p.xp + (firstCorrect ? (q.difficulty >= 3 ? XP.correctHard : XP.correct) : correct ? 2 : 0),
    };
    if (!correct) {
      // حفظ تلقائي للأسئلة الخاطئة في «أخطائي»
      const mistakes = readLS<string[]>("mistakes", []);
      if (!mistakes.includes(q.id) && !q.id.startsWith("gen-")) writeLS("mistakes", [q.id, ...mistakes].slice(0, 200));
    }
    if (!opts.silent) next = addActivity(next, correct ? `أجبت إجابة صحيحة (${SKILL_BY_ID[q.skill]?.name ?? "سؤال"})` : `راجع مهارة: ${SKILL_BY_ID[q.skill]?.name ?? ""}`, `/lessons/${q.lessonId}`);
    return next;
  });
}

export function openLesson(id: string) {
  updateProgress((p) => {
    const l = p.lessons[id] ?? { opened: 0, sections: [] };
    const first = !p.lessons[id];
    let n: ProgressState = { ...p, lastLesson: id, lessons: { ...p.lessons, [id]: { ...l, opened: Date.now() } } };
    if (first) n = addActivity(n, `بدأت درس ${id}`, `/lessons/${id}`);
    return n;
  });
}

export function markSection(lessonId: string, sectionId: string) {
  updateProgress((p) => {
    const l = p.lessons[lessonId] ?? { opened: Date.now(), sections: [] };
    if (l.sections.includes(sectionId)) return p;
    return { ...p, xp: p.xp + XP.lessonSection, lessons: { ...p.lessons, [lessonId]: { ...l, sections: [...l.sections, sectionId] } } };
  });
}

export function completeLesson(lessonId: string, quizPct: number) {
  updateProgress((p) => {
    const l = p.lessons[lessonId] ?? { opened: Date.now(), sections: [] };
    const already = !!l.completed;
    let n: ProgressState = {
      ...p,
      xp: p.xp + (already ? 0 : XP.lessonComplete),
      lessons: { ...p.lessons, [lessonId]: { ...l, completed: l.completed ?? Date.now(), quizBest: Math.max(l.quizBest ?? 0, quizPct) } },
    };
    n = addActivity(n, `أنهيت اختبار الدرس ${lessonId} بنسبة ${Math.round(quizPct)}%`, `/lessons/${lessonId}`);
    return n;
  });
}

export function recordExam(e: Omit<ProgressState["exams"][number], "ts">) {
  updateProgress((p) => addActivity({ ...p, xp: p.xp + XP.exam, exams: [{ ...e, ts: Date.now() }, ...p.exams].slice(0, 50) }, `${e.title}: ${Math.round(e.pct)}%`, "/exams"));
}

export function recordGame(game: string, title: string, score: number) {
  updateProgress((p) => addActivity({ ...p, xp: p.xp + XP.game + Math.min(50, Math.floor(score / 2)), games: [{ game, ts: Date.now(), score }, ...p.games].slice(0, 100) }, `لعبت «${title}» وحصلت على ${score} نقطة`, `/games/${game}`));
}

export function recordDaily(done: number) {
  updateProgress((p) => {
    const t = today();
    const before = p.daily.date === t ? p.daily.done : 0;
    const bonus = before < 5 && done >= 5 ? XP.daily : 0;
    return { ...p, xp: p.xp + bonus, daily: { date: t, done } };
  });
}

export function resetProgress() {
  writeLS(KEY, EMPTY_PROGRESS);
  writeLS("mistakes", []);
}

// ---------- مؤشرات ----------
export function skillMastery(p: ProgressState, skill: string): number | null {
  const s = p.skills[skill];
  if (!s || s.c + s.w === 0) return null;
  // متوسط مرجّح يميل إلى الحذر مع قلة المحاولات
  return s.c / (s.c + s.w + 1);
}

export function unitMastery(p: ProgressState, unitId: string): number {
  const skills = LESSONS.filter((l) => l.unitId === unitId).flatMap((l) => l.skills.map((s) => s.id));
  const vals = skills.map((s) => skillMastery(p, s) ?? 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export function lessonProgress(p: ProgressState, lessonId: string): number {
  const l = p.lessons[lessonId];
  const lesson = LESSONS.find((x) => x.id === lessonId)!;
  if (!l) return 0;
  if (l.completed) return 1;
  return Math.min(0.9, l.sections.length / (lesson.sections.length + 1));
}

export function curriculumProgress(p: ProgressState): number {
  return LESSONS.reduce((a, l) => a + lessonProgress(p, l.id), 0) / LESSONS.length;
}

export function weakSkills(p: ProgressState, limit = 6) {
  return Object.entries(p.skills)
    .filter(([, s]) => s.w > 0 && s.c + s.w >= 2)
    .map(([id, s]) => ({ id, name: SKILL_BY_ID[id]?.name ?? id, lessonId: SKILL_BY_ID[id]?.lessonId, acc: s.c / (s.c + s.w), w: s.w }))
    .filter((s) => s.acc < 0.75)
    .sort((a, b) => a.acc - b.acc || b.w - a.w)
    .slice(0, limit);
}

export function stats(p: ProgressState) {
  const answered = Object.values(p.answers);
  const attempts = answered.reduce((a, x) => a + x.c + x.w, 0);
  const correct = answered.reduce((a, x) => a + x.c, 0);
  return {
    answeredQuestions: answered.length,
    attempts,
    correct,
    accuracy: attempts ? correct / attempts : 0,
    lessonsCompleted: Object.values(p.lessons).filter((l) => l.completed).length,
    bankCoverage: BANK_QUESTIONS.length ? BANK_QUESTIONS.filter((q) => p.answers[q.id]).length / BANK_QUESTIONS.length : 0,
  };
}

export function useProgress() {
  const [p, , ready] = useLocal<ProgressState>(KEY, EMPTY_PROGRESS);
  const merged = useMemo(() => ({ ...EMPTY_PROGRESS, ...p }), [p]);
  return { p: merged, ready };
}
