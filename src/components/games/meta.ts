import type { GameId } from "@/content/types";

export const GAME_META: Record<GameId, { title: string; desc: string; emoji: string; color: string; skills: string }> = {
  speed: { title: "تحدي السرعة الحسابية", desc: "أجب عن أكبر عدد من الأسئلة في 60 ثانية. كل إجابة متتالية صحيحة تضاعف نقاطك.", emoji: "⚡", color: "#2b7de9", skills: "جميع الوحدات" },
  catcher: { title: "صائد الإجابة الصحيحة", desc: "الإجابات تتساقط! التقط الإجابة الصحيحة قبل أن تصل إلى الأسفل. لديك 3 محاولات.", emoji: "🎯", color: "#0e9f6e", skills: "الوحدات 1، 4، 5، 6، 8" },
  race: { title: "سباق حل المسائل", desc: "فريقان يتسابقان على السبورة: كل إجابة صحيحة تقدّم الفريق خطوة نحو خط النهاية.", emoji: "🏁", color: "#ea580c", skills: "مناسبة للصف والسبورة التفاعلية" },
  "spot-error": { title: "اكتشف الخطأ", desc: "حلول فيها خطوة خاطئة واحدة. هل تستطيع اكتشافها؟", emoji: "🔍", color: "#dc2626", skills: "أخطاء شائعة من كل الوحدات" },
  complete: { title: "أكمل الحل", desc: "خطوة مفقودة في الحل؛ اختر الخطوة الصحيحة لإكماله.", emoji: "🧩", color: "#7c3aed", skills: "خطوات الحل في كل الوحدات" },
  "graph-challenge": { title: "تحدي الرسوم البيانية", desc: "اقرأ التمثيل البياني: الميل، معادلة المستقيم، السرعة من تمثيل المسافة-الزمن.", emoji: "📈", color: "#0891b2", skills: "الوحدة 1" },
  "data-sort": { title: "لعبة تصنيف البيانات", desc: "صنّف كل بطاقة بسرعة: نوعية أم عددية منفصلة أم عددية متصلة؟", emoji: "🗂️", color: "#db2777", skills: "الوحدة 2" },
  "circle-angles": { title: "تحدي الدوائر والزوايا", desc: "أوجد الزاوية المجهولة مستخدماً نظريات الدائرة.", emoji: "⭕", color: "#d97706", skills: "الوحدة 4" },
  "function-builder": { title: "لعبة بناء الدالة", desc: "ابنِ مخطط تدفق يحوّل المدخلات إلى المخرجات المطلوبة.", emoji: "🔧", color: "#4f46e5", skills: "الوحدة 8" },
  "lp-challenge": { title: "تحدي البرمجة الخطية", desc: "اختر الرأس الذي يعطي أكبر (أو أصغر) قيمة للعبارة داخل المنطقة.", emoji: "🧭", color: "#16a34a", skills: "الوحدة 1" },
};

export const GAME_IDS = Object.keys(GAME_META) as GameId[];
