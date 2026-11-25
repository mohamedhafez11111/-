"use client";
/** مخططات إحصائية بـ SVG: أعمدة، مدرج تكراري، صندوقي، دائري، انتشار، تكرار تراكمي */
import React from "react";
import { Plane } from "./Plane";
import { useSettings } from "@/lib/settings";
import { toEasternDigits } from "@/lib/math/expr";
import { bestFitLine } from "@/lib/math/stats";

export const PALETTE = ["#2b7de9", "#0e9f6e", "#ea580c", "#7c3aed", "#db2777", "#0891b2", "#d97706", "#4f46e5"];

function useFmt() {
  const { settings } = useSettings();
  return (v: number | string) => {
    const s = typeof v === "number" ? String(Number(v.toFixed(4))) : v;
    return settings.digits === "eastern" ? toEasternDigits(s) : s;
  };
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

export function BarChart({ labels, values, values2, legend, yLabel, color, horizontal }: { labels: string[]; values: number[]; values2?: number[]; legend?: [string, string]; yLabel?: string; color?: string; horizontal?: boolean }) {
  const f = useFmt();
  const W = 560, H = 320, pl = 46, pb = 54, pt = 18, pr = 12;
  const max = niceMax(Math.max(...values, ...(values2 ?? [0]), 1));
  const ticks = 5;
  const n = labels.length;
  const band = (W - pl - pr) / n;
  const bw = band * (values2 ? 0.36 : 0.6);
  const Y = (v: number) => H - pb - (v / max) * (H - pb - pt);
  if (horizontal) {
    const bandH = (H - pt - pb) / n;
    const X = (v: number) => 110 + (v / max) * (W - 110 - pr);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="أعمدة بيانية أفقية">
        {Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i).map((v) => (
          <g key={v}><line x1={X(v)} x2={X(v)} y1={pt} y2={H - pb} stroke="currentColor" opacity={0.12} /><text x={X(v)} y={H - pb + 16} fontSize={11} textAnchor="middle" fill="currentColor">{f(v)}</text></g>
        ))}
        {labels.map((l, i) => (
          <g key={i}>
            <rect x={110} y={pt + i * bandH + bandH * 0.2} width={X(values[i]) - 110} height={bandH * 0.6} rx={4} fill={color ?? PALETTE[0]} />
            <text x={104} y={pt + i * bandH + bandH / 2 + 4} fontSize={12} textAnchor="end" fill="currentColor">{l}</text>
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="أعمدة بيانية" style={{ direction: "ltr" }}>
      {Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i).map((v) => (
        <g key={v}>
          <line x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} stroke="currentColor" opacity={0.12} />
          <text x={pl - 6} y={Y(v) + 4} fontSize={11} textAnchor="end" fill="currentColor">{f(v)}</text>
        </g>
      ))}
      <line x1={pl} x2={W - pr} y1={Y(0)} y2={Y(0)} stroke="currentColor" opacity={0.6} />
      {labels.map((l, i) => {
        const cx = pl + band * i + band / 2;
        return (
          <g key={i}>
            <rect x={values2 ? cx - bw - 1 : cx - bw / 2} y={Y(values[i])} width={bw} height={Y(0) - Y(values[i])} rx={4} fill={color ?? PALETTE[0]} />
            {values2 && <rect x={cx + 1} y={Y(values2[i])} width={bw} height={Y(0) - Y(values2[i])} rx={4} fill={PALETTE[2]} />}
            <text x={cx} y={Y(values[i]) - 4} fontSize={11} textAnchor="middle" fill="currentColor" opacity={0.8}>{values2 ? "" : f(values[i])}</text>
            <text x={cx} y={H - pb + 18} fontSize={12} textAnchor="middle" fill="currentColor" direction="rtl">{l}</text>
          </g>
        );
      })}
      {yLabel && <text x={6} y={12} fontSize={12} fontWeight={600} fill="currentColor" direction="rtl" textAnchor="end">{yLabel}</text>}
      {legend && values2 && (
        <g fontSize={12} fill="currentColor">
          <rect x={W - 150} y={H - 22} width={12} height={12} fill={color ?? PALETTE[0]} /><text x={W - 154} y={H - 12} textAnchor="start" direction="rtl">{legend[0]}</text>
          <rect x={W - 290} y={H - 22} width={12} height={12} fill={PALETTE[2]} /><text x={W - 294} y={H - 12} textAnchor="start" direction="rtl">{legend[1]}</text>
        </g>
      )}
    </svg>
  );
}

export function Histogram({ classes, density, xLabel, showDensityToggle }: { classes: { lower: number; upper: number; freq: number }[]; density?: boolean; xLabel?: string; showDensityToggle?: boolean }) {
  void showDensityToggle;
  const ys = classes.map((c) => (density ? c.freq / (c.upper - c.lower) : c.freq));
  const x0 = Math.min(...classes.map((c) => c.lower)), x1 = Math.max(...classes.map((c) => c.upper));
  const ymax = niceMax(Math.max(...ys, 1) * 1.1);
  return (
    <Plane
      x={[x0, x1]}
      y={[0, ymax]}
      xLabel={xLabel}
      yLabel={density ? "كثافة التكرار" : "التكرار"}
      step={[niceStepFor(x1 - x0, classes), ymax / 5]}
      ariaLabel="مدرج تكراري"
      under={(s) => classes.map((c, i) => ys[i] > 0 ? (
        <rect key={i} x={s.X(c.lower)} y={s.Y(ys[i])} width={s.X(c.upper) - s.X(c.lower)} height={s.Y(0) - s.Y(ys[i])} fill={PALETTE[0]} fillOpacity={0.55} stroke={PALETTE[0]} strokeWidth={1.5} />
      ) : null)}
    />
  );
}

function niceStepFor(range: number, classes: { lower: number; upper: number }[]) {
  const widths = classes.map((c) => c.upper - c.lower);
  const minW = Math.min(...widths);
  let st = minW;
  while (range / st > 12) st *= 2;
  return st;
}

export function BoxPlot({ five, range, label, second }: { five: [number, number, number, number, number]; range: [number, number]; label?: string; second?: { five: [number, number, number, number, number]; label: string } }) {
  const f = useFmt();
  const W = 560, H = second ? 210 : 140, pl = 20, pr = 20;
  const [r0, r1] = range;
  const X = (v: number) => pl + ((v - r0) / (r1 - r0)) * (W - pl - pr);
  const step = niceMax((r1 - r0) / 10);
  const ticks: number[] = [];
  for (let v = Math.ceil(r0 / step) * step; v <= r1 + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  const one = (fv: [number, number, number, number, number], y: number, col: string, lab?: string) => (
    <g>
      <line x1={X(fv[0])} x2={X(fv[1])} y1={y} y2={y} stroke="currentColor" strokeWidth={2} />
      <line x1={X(fv[3])} x2={X(fv[4])} y1={y} y2={y} stroke="currentColor" strokeWidth={2} />
      <line x1={X(fv[0])} x2={X(fv[0])} y1={y - 12} y2={y + 12} stroke="currentColor" strokeWidth={2} />
      <line x1={X(fv[4])} x2={X(fv[4])} y1={y - 12} y2={y + 12} stroke="currentColor" strokeWidth={2} />
      <rect x={X(fv[1])} y={y - 22} width={Math.max(1, X(fv[3]) - X(fv[1]))} height={44} fill={col} fillOpacity={0.25} stroke={col} strokeWidth={2} rx={3} />
      <line x1={X(fv[2])} x2={X(fv[2])} y1={y - 22} y2={y + 22} stroke={col} strokeWidth={3} />
      {lab && <text x={X(fv[4]) + 6 > W - 60 ? X(fv[0]) - 6 : X(fv[4]) + 6} y={y + 4} fontSize={12} fontWeight={700} fill="currentColor" textAnchor={X(fv[4]) + 6 > W - 60 ? "start" : "end"} direction="rtl">{lab}</text>}
    </g>
  );
  const axisY = H - 28;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="مخطط صندوقي" style={{ direction: "ltr" }}>
      {one(five, 46, PALETTE[0], label)}
      {second && one(second.five, 116, PALETTE[2], second.label)}
      <line x1={pl} x2={W - pr} y1={axisY} y2={axisY} stroke="currentColor" opacity={0.7} />
      {ticks.map((t) => (
        <g key={t}><line x1={X(t)} x2={X(t)} y1={axisY} y2={axisY + 5} stroke="currentColor" opacity={0.7} /><text x={X(t)} y={axisY + 18} fontSize={11} textAnchor="middle" fill="currentColor">{f(t)}</text></g>
      ))}
    </svg>
  );
}

export function PieChart({ labels, values }: { labels: string[]; values: number[] }) {
  const f = useFmt();
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = 130, cy = 130, r = 110;
  let ang = -90;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 260 260" className="h-auto w-full max-w-[260px]" role="img" aria-label="مخطط دائري">
        {values.map((v, i) => {
          const a0 = ang, a1 = ang + (v / total) * 360;
          ang = a1;
          if (v <= 0) return null;
          if (v === total) return <circle key={i} cx={cx} cy={cy} r={r} fill={PALETTE[i % PALETTE.length]} />;
          const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
          const [ax, ay] = p(a0), [bx, by] = p(a1);
          const large = a1 - a0 > 180 ? 1 : 0;
          const mid = (a0 + a1) / 2;
          const [lx, ly] = [cx + r * 0.62 * Math.cos((mid * Math.PI) / 180), cy + r * 0.62 * Math.sin((mid * Math.PI) / 180)];
          return (
            <g key={i}>
              <path d={`M${cx},${cy} L${ax},${ay} A${r},${r} 0 ${large} 1 ${bx},${by} Z`} fill={PALETTE[i % PALETTE.length]} stroke="var(--surface)" strokeWidth={2} />
              {a1 - a0 > 18 && <text x={lx} y={ly + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">{f(Math.round((v / total) * 3600) / 10)}°</text>}
            </g>
          );
        })}
      </svg>
      <ul className="space-y-1 text-sm">
        {labels.map((l, i) => (
          <li key={i} className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded" style={{ background: PALETTE[i % PALETTE.length] }} />{l}: <b>{f(values[i])}</b> <span className="muted">({f(Math.round((values[i] / total) * 3600) / 10)}°)</span></li>
        ))}
      </ul>
    </div>
  );
}

export function Scatter({ points, xLabel, yLabel, line }: { points: [number, number][]; xLabel?: string; yLabel?: string; line?: boolean }) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const pad = (a: number, b: number) => { const d = (b - a) * 0.1 || 1; return [a - d, b + d] as [number, number]; };
  const xr = pad(Math.min(...xs), Math.max(...xs)), yr = pad(Math.min(...ys), Math.max(...ys));
  const bf = line && points.length >= 2 ? bestFitLine(xs, ys) : null;
  return (
    <Plane x={xr} y={yr} xLabel={xLabel} yLabel={yLabel} ariaLabel="مخطط انتشار"
      curves={bf ? [{ expr: `${bf.m}*x+${bf.c}`.replace("+-", "-"), color: "#ea580c", dashed: true }] : []}
      points={points.map((p) => ({ at: p, color: "#2b7de9" }))} />
  );
}

export function CumulativeCurve({ classes, xLabel, marks, onReady }: { classes: { lower: number; upper: number; freq: number }[]; xLabel?: string; marks?: number[]; onReady?: never }) {
  void onReady;
  let c = 0;
  const pts: [number, number][] = [[classes[0].lower, 0]];
  for (const k of classes) { c += k.freq; pts.push([k.upper, c]); }
  const n = c;
  const unit = 10 ** Math.floor(Math.log10(Math.max(1, n))) / 2;
  const ymax = Math.max(1, Math.ceil((n * 1.02) / unit) * unit);
  const x0 = classes[0].lower, x1 = classes[classes.length - 1].upper;
  // منحنى أملس (Catmull-Rom) يمر بالنقاط
  const smooth = (s: { X: (v: number) => number; Y: (v: number) => number }) => {
    const P = pts.map(([x, y]) => [s.X(x), s.Y(y)]);
    let d = `M${P[0][0]},${P[0][1]}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] ?? P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] ?? p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(Math.max(p1[1] + (p2[1] - p0[1]) / 6, Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]))];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(Math.max(p2[1] - (p3[1] - p1[1]) / 6, Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]))];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    return d;
  };
  const readAt = (target: number) => {
    for (let i = 1; i < pts.length; i++) if (target <= pts[i][1]) {
      const [xa, ya] = pts[i - 1], [xb, yb] = pts[i];
      return yb === ya ? xa : xa + ((target - ya) / (yb - ya)) * (xb - xa);
    }
    return x1;
  };
  return (
    <Plane x={[x0, x1]} y={[0, ymax]} xLabel={xLabel} yLabel="التكرار التراكمي" ariaLabel="منحنى التكرار التراكمي"
      under={(s) => (
        <g>
          <path d={smooth(s)} fill="none" stroke="#2b7de9" strokeWidth={2.6} />
          {pts.map((p, i) => <circle key={i} cx={s.X(p[0])} cy={s.Y(p[1])} r={3.5} fill="#2b7de9" />)}
          {(marks ?? []).map((m, i) => {
            const xv = readAt(m);
            return (
              <g key={i} stroke="#ea580c" strokeDasharray="5 4" strokeWidth={1.8}>
                <line x1={s.X(x0)} x2={s.X(xv)} y1={s.Y(m)} y2={s.Y(m)} />
                <line x1={s.X(xv)} x2={s.X(xv)} y1={s.Y(m)} y2={s.Y(0)} />
              </g>
            );
          })}
        </g>
      )} />
  );
}
