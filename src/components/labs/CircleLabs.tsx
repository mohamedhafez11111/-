"use client";
import React, { useRef, useState } from "react";
import { LabGrid, Slider, Stat } from "./ui";
import { MathText, Num } from "@/components/ui/MathText";

type P = [number, number];
const CX = 200, CY = 190, R = 140;
const onC = (deg: number, r = R): P => [CX + r * Math.cos((deg * Math.PI) / 180), CY - r * Math.sin((deg * Math.PI) / 180)];
const angAt = (v: P, a: P, b: P) => {
  const t1 = Math.atan2(a[1] - v[1], a[0] - v[0]), t2 = Math.atan2(b[1] - v[1], b[0] - v[0]);
  let d = Math.abs(t1 - t2) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
};
const r1 = (v: number) => Number(v.toFixed(1));

function Arc({ v, a, b, color, r = 26 }: { v: P; a: P; b: P; color: string; r?: number }) {
  const t1 = Math.atan2(a[1] - v[1], a[0] - v[0]);
  let d = Math.atan2(b[1] - v[1], b[0] - v[0]) - t1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const p1 = [v[0] + r * Math.cos(t1), v[1] + r * Math.sin(t1)], p2 = [v[0] + r * Math.cos(t1 + d), v[1] + r * Math.sin(t1 + d)];
  return <path d={`M${v[0]},${v[1]} L${p1[0]},${p1[1]} A${r},${r} 0 0 ${d > 0 ? 1 : 0} ${p2[0]},${p2[1]} Z`} fill={color} fillOpacity={0.22} stroke={color} />;
}
const L = ({ a, b, c = "currentColor", w = 2, dash }: { a: P; b: P; c?: string; w?: number; dash?: boolean }) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={w} strokeDasharray={dash ? "6 5" : undefined} />;
const T = ({ p, t, dx = 0, dy = -12 }: { p: P; t: string; dx?: number; dy?: number }) => <text x={p[0] + dx} y={p[1] + dy} textAnchor="middle" fontSize={17} fontWeight={700} fill="currentColor">{t}</text>;

/** نقاط قابلة للسحب على محيط الدائرة */
function useCircleDrag(initial: Record<string, number>) {
  const [angles, setAngles] = useState(initial);
  const [drag, setDrag] = useState<string | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (!drag || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 400, y = ((e.clientY - r.top) / r.height) * 380;
    const deg = (Math.atan2(CY - y, x - CX) * 180) / Math.PI;
    setAngles((a) => ({ ...a, [drag]: deg }));
  };
  const handle = (id: string, p: P, color = "#ea580c") => (
    <g key={id} onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(id); }} style={{ cursor: "grab" }}>
      <circle cx={p[0]} cy={p[1]} r={22} fill="transparent" />
      <circle cx={p[0]} cy={p[1]} r={9} fill={color} stroke="#fff" strokeWidth={2.5} />
    </g>
  );
  return { angles, setAngles, ref, onMove, end: () => setDrag(null), handle };
}

// ======================= الزوايا في الدائرة =======================
type Mode = "centre" | "same" | "semi" | "cyclic" | "alternate";
const MODES: [Mode, string][] = [["centre", "المركزية والمحيطية"], ["same", "القوس نفسه"], ["semi", "نصف الدائرة"], ["cyclic", "الرباعي الدائري"], ["alternate", "القطعة المتبادلة"]];

export function CircleAnglesLab() {
  const [mode, setMode] = useState<Mode>("centre");
  const d = useCircleDrag({ A: 215, B: -35, C: 100, D: 50 });
  const O: P = [CX, CY];
  const A = onC(d.angles.A), B = onC(d.angles.B), C = onC(d.angles.C), D = onC(d.angles.D);
  let body: React.ReactNode = null;
  let stats: React.ReactNode = null;
  let note = "";

  if (mode === "centre") {
    // الزاوية المركزية المقابلة للقوس أب الذي لا يحوي جـ
    const inscribed = angAt(C, A, B);
    const centralMinor = angAt(O, A, B);
    // إذا كانت جـ على القوس الأصغر فالزاوية المركزية المقابلة هي المنعكسة
    const central = Math.abs(inscribed * 2 - centralMinor) < 1 ? centralMinor : 360 - centralMinor;
    body = (<>
      <L a={C} b={A} c="#2b7de9" /><L a={C} b={B} c="#2b7de9" /><L a={O} b={A} c="#ea580c" /><L a={O} b={B} c="#ea580c" />
      <Arc v={C} a={A} b={B} color="#2b7de9" /><Arc v={O} a={A} b={B} color="#ea580c" r={20} />
      <T p={A} t="أ" dy={20} /><T p={B} t="ب" dy={20} /><T p={C} t="جـ" /><T p={O} t="م" dx={14} dy={-6} />
      {d.handle("A", A)}{d.handle("B", B)}{d.handle("C", C, "#2b7de9")}
    </>);
    stats = (<><Stat label="الزاوية المحيطية ق(أ جـ ب)" value={`${r1(inscribed)}°`} /><Stat label="الزاوية المركزية المقابلة" value={`${r1(central)}°`} /><Stat label="النسبة" value={r1(central / (inscribed || 1))} /></>);
    note = "الزاوية المركزية = 2 × الزاوية المحيطية المقابلة للقوس نفسه (مهما حرّكت النقاط).";
  } else if (mode === "same") {
    body = (<>
      <L a={C} b={A} c="#2b7de9" /><L a={C} b={B} c="#2b7de9" /><L a={D} b={A} c="#0e9f6e" /><L a={D} b={B} c="#0e9f6e" />
      <Arc v={C} a={A} b={B} color="#2b7de9" /><Arc v={D} a={A} b={B} color="#0e9f6e" />
      <T p={A} t="أ" dy={20} /><T p={B} t="ب" dy={20} /><T p={C} t="جـ" /><T p={D} t="د" />
      {d.handle("A", A)}{d.handle("B", B)}{d.handle("C", C, "#2b7de9")}{d.handle("D", D, "#0e9f6e")}
    </>);
    stats = (<><Stat label="ق(أ جـ ب)" value={`${r1(angAt(C, A, B))}°`} /><Stat label="ق(أ د ب)" value={`${r1(angAt(D, A, B))}°`} /></>);
    note = "عندما تكون جـ و د في القطعة نفسها (على الجهة نفسها من الوتر أب) تتساوى الزاويتان. انقل إحداهما إلى الجهة الأخرى ولاحظ أن مجموعهما يصبح 180°.";
  } else if (mode === "semi") {
    const A2 = onC(d.angles.A), B2 = onC(d.angles.A + 180);
    body = (<>
      <L a={A2} b={B2} w={2.5} /><L a={C} b={A2} c="#2b7de9" /><L a={C} b={B2} c="#2b7de9" /><Arc v={C} a={A2} b={B2} color="#dc2626" r={20} />
      <T p={A2} t="أ" dy={20} /><T p={B2} t="ب" dy={20} /><T p={C} t="جـ" /><circle cx={CX} cy={CY} r={3.5} fill="currentColor" />
      {d.handle("A", A2)}{d.handle("C", C, "#2b7de9")}
    </>);
    stats = <Stat label="ق(أ جـ ب) حيث أب قطر" value={`${r1(angAt(C, A2, B2))}°`} />;
    note = "الزاوية المحيطية المرسومة على القطر قائمة دائماً.";
  } else if (mode === "cyclic") {
    const pts = [d.angles.A, d.angles.B, d.angles.C, d.angles.D].map((a, i) => ({ a: ((a % 360) + 360) % 360, i }));
    pts.sort((x, y) => x.a - y.a);
    const Q = pts.map((p) => onC(p.a));
    const names = ["أ", "ب", "جـ", "د"];
    const ang = Q.map((p, i) => angAt(p, Q[(i + 3) % 4], Q[(i + 1) % 4]));
    body = (<>
      <polygon points={Q.map((p) => p.join(",")).join(" ")} fill="#2b7de9" fillOpacity={0.08} stroke="#2b7de9" strokeWidth={2.2} />
      {Q.map((p, i) => <Arc key={i} v={p} a={Q[(i + 3) % 4]} b={Q[(i + 1) % 4]} color={i % 2 ? "#ea580c" : "#2b7de9"} r={22} />)}
      {Q.map((p, i) => <T key={i} p={p} t={names[i]} dy={p[1] > CY ? 24 : -12} />)}
      {pts.map((p, k) => d.handle(["A", "B", "C", "D"][p.i], Q[k]))}
    </>);
    stats = (<>
      {ang.map((a, i) => <Stat key={i} label={`ق(${names[i]})`} value={`${r1(a)}°`} />)}
      <Stat label="ق(أ) + ق(جـ)" value={`${r1(ang[0] + ang[2])}°`} /><Stat label="ق(ب) + ق(د)" value={`${r1(ang[1] + ang[3])}°`} />
    </>);
    note = "في الشكل الرباعي الدائري: مجموع قياسي كل زاويتين متقابلتين 180°.";
  } else {
    // القطعة المتبادلة: مماس عند أ
    const At = onC(-90);
    const tanL: P = [At[0] - 170, At[1]], tanR: P = [At[0] + 170, At[1]];
    const tangentAngle = angAt(At, B, tanR);
    body = (<>
      <L a={tanL} b={tanR} c="#ea580c" w={2.5} /><L a={At} b={B} /><L a={C} b={At} c="#2b7de9" /><L a={C} b={B} c="#2b7de9" />
      <Arc v={At} a={B} b={tanR} color="#ea580c" r={30} /><Arc v={C} a={At} b={B} color="#ea580c" r={26} />
      <T p={At} t="أ" dy={24} /><T p={B} t="ب" dx={16} dy={4} /><T p={C} t="جـ" />
      {d.handle("B", B)}{d.handle("C", C, "#2b7de9")}
    </>);
    stats = (<><Stat label="الزاوية بين المماس والوتر أب" value={`${r1(tangentAngle)}°`} /><Stat label="ق(أ جـ ب) في القطعة المتبادلة" value={`${r1(angAt(C, At, B))}°`} /></>);
    note = "حرّك ب و جـ (اجعل جـ في القطعة البعيدة عن الزاوية المحددة): الزاويتان متساويتان.";
  }

  return (
    <LabGrid controls={<>
      <div className="grid gap-1.5">{MODES.map(([m, t]) => <button key={m} className={`chip justify-center !py-2 ${mode === m ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode(m)}>{t}</button>)}</div>
      <p className="text-sm muted">اسحب النقاط الملونة على محيط الدائرة.</p>
    </>}>
      <svg ref={d.ref} viewBox="0 0 400 380" className="mx-auto h-auto w-full max-w-lg touch-none select-none" onPointerMove={d.onMove} onPointerUp={d.end} onPointerLeave={d.end} role="img" aria-label="مختبر الزوايا في الدائرة">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="currentColor" strokeWidth={2} />
        <circle cx={CX} cy={CY} r={3} fill="currentColor" opacity={mode === "centre" || mode === "semi" ? 1 : 0.4} />
        {body}
      </svg>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{stats}</div>
      <p className="rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-900/30"><MathText text={note} /></p>
    </LabGrid>
  );
}

// ======================= التماثل في الدائرة =======================
export function CircleSymmetryLab() {
  const [mode, setMode] = useState<"chord" | "tangent">("chord");
  const [r, setR] = useState(10);
  const [dist, setDist] = useState(6);
  const [rot, setRot] = useState(130);
  const [ext, setExt] = useState(13);
  const d = Math.min(dist, r - 0.1);
  const half = Math.sqrt(r * r - d * d);
  const k = R / r;
  // الوتر الأول أفقي أسفل المركز، والثاني مدار بزاوية rot على البُعد نفسه
  const chord = (angleDeg: number): [P, P, P] => {
    const t = (angleDeg * Math.PI) / 180;
    const M: P = [CX + d * k * Math.cos(t), CY + d * k * Math.sin(t)];
    const ux = -Math.sin(t), uy = Math.cos(t);
    return [[M[0] + half * k * ux, M[1] + half * k * uy], [M[0] - half * k * ux, M[1] - half * k * uy], M];
  };
  const [A, B, M] = chord(90);
  const [C2, D2, M2] = chord(90 + rot);
  const tangentLen = ext > r ? Math.sqrt(ext * ext - r * r) : NaN;
  const kk = R / Math.max(r, 1);
  const N: P = [CX - 60 + Math.min(ext, r * 2.4) * kk * 0.9, CY];
  const O2: P = [CX - 60, CY];
  const dd = Math.hypot(N[0] - O2[0], N[1] - O2[1]);
  const th = Math.acos(Math.min(1, (R * 0.9 * (r / r)) / dd));
  const RR = R * 0.9;
  const tA: P = [O2[0] + RR * Math.cos(th), O2[1] - RR * Math.sin(th)], tB: P = [O2[0] + RR * Math.cos(th), O2[1] + RR * Math.sin(th)];
  return (
    <LabGrid controls={<>
      <div className="grid grid-cols-2 gap-1">
        <button className={`chip justify-center !py-2 ${mode === "chord" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode("chord")}>الأوتار</button>
        <button className={`chip justify-center !py-2 ${mode === "tangent" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setMode("tangent")}>المماسان</button>
      </div>
      <Slider label="نصف القطر" value={r} min={3} max={20} step={0.5} onChange={setR} unit="سم" />
      {mode === "chord" ? (<>
        <Slider label="بُعد الوتر عن المركز" value={dist} min={0} max={r - 0.1} step={0.1} onChange={setDist} unit="سم" />
        <Slider label="تدوير الوتر الثاني" value={rot} min={0} max={359} onChange={setRot} unit="°" />
      </>) : <Slider label="بُعد النقطة ن عن المركز" value={ext} min={r + 0.5} max={r * 3} step={0.5} onChange={setExt} unit="سم" />}
    </>}>
      {mode === "chord" ? (
        <svg viewBox="0 0 400 380" className="mx-auto h-auto w-full max-w-lg" role="img" aria-label="الأوتار في الدائرة">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="currentColor" strokeWidth={2} />
          <L a={A} b={B} w={3} c="#2b7de9" /><L a={[CX, CY]} b={M} c="#ea580c" dash /><L a={[CX, CY]} b={B} c="#0e9f6e" dash />
          <L a={C2} b={D2} w={3} c="#7c3aed" /><L a={[CX, CY]} b={M2} c="#ea580c" dash />
          <circle cx={CX} cy={CY} r={4} fill="currentColor" /><T p={[CX, CY]} t="م" dx={-12} />
          <T p={A} t="أ" dy={22} /><T p={B} t="ب" dy={22} />
        </svg>
      ) : (
        <svg viewBox="0 0 400 380" className="mx-auto h-auto w-full max-w-lg" role="img" aria-label="المماسان من نقطة خارجية">
          <circle cx={O2[0]} cy={O2[1]} r={RR} fill="none" stroke="currentColor" strokeWidth={2} />
          <L a={N} b={tA} c="#ea580c" w={3} /><L a={N} b={tB} c="#ea580c" w={3} /><L a={O2} b={tA} /><L a={O2} b={tB} /><L a={O2} b={N} dash />
          <circle cx={O2[0]} cy={O2[1]} r={4} fill="currentColor" /><T p={O2} t="م" dx={-12} /><T p={tA} t="أ" /><T p={tB} t="ب" dy={24} /><T p={N} t="ن" dx={14} dy={5} />
        </svg>
      )}
      {mode === "chord" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="نصف الوتر" value={`\\sqrt{${r}^2 - ${r1(d)}^2} = ${r1(half)}`} />
          <Stat label="طول الوتر أب" value={`${r1(2 * half)} سم`} />
          <Stat label="طول الوتر الثاني" value={`${r1(2 * half)} سم`} hint="على البُعد نفسه من المركز" />
          <Stat label="العمود من المركز" value="ينصّف الوتر" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="ن أ" value={`\\sqrt{${ext}^2 - ${r}^2} = ${r1(tangentLen)} سم`} />
          <Stat label="ن ب" value={`${r1(tangentLen)} سم`} hint="المماسان متساويان" />
          <Stat label="ق(م أ ن)" value="90°" hint="المماس ⊥ نصف القطر" />
        </div>
      )}
      <p className="text-xs muted">الرسم توضيحي بمقياس تقريبي؛ القيم المحسوبة دقيقة. <Num>{""}</Num></p>
    </LabGrid>
  );
}
