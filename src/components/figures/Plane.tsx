"use client";
/**
 * مستوى إحداثي SVG تفاعلي قابل لإعادة الاستخدام في الدروس والمختبرات والألعاب.
 * يدعم: رسم الدوال، المضلعات، المناطق (المتباينات)، النقاط القابلة للسحب، واللمس.
 */
import React, { useCallback, useId, useMemo, useRef, useState } from "react";
import { compileFn } from "@/lib/math/expr";
import { useSettings } from "@/lib/settings";
import { toEasternDigits } from "@/lib/math/expr";

export interface Scale {
  X: (x: number) => number;
  Y: (y: number) => number;
  inv: (px: number, py: number) => [number, number];
  x: [number, number];
  y: [number, number];
  W: number;
  H: number;
  pad: { l: number; r: number; t: number; b: number };
  fmt: (v: number) => string;
}

export type Ineq = { a: number; b: number; op: "<" | "<=" | ">" | ">="; c: number };

type Pt = [number, number];

/** قص مضلع بنصف مستوى a x + b y (op) c (شامل للحد) — خوارزمية Sutherland–Hodgman */
export function clipHalfPlane(poly: Pt[], ineq: Ineq, complement = false): Pt[] {
  const sgn = ineq.op === "<" || ineq.op === "<=" ? -1 : 1;
  const s = complement ? -sgn : sgn;
  const val = (p: Pt) => s * (ineq.a * p[0] + ineq.b * p[1] - ineq.c);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    const vp = val(P), vq = val(Q);
    if (vp >= 0) out.push(P);
    if ((vp >= 0) !== (vq >= 0)) {
      const t = vp / (vp - vq);
      out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]);
    }
  }
  return out;
}

export function satisfies(p: Pt, q: Ineq) {
  const v = q.a * p[0] + q.b * p[1];
  switch (q.op) {
    case "<": return v < q.c - 1e-9;
    case "<=": return v <= q.c + 1e-9;
    case ">": return v > q.c + 1e-9;
    case ">=": return v >= q.c - 1e-9;
  }
}

function niceStep(range: number) {
  const raw = range / 8;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

export interface Curve { expr?: string; points?: Pt[]; color?: string; dashed?: boolean; width?: number; domain?: [number, number]; label?: string }
export interface DragPoint { id: string; at: Pt; color?: string; label?: string; constrain?: (p: Pt) => Pt; onMove: (p: Pt) => void }

export interface PlaneProps {
  x: [number, number];
  y: [number, number];
  step?: [number, number];
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  curves?: Curve[];
  points?: { at: Pt; label?: string; color?: string }[];
  regions?: Ineq[];
  shadeMode?: "wanted" | "unwanted";
  drag?: DragPoint[];
  onClick?: (p: Pt) => void;
  onHover?: (p: Pt | null) => void;
  overlay?: (s: Scale) => React.ReactNode;
  under?: (s: Scale) => React.ReactNode;
  showGrid?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function Plane(props: PlaneProps) {
  const { settings } = useSettings();
  const eastern = settings.digits === "eastern";
  const W = props.width ?? 560;
  const H = props.height ?? Math.round(W * 0.72);
  const pad = { l: 44, r: 14, t: 14, b: 36 };
  const [x0, x1] = props.x;
  const [y0, y1] = props.y;
  const sx = props.step?.[0] ?? niceStep(x1 - x0);
  const sy = props.step?.[1] ?? niceStep(y1 - y0);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const clipId = "pc" + useId().replace(/:/g, "");

  const s: Scale = useMemo(() => {
    const X = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * (W - pad.l - pad.r);
    const Y = (y: number) => H - pad.b - ((y - y0) / (y1 - y0)) * (H - pad.t - pad.b);
    const inv = (px: number, py: number): Pt => [x0 + ((px - pad.l) / (W - pad.l - pad.r)) * (x1 - x0), y0 + ((H - pad.b - py) / (H - pad.t - pad.b)) * (y1 - y0)];
    const fmt = (v: number) => {
      const r = String(Number(v.toFixed(6)));
      return eastern ? toEasternDigits(r) : r;
    };
    return { X, Y, inv, x: props.x, y: props.y, W, H, pad, fmt };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x0, x1, y0, y1, W, H, eastern]);

  const toMath = useCallback((e: React.PointerEvent | PointerEvent): Pt => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    return s.inv(px, py);
  }, [s, W, H]);

  const ticksX: number[] = [];
  for (let v = Math.ceil(x0 / sx) * sx; v <= x1 + 1e-9; v += sx) ticksX.push(Number(v.toFixed(10)));
  const ticksY: number[] = [];
  for (let v = Math.ceil(y0 / sy) * sy; v <= y1 + 1e-9; v += sy) ticksY.push(Number(v.toFixed(10)));
  const axisX = y0 <= 0 && y1 >= 0 ? 0 : y0; // موقع المحور الأفقي
  const axisY = x0 <= 0 && x1 >= 0 ? 0 : x0;

  const box: Pt[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const regions = props.regions ?? [];
  const shadeMode = props.shadeMode ?? "unwanted";

  const curvePaths = (props.curves ?? []).map((c, i) => {
    let d = "";
    if (c.points) {
      d = c.points.map((p, j) => `${j ? "L" : "M"}${s.X(p[0]).toFixed(2)},${s.Y(p[1]).toFixed(2)}`).join(" ");
    } else if (c.expr) {
      let f: (x: number) => number;
      try { f = compileFn(c.expr); } catch { return null; }
      const [a, b] = c.domain ?? [x0, x1];
      const N = 400;
      let pen = false;
      let prevY: number | null = null;
      for (let k = 0; k <= N; k++) {
        const xv = a + ((b - a) * k) / N;
        const yv = f(xv);
        const ok = Number.isFinite(yv) && yv > y0 - (y1 - y0) * 3 && yv < y1 + (y1 - y0) * 3;
        // قطع الخط عند القفزات (مثل 1/س)
        if (ok && prevY !== null && Math.abs(yv - prevY) > (y1 - y0) * 1.5) pen = false;
        if (ok) { d += `${pen ? "L" : "M"}${s.X(xv).toFixed(2)},${s.Y(yv).toFixed(2)} `; pen = true; prevY = yv; }
        else { pen = false; prevY = null; }
      }
    }
    return (
      <path key={i} d={d} fill="none" stroke={c.color ?? "#2b7de9"} strokeWidth={c.width ?? 2.6} strokeDasharray={c.dashed ? "7 6" : undefined} strokeLinejoin="round" strokeLinecap="round" />
    );
  });

  const polyStr = (poly: Pt[]) => poly.map((p) => `${s.X(p[0])},${s.Y(p[1])}`).join(" ");

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={`h-auto w-full touch-none select-none ${props.className ?? ""}`}
      style={{ direction: "ltr", maxWidth: W }}
      role="img"
      aria-label={props.ariaLabel ?? "مستوى إحداثي"}
      onPointerDown={(e) => {
        if (!props.onClick) return;
        const p = toMath(e);
        if (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1) props.onClick(p);
      }}
      onPointerMove={(e) => {
        if (dragId) {
          const dp = props.drag?.find((d) => d.id === dragId);
          if (dp) {
            let p = toMath(e);
            p = [Math.min(x1, Math.max(x0, p[0])), Math.min(y1, Math.max(y0, p[1]))];
            dp.onMove(dp.constrain ? dp.constrain(p) : p);
          }
        } else if (props.onHover) props.onHover(toMath(e));
      }}
      onPointerUp={() => setDragId(null)}
      onPointerLeave={() => { setDragId(null); props.onHover?.(null); }}
    >
      <rect x={0} y={0} width={W} height={H} fill="var(--surface)" />
      {/* الشبكة */}
      {props.showGrid !== false && (
        <g stroke="currentColor" opacity={0.12} strokeWidth={1}>
          {ticksX.map((v) => <line key={"gx" + v} x1={s.X(v)} x2={s.X(v)} y1={s.Y(y0)} y2={s.Y(y1)} />)}
          {ticksY.map((v) => <line key={"gy" + v} y1={s.Y(v)} y2={s.Y(v)} x1={s.X(x0)} x2={s.X(x1)} />)}
        </g>
      )}
      {/* المناطق */}
      {regions.length > 0 && shadeMode === "unwanted" && regions.map((q, i) => {
        const poly = clipHalfPlane(box, q, true);
        return poly.length > 2 ? <polygon key={"r" + i} points={polyStr(poly)} fill="#64748b" opacity={0.22} /> : null;
      })}
      {regions.length > 0 && shadeMode === "wanted" && (() => {
        let poly = box;
        for (const q of regions) poly = clipHalfPlane(poly, q);
        return poly.length > 2 ? <polygon points={polyStr(poly)} fill="#2b7de9" opacity={0.25} /> : null;
      })()}
      {props.under?.(s)}
      {/* المحاور */}
      <g stroke="currentColor" strokeWidth={1.6} opacity={0.75}>
        <line x1={s.X(x0)} x2={s.X(x1)} y1={s.Y(axisX)} y2={s.Y(axisX)} />
        <line y1={s.Y(y0)} y2={s.Y(y1)} x1={s.X(axisY)} x2={s.X(axisY)} />
      </g>
      <g fill="currentColor" fontSize={12} opacity={0.8}>
        {ticksX.map((v) => (v === axisY && axisX === 0 && axisY === 0 ? null : <text key={"tx" + v} x={s.X(v)} y={s.Y(axisX) + 16} textAnchor="middle">{s.fmt(v)}</text>))}
        {ticksY.map((v) => (v === axisX && axisY === 0 ? null : <text key={"ty" + v} x={s.X(axisY) - 6} y={s.Y(v) + 4} textAnchor="end">{s.fmt(v)}</text>))}
        {axisX === 0 && axisY === 0 && <text x={s.X(0) - 6} y={s.Y(0) + 16} textAnchor="end">{s.fmt(0)}</text>}
      </g>
      {props.xLabel && <text x={W - pad.r} y={H - 4} textAnchor="start" fontSize={13} fontWeight={600} fill="currentColor" direction="rtl">{props.xLabel}</text>}
      {props.yLabel && <text x={pad.l + 6} y={pad.t + 12} textAnchor="end" fontSize={13} fontWeight={600} fill="currentColor" direction="rtl" paintOrder="stroke" stroke="var(--surface)" strokeWidth={4}>{props.yLabel}</text>}
      {/* حدود المناطق */}
      {regions.map((q, i) => {
        // نقاط تقاطع المستقيم مع الإطار
        const pts: Pt[] = [];
        if (Math.abs(q.b) > 1e-12) {
          for (const xv of [x0, x1]) pts.push([xv, (q.c - q.a * xv) / q.b]);
        } else {
          for (const yv of [y0, y1]) pts.push([q.c / q.a, yv]);
        }
        const strict = q.op === "<" || q.op === ">";
        return <line key={"b" + i} x1={s.X(pts[0][0])} y1={s.Y(pts[0][1])} x2={s.X(pts[1][0])} y2={s.Y(pts[1][1])} stroke="#0f2a4a" className="dark:stroke-white" strokeWidth={2.2} strokeDasharray={strict ? "8 6" : undefined} />;
      })}
      <defs>
        <clipPath id={clipId}><rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} /></clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{curvePaths}</g>
      {props.overlay?.(s)}
      {(props.points ?? []).map((p, i) => (
        <g key={"p" + i}>
          <circle cx={s.X(p.at[0])} cy={s.Y(p.at[1])} r={5} fill={p.color ?? "#dc2626"} />
          {p.label && <text x={s.X(p.at[0]) + 8} y={s.Y(p.at[1]) - 8} fontSize={12} fill="currentColor" fontWeight={600}>{eastern ? toEasternDigits(p.label) : p.label}</text>}
        </g>
      ))}
      {(props.drag ?? []).map((d) => (
        <g key={d.id} style={{ cursor: "grab" }} onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); setDragId(d.id); }}>
          <circle cx={s.X(d.at[0])} cy={s.Y(d.at[1])} r={20} fill="transparent" />
          <circle cx={s.X(d.at[0])} cy={s.Y(d.at[1])} r={9} fill={d.color ?? "#ea580c"} stroke="#fff" strokeWidth={2.5} />
          {d.label && <text x={s.X(d.at[0]) + 12} y={s.Y(d.at[1]) - 12} fontSize={13} fontWeight={700} fill="currentColor">{eastern ? toEasternDigits(d.label) : d.label}</text>}
        </g>
      ))}
    </svg>
  );
}
