"use client";
/**
 * هل المعلم الذكي متاح؟ يُسأل الخادم مرة واحدة لكل جلسة.
 * عند عدم ضبط مفتاح الخدمة (أو في النسخة المبسّطة) تُخفى كل أزرار المعلم الذكي عن الطلاب،
 * وتظهر تلقائياً عند إضافة المفتاح لاحقاً دون أي تعديل في الكود.
 */
import { useEffect, useState } from "react";

let cache: boolean | null = null;
let pending: Promise<boolean> | null = null;

function check(): Promise<boolean> {
  if (cache !== null) return Promise.resolve(cache);
  if (process.env.NEXT_PUBLIC_STATIC === "1") return Promise.resolve((cache = false));
  pending ??= fetch("/api/tutor", { cache: "no-store" })
    .then((r) => r.json())
    .then((d: { available?: boolean }) => (cache = !!d.available))
    .catch(() => false);
  return pending;
}

export function useTutorAvailable(): boolean {
  const [v, setV] = useState<boolean>(cache ?? false);
  useEffect(() => { let alive = true; check().then((x) => alive && setV(x)); return () => { alive = false; }; }, []);
  return v;
}
