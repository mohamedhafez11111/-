"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Icon } from "./Icon";
import type { IconName, Unit } from "@/content/types";
import { Num } from "./MathText";
import { readLS, writeLS } from "@/lib/storage";
import type { Announcement, TeacherExam, LessonNote } from "@/lib/server/store";
import type { Question } from "@/content/types";

export function PageHeader({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: IconName; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-200"><Icon name={icon} size={26} /></span>}
        <div>
          <h1 className="text-2xl font-bold leading-tight sm:text-[1.7rem]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl muted">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = "#1d63c9", label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity={0.1} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - v)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-bold"><Num>{`${Math.round(v * 100)}%`}</Num></span>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

export function Bar({ value, color = "#1d63c9" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, background: color }} />
    </div>
  );
}

export function UnitBadge({ unit, size = 44 }: { unit: Unit; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-2xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${unit.color}, ${unit.color}cc)`, width: size, height: size }}>
      <Icon name={unit.icon} size={Math.round(size * 0.55)} />
    </span>
  );
}

export function Empty({ icon = "star", title, children }: { icon?: IconName; title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-black/5 dark:bg-white/10"><Icon name={icon} size={28} /></span>
      <div className="font-bold">{title}</div>
      {children && <div className="text-sm muted">{children}</div>}
    </div>
  );
}

export function LinkCard({ href, icon, title, desc, color }: { href: string; icon: IconName; title: string; desc?: string; color?: string }) {
  return (
    <Link href={href} className="card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: color ?? "#1d63c9" }}><Icon name={icon} /></span>
      <span className="min-w-0">
        <span className="block font-bold">{title}</span>
        {desc && <span className="block truncate text-sm muted">{desc}</span>}
      </span>
    </Link>
  );
}

export interface PublicContent {
  announcements: Announcement[];
  questions: Question[];
  hiddenQuestions: string[];
  exams: TeacherExam[];
  lessonNotes: LessonNote[];
}
const EMPTY_PUBLIC: PublicContent = { announcements: [], questions: [], hiddenQuestions: [], exams: [], lessonNotes: [] };

/** محتوى يضيفه المعلم من لوحة الإدارة (يُحدَّث دون إعادة بناء التطبيق) مع نسخة محلية للعمل دون اتصال */
export function usePublicContent(): { data: PublicContent; loaded: boolean; offline: boolean } {
  const [data, setData] = useState<PublicContent>(EMPTY_PUBLIC);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    setData(readLS("public-content", EMPTY_PUBLIC));
    fetch("/api/content", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: PublicContent) => { setData({ ...EMPTY_PUBLIC, ...d }); writeLS("public-content", d); })
      .catch(() => setOffline(true))
      .finally(() => setLoaded(true));
  }, []);
  return { data, loaded, offline };
}
