"use client";
/**
 * تخزين محلي آمن على جهاز الطالب (localStorage) مع مزامنة بين المكوّنات.
 * جميع القراءات والكتابات داخل try/catch لأن التخزين قد يكون معطلاً (وضع التصفح الخاص).
 */
import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "m10:";
const EVT = "m10-storage";

export function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeLS<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVT, { detail: key }));
    return true;
  } catch {
    return false;
  }
}

export function removeLS(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
    window.dispatchEvent(new CustomEvent(EVT, { detail: key }));
  } catch { /* تجاهل */ }
}

/** جميع المفاتيح التابعة للمنصة (للتصدير والنسخ الاحتياطي) */
export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k) ?? "null");
    }
  } catch { /* تجاهل */ }
  return out;
}

export function importAll(data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) writeLS(k, v);
}

/** حالة React مخزنة محلياً ومتزامنة بين جميع المكوّنات التي تستخدم المفتاح نفسه */
export function useLocal<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const ref = useRef(value);
  ref.current = value;

  useEffect(() => {
    setValue(readLS(key, initial));
    setReady(true);
    const onChange = (e: Event) => {
      const k = (e as CustomEvent).detail;
      if (k === key) setValue(readLS(key, initial));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFIX + key) setValue(readLS(key, initial));
    };
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(readLS(key, ref.current)) : v;
      setValue(next);
      writeLS(key, next);
    },
    [key],
  );
  return [value, set, ready];
}
