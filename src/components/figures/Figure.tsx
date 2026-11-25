"use client";
import React from "react";
import type { Figure as FigureSpec } from "@/content/types";
import { Plane } from "./Plane";
import { BarChart, BoxPlot, CumulativeCurve, Histogram, PieChart, Scatter } from "./Charts";
import { CircleDiagram } from "./CircleDiagram";
import { MathText, Num } from "@/components/ui/MathText";

/** علامات العد: مجموعات من خمسة */
export function Tally({ n }: { n: number }) {
  const groups = Math.floor(n / 5), rest = n % 5;
  const G = ({ k }: { k: number }) => (
    <svg width={6 + 7 * Math.min(k, 4)} height={22} viewBox={`0 0 ${6 + 7 * Math.min(k, 4)} 22`} className="inline-block" aria-hidden>
      {Array.from({ length: Math.min(k, 4) }, (_, i) => <line key={i} x1={4 + 7 * i} x2={4 + 7 * i} y1={3} y2={19} stroke="currentColor" strokeWidth={2} />)}
      {k === 5 && <line x1={0} y1={17} x2={6 + 7 * 4} y2={5} stroke="currentColor" strokeWidth={2} />}
    </svg>
  );
  return (
    <span className="inline-flex flex-wrap items-center gap-2 ltr" aria-label={`${n} علامة عد`}>
      {Array.from({ length: groups }, (_, i) => <G key={i} k={5} />)}
      {rest > 0 && <G k={rest} />}
    </span>
  );
}

function Cell({ v }: { v: string | number }) {
  if (typeof v === "string" && v.startsWith("@tally:")) return <Tally n={Number(v.slice(7))} />;
  return typeof v === "number" ? <Num>{v}</Num> : <MathText text={v} />;
}

export function DataTable({ head, rows, caption }: { head: string[]; rows: (string | number)[][]; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-center text-sm">
        {caption && <caption className="mb-2 text-xs muted">{caption}</caption>}
        <thead>
          <tr>{head.map((h, i) => <th key={i} className="border line bg-brand-50 px-3 py-2 font-bold dark:bg-brand-900/40"><MathText text={h} /></th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-black/[0.015]">{r.map((c, j) => <td key={j} className="border line px-3 py-2"><Cell v={c} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StemLeaf({ stems, leaves, keyText: k, rightLeaves }: { stems: number[]; leaves: number[][]; keyText: string; rightLeaves?: number[][] }) {
  return (
    <div className="inline-block overflow-x-auto rounded-xl border line p-3">
      <table className="text-lg">
        <thead><tr className="text-xs muted">{rightLeaves && <th className="px-2 text-left">الورقة</th>}<th className="px-2">الساق</th><th className="px-2 text-right">الورقة</th></tr></thead>
        <tbody>
          {stems.map((s, i) => (
            <tr key={s}>
              {rightLeaves && <td className="px-2 text-left tracking-[.4em] ltr">{[...(rightLeaves[i] ?? [])].reverse().map((x, j) => <Num key={j}>{x}</Num>)}</td>}
              <td className="border-x-2 border-current px-3 text-center font-bold"><Num>{s}</Num></td>
              <td className="px-2 tracking-[.4em]">{(leaves[i] ?? []).map((x, j) => <span key={j} className="inline-block w-4 text-center"><Num>{x}</Num></span>)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs muted">المفتاح: <MathText text={k} /></div>
    </div>
  );
}

export function Figure({ fig }: { fig: FigureSpec }) {
  switch (fig.kind) {
    case "plane":
      return <Plane x={fig.x} y={fig.y} step={fig.step} xLabel={fig.xLabel} yLabel={fig.yLabel} curves={fig.curves} points={fig.points} regions={fig.regions} shadeMode={fig.shadeMode} height={fig.height} />;
    case "bars":
      return <BarChart labels={fig.labels} values={fig.values} yLabel={fig.yLabel} color={fig.color} />;
    case "histogram":
      return <Histogram classes={fig.classes} density={fig.density} xLabel={fig.xLabel} />;
    case "box":
      return <BoxPlot five={fig.five} range={fig.range} label={fig.label} second={fig.second} />;
    case "pie":
      return <PieChart labels={fig.labels} values={fig.values} />;
    case "scatter":
      return <Scatter points={fig.points} xLabel={fig.xLabel} yLabel={fig.yLabel} line={fig.line} />;
    case "cumulative":
      return <CumulativeCurve classes={fig.classes} xLabel={fig.xLabel} marks={fig.marks} />;
    case "circle":
      return <div className="flex justify-center"><CircleDiagram preset={fig.preset} values={fig.values} /></div>;
    case "table":
      return <DataTable head={fig.head} rows={fig.rows} caption={fig.caption} />;
    case "stemleaf":
      return <StemLeaf stems={fig.stems} leaves={fig.leaves} keyText={fig.key} />;
  }
}
