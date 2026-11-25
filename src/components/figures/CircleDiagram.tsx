"use client";
/** رسوم نظريات الدائرة (ثابتة) بأسماء نقاط عربية */
import React from "react";
import type { CirclePreset } from "@/content/types";
import { useSettings } from "@/lib/settings";
import { toEasternDigits } from "@/lib/math/expr";

const CX = 160, CY = 150, R = 105;
const on = (deg: number, r = R): [number, number] => [CX + r * Math.cos((deg * Math.PI) / 180), CY - r * Math.sin((deg * Math.PI) / 180)];

function Label({ p, t, dx = 0, dy = 0 }: { p: [number, number]; t: string; dx?: number; dy?: number }) {
  return <text x={p[0] + dx} y={p[1] + dy} fontSize={16} fontWeight={700} fill="currentColor" textAnchor="middle">{t}</text>;
}
function Dot({ p }: { p: [number, number] }) { return <circle cx={p[0]} cy={p[1]} r={3.5} fill="currentColor" />; }
function Seg({ a, b, color = "currentColor", dash, w = 2 }: { a: [number, number]; b: [number, number]; color?: string; dash?: boolean; w?: number }) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeDasharray={dash ? "6 5" : undefined} />;
}
/** علامة الزاوية القائمة عند الرأس v بين الاتجاهين نحو a و b */
function RightMark({ v, a, b }: { v: [number, number]; a: [number, number]; b: [number, number] }) {
  const u = (p: [number, number]) => { const dx = p[0] - v[0], dy = p[1] - v[1], l = Math.hypot(dx, dy); return [dx / l * 12, dy / l * 12]; };
  const [ux, uy] = u(a), [wx, wy] = u(b);
  return <path d={`M${v[0] + ux},${v[1] + uy} L${v[0] + ux + wx},${v[1] + uy + wy} L${v[0] + wx},${v[1] + wy}`} fill="none" stroke="#dc2626" strokeWidth={1.8} />;
}
/** قوس زاوية ملوّن عند الرأس v */
function AngleArc({ v, a, b, color = "#2b7de9", r = 22 }: { v: [number, number]; a: [number, number]; b: [number, number]; color?: string; r?: number }) {
  const ang = (p: [number, number]) => Math.atan2(p[1] - v[1], p[0] - v[0]);
  let t1 = ang(a), t2 = ang(b);
  let d = t2 - t1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const sweep = d > 0 ? 1 : 0;
  t2 = t1 + d;
  const p1 = [v[0] + r * Math.cos(t1), v[1] + r * Math.sin(t1)], p2 = [v[0] + r * Math.cos(t2), v[1] + r * Math.sin(t2)];
  return <path d={`M${v[0]},${v[1]} L${p1[0]},${p1[1]} A${r},${r} 0 0 ${sweep} ${p2[0]},${p2[1]} Z`} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} />;
}

export function CircleDiagram({ preset, values }: { preset: CirclePreset; values?: Record<string, string | number> }) {
  const { settings } = useSettings();
  const f = (v: string | number) => (settings.digits === "eastern" ? toEasternDigits(String(v)) : String(v));
  const O: [number, number] = [CX, CY];
  let body: React.ReactNode = null;
  switch (preset) {
    case "chord-perpendicular": {
      const r = Number(values?.r ?? 10), d = Number(values?.d ?? 6);
      const k = Math.min(0.9, d / r);
      const y = CY + R * k;
      const half = Math.sqrt(R * R - (R * k) ** 2);
      const A: [number, number] = [CX - half, y], B: [number, number] = [CX + half, y], M: [number, number] = [CX, y];
      body = (<>
        <Seg a={A} b={B} w={2.5} /><Seg a={O} b={M} color="#2b7de9" /><Seg a={O} b={B} color="#0e9f6e" dash />
        <RightMark v={M} a={O} b={B} />
        <Dot p={O} /><Dot p={A} /><Dot p={B} /><Dot p={M} />
        <Label p={O} t="م" dy={-8} /><Label p={A} t="أ" dx={-12} dy={14} /><Label p={B} t="ب" dx={12} dy={14} /><Label p={M} t="هـ" dy={20} />
        {values?.r !== undefined && <text x={(CX + B[0]) / 2 + 12} y={(CY + B[1]) / 2 - 4} fontSize={13} fill="#0e9f6e" fontWeight={700}>{f(values.r)}</text>}
        {values?.d !== undefined && <text x={CX - 14} y={(CY + y) / 2 + 4} fontSize={13} fill="#2b7de9" fontWeight={700} textAnchor="end">{f(values.d)}</text>}
      </>);
      break;
    }
    case "two-tangents": {
      const cx = CX - 50;
      const o: [number, number] = [cx, CY];
      const N: [number, number] = [cx + 230, CY];
      const dist = 230, t = Math.acos(R / dist);
      const A: [number, number] = [cx + R * Math.cos(t), CY - R * Math.sin(t)], B: [number, number] = [cx + R * Math.cos(t), CY + R * Math.sin(t)];
      body = (<>
        <circle cx={cx} cy={CY} r={R} fill="none" stroke="currentColor" strokeWidth={2} />
        <Seg a={N} b={A} color="#ea580c" w={2.5} /><Seg a={N} b={B} color="#ea580c" w={2.5} /><Seg a={o} b={A} /><Seg a={o} b={B} /><Seg a={o} b={N} dash />
        <RightMark v={A} a={o} b={N} /><RightMark v={B} a={o} b={N} />
        <Dot p={o} /><Dot p={A} /><Dot p={B} /><Dot p={N} />
        <Label p={o} t="م" dx={-14} /><Label p={A} t="أ" dy={-10} /><Label p={B} t="ب" dy={22} /><Label p={N} t="ن" dx={14} dy={5} />
      </>);
      return <svg viewBox="0 0 400 300" className="h-auto w-full max-w-md" role="img" aria-label="مماسان من نقطة خارجية">{body}</svg>;
    }
    case "semicircle": {
      const A = on(180), B = on(0), C = on(125);
      body = (<>
        <Seg a={A} b={B} w={2.5} /><Seg a={A} b={C} color="#2b7de9" /><Seg a={B} b={C} color="#2b7de9" />
        <RightMark v={C} a={A} b={B} />
        <Dot p={A} /><Dot p={B} /><Dot p={C} /><Dot p={O} />
        <Label p={A} t="أ" dx={-14} dy={5} /><Label p={B} t="ب" dx={14} dy={5} /><Label p={C} t="جـ" dx={-8} dy={-10} /><Label p={O} t="م" dy={20} />
      </>);
      break;
    }
    case "tangent-radius": {
      const A = on(-90);
      body = (<>
        <Seg a={O} b={A} /><Seg a={[A[0] - 150, A[1]]} b={[A[0] + 150, A[1]]} color="#ea580c" w={2.5} />
        <RightMark v={A} a={O} b={[A[0] + 50, A[1]]} />
        <Dot p={O} /><Dot p={A} /><Label p={O} t="م" dy={-8} /><Label p={A} t="أ" dy={22} />
      </>);
      break;
    }
    case "centre-angle": {
      const A = on(215), B = on(-35), C = on(95);
      body = (<>
        <Seg a={C} b={A} color="#2b7de9" /><Seg a={C} b={B} color="#2b7de9" /><Seg a={O} b={A} color="#ea580c" /><Seg a={O} b={B} color="#ea580c" />
        <AngleArc v={C} a={A} b={B} /><AngleArc v={O} a={A} b={B} color="#ea580c" r={18} />
        <Dot p={A} /><Dot p={B} /><Dot p={C} /><Dot p={O} />
        <Label p={A} t="أ" dx={-12} dy={14} /><Label p={B} t="ب" dx={12} dy={14} /><Label p={C} t="جـ" dy={-10} /><Label p={O} t="م" dx={14} dy={-4} />
      </>);
      break;
    }
    case "same-segment": {
      const A = on(210), B = on(-30), C = on(120), D = on(60);
      body = (<>
        <Seg a={C} b={A} color="#2b7de9" /><Seg a={C} b={B} color="#2b7de9" /><Seg a={D} b={A} color="#0e9f6e" /><Seg a={D} b={B} color="#0e9f6e" />
        <AngleArc v={C} a={A} b={B} /><AngleArc v={D} a={A} b={B} color="#0e9f6e" />
        <Dot p={A} /><Dot p={B} /><Dot p={C} /><Dot p={D} />
        <Label p={A} t="أ" dx={-12} dy={14} /><Label p={B} t="ب" dx={12} dy={14} /><Label p={C} t="جـ" dx={-8} dy={-10} /><Label p={D} t="د" dx={8} dy={-10} />
      </>);
      break;
    }
    case "cyclic-quad": {
      const A = on(150), B = on(40), C = on(-50), D = on(-140);
      body = (<>
        <polygon points={[A, B, C, D].map((p) => p.join(",")).join(" ")} fill="#2b7de9" fillOpacity={0.08} stroke="#2b7de9" strokeWidth={2.2} />
        <AngleArc v={A} a={B} b={D} color="#2b7de9" /><AngleArc v={C} a={B} b={D} color="#ea580c" />
        <Dot p={A} /><Dot p={B} /><Dot p={C} /><Dot p={D} />
        <Label p={A} t="أ" dx={-10} dy={-6} /><Label p={B} t="ب" dx={10} dy={-6} /><Label p={C} t="جـ" dx={12} dy={16} /><Label p={D} t="د" dx={-12} dy={16} />
      </>);
      break;
    }
    case "alternate-segment": {
      const A = on(-90), B = on(-10), C = on(140);
      const T1: [number, number] = [A[0] - 150, A[1]], T2: [number, number] = [A[0] + 150, A[1]];
      body = (<>
        <Seg a={T1} b={T2} color="#ea580c" w={2.5} /><Seg a={A} b={B} /><Seg a={C} b={A} color="#2b7de9" /><Seg a={C} b={B} color="#2b7de9" />
        <AngleArc v={A} a={B} b={T2} color="#ea580c" r={26} /><AngleArc v={C} a={A} b={B} color="#ea580c" r={26} />
        <Dot p={A} /><Dot p={B} /><Dot p={C} />
        <Label p={A} t="أ" dy={22} /><Label p={B} t="ب" dx={14} dy={6} /><Label p={C} t="جـ" dx={-10} dy={-8} />
      </>);
      break;
    }
  }
  return (
    <svg viewBox="0 0 320 300" className="h-auto w-full max-w-sm" role="img" aria-label="رسم نظرية في الدائرة">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="currentColor" strokeWidth={2} />
      {body}
    </svg>
  );
}
