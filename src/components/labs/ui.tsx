"use client";
import React from "react";
import { Num, MathText } from "@/components/ui/MathText";
import type { Ineq } from "@/components/figures/Plane";
import { Icon } from "@/components/ui/Icon";

export function Slider({ label, value, min, max, step = 1, onChange, unit }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-sm"><span className="font-semibold">{label}</span><span className="rounded bg-black/5 px-2 font-bold dark:bg-white/10"><Num>{String(Number(value.toFixed(4)))}</Num>{unit ? ` ${unit}` : ""}</span></span>
      <input type="range" className="w-full accent-brand-600" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function NumField({ label, value, onChange, step = 1, className }: { label: string; value: number; onChange: (v: number) => void; step?: number; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-semibold muted">{label}</span>
      <input type="number" className="input !min-h-[40px] text-center ltr" dir="ltr" value={Number.isFinite(value) ? value : ""} step={step} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
    </label>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border line p-3">
      <div className="text-xs muted">{label}</div>
      <div className="text-lg font-bold">{typeof value === "string" || typeof value === "number" ? <MathText text={String(value)} /> : value}</div>
      {hint && <div className="text-xs muted">{hint}</div>}
    </div>
  );
}

export function LabGrid({ controls, children }: { controls: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-3">{children}</div>
      <div className="space-y-3">{controls}</div>
    </div>
  );
}

export const OPS: Ineq["op"][] = ["<", "<=", ">", ">="];
export const OP_LABEL: Record<Ineq["op"], string> = { "<": "<", "<=": "≤", ">": ">", ">=": "≥" };

export function ineqText(q: Ineq): string {
  const t = (k: number, v: string, first: boolean) => {
    if (k === 0) return "";
    const sign = k < 0 ? (first ? "-" : " - ") : first ? "" : " + ";
    const a = Math.abs(k);
    return `${sign}${a === 1 ? "" : a}${v}`;
  };
  let lhs = t(q.a, "س", true);
  lhs += t(q.b, "ص", !lhs);
  return `${lhs || "0"} ${OP_LABEL[q.op]} ${q.c}`;
}

export function IneqEditor({ list, onChange, max = 6 }: { list: Ineq[]; onChange: (l: Ineq[]) => void; max?: number }) {
  const upd = (i: number, patch: Partial<Ineq>) => onChange(list.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  return (
    <div className="space-y-2">
      {list.map((q, i) => (
        <div key={i} className="rounded-xl border line p-2">
          <div className="mb-1 flex items-center justify-between text-sm font-bold"><MathText text={ineqText(q)} /><button className="muted" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="حذف"><Icon name="trash" size={16} /></button></div>
          <div className="grid grid-cols-4 items-end gap-1.5">
            <NumField label="معامل س" value={q.a} onChange={(v) => upd(i, { a: v })} />
            <NumField label="معامل ص" value={q.b} onChange={(v) => upd(i, { b: v })} />
            <label className="block"><span className="mb-1 block text-xs font-semibold muted">الرمز</span>
              <select className="input !min-h-[40px] !px-1 text-center" value={q.op} onChange={(e) => upd(i, { op: e.target.value as Ineq["op"] })}>{OPS.map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}</select>
            </label>
            <NumField label="الثابت" value={q.c} onChange={(v) => upd(i, { c: v })} />
          </div>
        </div>
      ))}
      {list.length < max && <button className="btn btn-ghost w-full !min-h-[40px] text-sm" onClick={() => onChange([...list, { a: 1, b: 1, op: "<=", c: 4 }])}><Icon name="plus" size={16} /> أضف متباينة</button>}
    </div>
  );
}
