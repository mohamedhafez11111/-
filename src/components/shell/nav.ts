import type { IconName } from "@/content/types";

export const NAV: { href: string; label: string; icon: IconName; group?: "learn" | "practice" | "me" | "admin" }[] = [
  { href: "/", label: "الرئيسية", icon: "home", group: "learn" },
  { href: "/curriculum", label: "خريطة المنهج", icon: "map", group: "learn" },
  { href: "/lessons", label: "مكتبة الدروس", icon: "book", group: "learn" },
  { href: "/tutor", label: "المعلم الذكي", icon: "bot", group: "learn" },
  { href: "/whiteboard", label: "السبورة التفاعلية", icon: "board", group: "learn" },
  { href: "/labs", label: "المختبرات الرياضية", icon: "flask", group: "learn" },
  { href: "/bank", label: "بنك الأسئلة", icon: "bank", group: "practice" },
  { href: "/exams", label: "الاختبارات الإلكترونية", icon: "exam", group: "practice" },
  { href: "/games", label: "الألعاب والتحديات", icon: "game", group: "practice" },
  { href: "/review", label: "المراجعة والاستعداد", icon: "review", group: "practice" },
  { href: "/notes", label: "ملخصاتي وملاحظاتي", icon: "notes", group: "me" },
  { href: "/progress", label: "إنجازاتي وتقدمي", icon: "trophy", group: "me" },
  { href: "/tools", label: "أدوات الرياضيات", icon: "tools", group: "me" },
  { href: "/admin", label: "لوحة المعلم", icon: "admin", group: "admin" },
];

export const NAV_VISIBLE = process.env.NEXT_PUBLIC_STATIC === "1" ? NAV.filter((n) => n.href !== "/admin") : NAV;

export const BOTTOM_NAV = ["/", "/lessons", "/exams", "/games"];
