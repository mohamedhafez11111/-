"use client";
/**
 * السبورة الرياضية التفاعلية: رسم حر، أشكال، نصوص ومعادلات، محاور وشبكة، رسم دوال،
 * جداول، مخططات، صور، تحديد وتحريك، تراجع وإعادة، حفظ صورة/ملف، ملء الشاشة. تدعم اللمس والقلم.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { parseMath } from "@/components/ui/MathText";
import { compileFn, parse } from "@/lib/math/expr";
import { readLS, writeLS } from "@/lib/storage";
import { Calculator } from "@/components/tools/Tools";
import type { IconName } from "@/content/types";
import { useSettings } from "@/lib/settings";

type Pt = { x: number; y: number };
type Base = { id: string; color: string; width: number };
type Obj =
  | (Base & { t: "pen"; pts: Pt[]; hl?: boolean })
  | (Base & { t: "line" | "arrow" | "rect" | "ellipse" | "triangle"; a: Pt; b: Pt })
  | (Base & { t: "text" | "math"; p: Pt; text: string; size: number })
  | (Base & { t: "axes"; a: Pt; b: Pt; step: number })
  | (Base & { t: "graph"; a: Pt; b: Pt; expr: string; range: number })
  | (Base & { t: "table"; p: Pt; cells: string[][]; cw: number; ch: number })
  | (Base & { t: "chart"; a: Pt; b: Pt; values: number[]; labels: string[] })
  | (Base & { t: "image"; a: Pt; b: Pt; src: string });

type Tool = "select" | "pen" | "hl" | "eraser" | "line" | "arrow" | "rect" | "ellipse" | "triangle" | "text" | "math" | "axes" | "graph" | "table" | "chart";

const COLORS = ["#0f2a4a", "#dc2626", "#2b7de9", "#16a34a", "#ea580c", "#7c3aed", "#db2777", "#ffffff"];
const uid = () => Math.random().toString(36).slice(2, 9);
const imgCache = new Map<string, HTMLImageElement>();
/** أرقام اللوحة تتبع إعداد الأرقام في المنصة */
let EASTERN = true;
const dg = (s: string) => (EASTERN ? s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]) : s);

function bbox(o: Obj, ctx?: CanvasRenderingContext2D): { x: number; y: number; w: number; h: number } {
  switch (o.t) {
    case "pen": {
      const xs = o.pts.map((p) => p.x), ys = o.pts.map((p) => p.y);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    case "text": case "math": {
      const w = ctx ? measureMath(ctx, o.t === "math" ? parseMath(o.text) : [o.text], o.size).w : o.text.length * o.size * 0.6;
      return { x: o.p.x - w, y: o.p.y - o.size, w, h: o.size * (o.t === "math" ? 2.2 : 1.4) };
    }
    case "table": return { x: o.p.x, y: o.p.y, w: o.cells[0].length * o.cw, h: o.cells.length * o.ch };
    default: return { x: Math.min(o.a.x, o.b.x), y: Math.min(o.a.y, o.b.y), w: Math.abs(o.b.x - o.a.x), h: Math.abs(o.b.y - o.a.y) };
  }
}

function moveObj(o: Obj, dx: number, dy: number): Obj {
  const m = (p: Pt) => ({ x: p.x + dx, y: p.y + dy });
  switch (o.t) {
    case "pen": return { ...o, pts: o.pts.map(m) };
    case "text": case "math": case "table": return { ...o, p: m(o.p) };
    default: return { ...o, a: m(o.a), b: m(o.b) };
  }
}

// ---------- رسم الرياضيات على اللوحة (من اليمين إلى اليسار) ----------
type MNode = ReturnType<typeof parseMath>[number];
function measureMath(ctx: CanvasRenderingContext2D, nodes: MNode[], size: number): { w: number; up: number; down: number } {
  let w = 0, up = size * 0.8, down = size * 0.25;
  for (const n of nodes) {
    if (typeof n === "string") { ctx.font = `${size}px "IBM Plex Sans Arabic", Tahoma, sans-serif`; w += ctx.measureText(dg(n)).width; }
    else if (n.t === "frac") {
      const a = measureMath(ctx, n.n, size * 0.85), b = measureMath(ctx, n.d, size * 0.85);
      w += Math.max(a.w, b.w) + size * 0.3; up = Math.max(up, a.up + a.down + size * 0.3); down = Math.max(down, b.up + b.down + size * 0.1);
    } else if (n.t === "sqrt") { const a = measureMath(ctx, n.a, size); w += a.w + size * 0.7; up = Math.max(up, a.up + size * 0.15); }
    else if (n.t === "sup" || n.t === "sub") { const a = measureMath(ctx, n.a, size * 0.65); w += a.w; if (n.t === "sup") up = Math.max(up, size * 0.4 + a.up); else down = Math.max(down, size * 0.3 + a.down); }
    else { const a = measureMath(ctx, n.a, size); w += a.w; }
  }
  return { w, up, down };
}
/** يرسم العقد بدءاً من الحافة اليمنى x باتجاه اليسار */
function drawMath(ctx: CanvasRenderingContext2D, nodes: MNode[], x: number, y: number, size: number, color: string): number {
  let cx = x;
  for (const n of nodes) {
    if (typeof n === "string") {
      ctx.font = `${size}px "IBM Plex Sans Arabic", Tahoma, sans-serif`;
      ctx.fillStyle = color; ctx.textAlign = "right"; ctx.direction = "rtl";
      ctx.fillText(dg(n), cx, y);
      cx -= ctx.measureText(dg(n)).width;
    } else if (n.t === "frac") {
      const s = size * 0.85;
      const a = measureMath(ctx, n.n, s), b = measureMath(ctx, n.d, s);
      const w = Math.max(a.w, b.w) + size * 0.2;
      const mid = cx - size * 0.05 - w / 2;
      drawMath(ctx, n.n, mid + a.w / 2, y - size * 0.35 - a.down - 2, s, color);
      drawMath(ctx, n.d, mid + b.w / 2, y - size * 0.3 + b.up + 4, s, color);
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, size / 16);
      ctx.beginPath(); ctx.moveTo(cx - size * 0.05, y - size * 0.3); ctx.lineTo(cx - size * 0.05 - w, y - size * 0.3); ctx.stroke();
      cx -= w + size * 0.1;
    } else if (n.t === "sqrt") {
      const a = measureMath(ctx, n.a, size);
      ctx.font = `${size}px Tahoma`; ctx.fillStyle = color; ctx.textAlign = "right";
      ctx.fillText("√", cx, y);
      const sw = ctx.measureText("√").width;
      drawMath(ctx, n.a, cx - sw, y, size, color);
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - sw * 0.6, y - size * 0.85); ctx.lineTo(cx - sw - a.w, y - size * 0.85); ctx.stroke();
      cx -= sw + a.w;
    } else if (n.t === "sup" || n.t === "sub") {
      const s = size * 0.65;
      const a = measureMath(ctx, n.a, s);
      drawMath(ctx, n.a, cx, n.t === "sup" ? y - size * 0.45 : y + size * 0.25, s, color);
      cx -= a.w;
    } else {
      cx = drawMath(ctx, n.a, cx, y, size, color);
    }
  }
  return cx;
}

function drawObj(ctx: CanvasRenderingContext2D, o: Obj, redraw: () => void) {
  ctx.save();
  ctx.strokeStyle = o.color; ctx.fillStyle = o.color; ctx.lineWidth = o.width; ctx.lineCap = "round"; ctx.lineJoin = "round";
  switch (o.t) {
    case "pen":
      if (o.hl) { ctx.globalAlpha = 0.3; ctx.lineWidth = o.width * 4; }
      ctx.beginPath();
      o.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (o.pts.length === 1) ctx.lineTo(o.pts[0].x + 0.1, o.pts[0].y);
      ctx.stroke();
      break;
    case "line": case "arrow":
      ctx.beginPath(); ctx.moveTo(o.a.x, o.a.y); ctx.lineTo(o.b.x, o.b.y); ctx.stroke();
      if (o.t === "arrow") {
        const ang = Math.atan2(o.b.y - o.a.y, o.b.x - o.a.x), L = 10 + o.width * 2;
        ctx.beginPath(); ctx.moveTo(o.b.x, o.b.y); ctx.lineTo(o.b.x - L * Math.cos(ang - 0.45), o.b.y - L * Math.sin(ang - 0.45)); ctx.lineTo(o.b.x - L * Math.cos(ang + 0.45), o.b.y - L * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill();
      }
      break;
    case "rect": ctx.strokeRect(o.a.x, o.a.y, o.b.x - o.a.x, o.b.y - o.a.y); break;
    case "ellipse": ctx.beginPath(); ctx.ellipse((o.a.x + o.b.x) / 2, (o.a.y + o.b.y) / 2, Math.abs(o.b.x - o.a.x) / 2, Math.abs(o.b.y - o.a.y) / 2, 0, 0, Math.PI * 2); ctx.stroke(); break;
    case "triangle": ctx.beginPath(); ctx.moveTo((o.a.x + o.b.x) / 2, o.a.y); ctx.lineTo(o.b.x, o.b.y); ctx.lineTo(o.a.x, o.b.y); ctx.closePath(); ctx.stroke(); break;
    case "text":
      ctx.font = `${o.size}px "IBM Plex Sans Arabic", Tahoma, sans-serif`; ctx.textAlign = "right"; ctx.direction = "rtl";
      ctx.fillText(dg(o.text), o.p.x, o.p.y);
      break;
    case "math": drawMath(ctx, parseMath(o.text), o.p.x, o.p.y, o.size, o.color); break;
    case "axes": case "graph": {
      const { x, y, w, h } = bbox(o);
      const cx = x + w / 2, cy = y + h / 2;
      const step = o.t === "axes" ? o.step : Math.max(12, w / (2 * o.range));
      ctx.lineWidth = 1; ctx.globalAlpha = 0.25;
      for (let gx = cx % step; gx <= w; gx += step) { ctx.beginPath(); ctx.moveTo(x + gx, y); ctx.lineTo(x + gx, y + h); ctx.stroke(); }
      for (let gy = cy % step; gy <= h; gy += step) { ctx.beginPath(); ctx.moveTo(x, y + gy); ctx.lineTo(x + w, y + gy); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h); ctx.stroke();
      ctx.font = "13px Tahoma"; ctx.textAlign = "center";
      ctx.fillText("س", x + w - 8, cy - 8); ctx.fillText("ص", cx + 12, y + 14);
      if (o.t === "graph") {
        const R = o.range;
        let f: (v: number) => number;
        try { f = compileFn(o.expr); } catch { break; }
        ctx.strokeStyle = "#2b7de9"; ctx.lineWidth = 2.6;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i <= 300; i++) {
          const xv = -R + (2 * R * i) / 300, yv = f(xv);
          const px = cx + (xv / R) * (w / 2), py = cy - (yv / R) * (w / 2);
          if (!Number.isFinite(yv) || Math.abs(py - cy) > h * 2) { pen = false; continue; }
          if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          pen = true;
        }
        ctx.stroke(); ctx.restore();
        ctx.fillStyle = "#2b7de9"; ctx.font = "15px Tahoma"; ctx.textAlign = "right"; ctx.direction = "rtl";
        ctx.fillText(dg(`ص = ${o.expr}`), x + w - 6, y + h - 8);
      }
      break;
    }
    case "table":
      ctx.lineWidth = 1.5; ctx.font = "16px Tahoma"; ctx.textAlign = "center"; ctx.direction = "rtl";
      o.cells.forEach((row, r) => row.forEach((c, k) => {
        const cxp = o.p.x + (row.length - 1 - k) * o.cw; // الأعمدة من اليمين
        if (r === 0) { ctx.save(); ctx.globalAlpha = 0.1; ctx.fillRect(cxp, o.p.y, o.cw, o.ch); ctx.restore(); }
        ctx.strokeRect(cxp, o.p.y + r * o.ch, o.cw, o.ch);
        ctx.fillText(dg(c), cxp + o.cw / 2, o.p.y + r * o.ch + o.ch / 2 + 6);
      }));
      break;
    case "chart": {
      const { x, y, w, h } = bbox(o);
      const max = Math.max(1, ...o.values);
      const bw = w / (o.values.length * 1.5 + 0.5);
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
      o.values.forEach((v, i) => {
        const bh = (v / max) * (h - 20);
        ctx.globalAlpha = 0.75; ctx.fillRect(x + bw * 0.5 + i * bw * 1.5, y + h - bh, bw, bh); ctx.globalAlpha = 1;
        ctx.font = "13px Tahoma"; ctx.textAlign = "center";
        ctx.fillText(dg(String(v)), x + bw + i * bw * 1.5, y + h - bh - 5);
        ctx.fillText(dg(o.labels[i] ?? ""), x + bw + i * bw * 1.5, y + h + 16);
      });
      break;
    }
    case "image": {
      let img = imgCache.get(o.src);
      if (!img) { img = new Image(); img.onload = redraw; img.src = o.src; imgCache.set(o.src, img); }
      if (img.complete) ctx.drawImage(img, Math.min(o.a.x, o.b.x), Math.min(o.a.y, o.b.y), Math.abs(o.b.x - o.a.x), Math.abs(o.b.y - o.a.y));
      break;
    }
  }
  ctx.restore();
}

const TOOLBAR: { id: Tool; icon: IconName; label: string }[] = [
  { id: "select", icon: "select", label: "تحديد وتحريك" }, { id: "pen", icon: "pen", label: "قلم" }, { id: "hl", icon: "pen", label: "قلم تظليل" },
  { id: "eraser", icon: "eraser", label: "ممحاة" }, { id: "line", icon: "line", label: "خط مستقيم" }, { id: "arrow", icon: "arrow", label: "سهم" },
  { id: "rect", icon: "square", label: "مستطيل" }, { id: "ellipse", icon: "circle", label: "دائرة" }, { id: "triangle", icon: "triangle", label: "مثلث" },
  { id: "text", icon: "text", label: "نص" }, { id: "math", icon: "function", label: "معادلة" }, { id: "axes", icon: "axes", label: "محاور إحداثية" },
  { id: "graph", icon: "graph", label: "رسم دالة" }, { id: "table", icon: "grid", label: "جدول" }, { id: "chart", icon: "data", label: "مخطط أعمدة" },
];

export function Whiteboard() {
  const { settings } = useSettings();
  EASTERN = settings.digits === "eastern";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [objs, setObjs] = useState<Obj[]>([]);
  const [undo, setUndo] = useState<Obj[][]>([]);
  const [redo, setRedo] = useState<Obj[][]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(3);
  const [grid, setGrid] = useState<"none" | "grid" | "dots">("grid");
  const [dark, setDark] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Obj | null>(null);
  const [editor, setEditor] = useState<{ kind: "text" | "math" | "graph" | "table" | "chart"; p: Pt; b?: Pt; value: string } | null>(null);
  const [panel, setPanel] = useState<"none" | "calc" | "steps">("none");
  const [steps, setSteps] = useState<string>("الخطوة 1: اكتب المعطيات\nالخطوة 2: حدد القانون\nالخطوة 3: عوّض واحسب");
  const [shown, setShown] = useState(0);
  const drag = useRef<{ start: Pt; last: Pt; moving?: boolean } | null>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });

  // تحميل وحفظ تلقائي
  useEffect(() => { setObjs(readLS<Obj[]>("board", [])); }, []);
  useEffect(() => { const t = setTimeout(() => writeLS("board", objs.filter((o) => o.t !== "image" || o.src.length < 1_500_000)), 400); return () => clearTimeout(t); }, [objs]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const redrawRef = useRef<() => void>(() => {});
  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== size.w * dpr || c.height !== size.h * dpr) { c.width = size.w * dpr; c.height = size.h * dpr; }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = dark ? "#10261c" : "#ffffff";
    ctx.fillRect(0, 0, size.w, size.h);
    if (grid !== "none") {
      ctx.fillStyle = ctx.strokeStyle = dark ? "rgba(255,255,255,.15)" : "rgba(15,42,74,.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x < size.w; x += 30) for (let y = 0; y < size.h; y += 30) {
        if (grid === "dots") { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill(); }
      }
      if (grid === "grid") {
        for (let x = 0; x < size.w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.h); ctx.stroke(); }
        for (let y = 0; y < size.h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.w, y); ctx.stroke(); }
      }
    }
    for (const o of [...objs, ...(draft ? [draft] : [])]) drawObj(ctx, o, () => redrawRef.current());
    const s = objs.find((o) => o.id === sel);
    if (s) {
      const b = bbox(s, ctx);
      ctx.save(); ctx.strokeStyle = "#2b7de9"; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12); ctx.restore();
    }
  }, [objs, draft, sel, grid, size, dark, settings.digits]);
  redrawRef.current = redraw;
  useEffect(() => { redraw(); }, [redraw]);

  const commit = (next: Obj[]) => { setUndo((u) => [...u.slice(-60), objs]); setRedo([]); setObjs(next); };
  const pos = (e: React.PointerEvent): Pt => { const r = canvasRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const hit = (p: Pt): Obj | undefined => {
    const ctx = canvasRef.current?.getContext("2d") ?? undefined;
    return [...objs].reverse().find((o) => {
      const b = bbox(o, ctx);
      if (o.t === "pen") return o.pts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 10 + o.width);
      return p.x >= b.x - 8 && p.x <= b.x + b.w + 8 && p.y >= b.y - 8 && p.y <= b.y + b.h + 8;
    });
  };

  const down = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = pos(e);
    drag.current = { start: p, last: p };
    if (tool === "select") { const h = hit(p); setSel(h?.id ?? null); if (h) drag.current.moving = true; return; }
    if (tool === "eraser") { const h = hit(p); if (h) commit(objs.filter((o) => o.id !== h.id)); return; }
    if (tool === "text" || tool === "math") { setEditor({ kind: tool, p, value: "" }); drag.current = null; return; }
    if (tool === "table") { setEditor({ kind: "table", p, value: "س | 0 | 1 | 2 | 3\nص |  |  |  | " }); drag.current = null; return; }
    if (tool === "pen" || tool === "hl") { setDraft({ id: uid(), t: "pen", pts: [p], color, width, hl: tool === "hl" }); return; }
    const t = tool === "axes" || tool === "graph" || tool === "chart" ? "rect" : tool;
    setDraft({ id: uid(), t, a: p, b: p, color, width } as Obj);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = pos(e);
    if (tool === "select" && drag.current.moving && sel) {
      const dx = p.x - drag.current.last.x, dy = p.y - drag.current.last.y;
      setObjs((os) => os.map((o) => (o.id === sel ? moveObj(o, dx, dy) : o)));
      drag.current.last = p;
      return;
    }
    if (tool === "eraser") { const h = hit(p); if (h) setObjs((os) => os.filter((o) => o.id !== h.id)); return; }
    if (!draft) return;
    if (draft.t === "pen") setDraft({ ...draft, pts: [...draft.pts, p] });
    else if ("a" in draft) {
      let b = p;
      if (e.shiftKey && (draft.t === "rect" || draft.t === "ellipse")) { const d = Math.max(Math.abs(p.x - draft.a.x), Math.abs(p.y - draft.a.y)); b = { x: draft.a.x + Math.sign(p.x - draft.a.x) * d, y: draft.a.y + Math.sign(p.y - draft.a.y) * d }; }
      setDraft({ ...draft, b } as Obj);
    }
  };
  const up = () => {
    if (tool === "select" && drag.current?.moving) { setUndo((u) => [...u.slice(-60), objs]); }
    if (draft) {
      if (draft.t !== "pen" && "a" in draft && Math.hypot(draft.b.x - draft.a.x, draft.b.y - draft.a.y) < 6) { setDraft(null); drag.current = null; return; }
      if (tool === "axes" && "a" in draft) commit([...objs, { id: draft.id, t: "axes", a: draft.a, b: draft.b, color, width: 2, step: 30 }]);
      else if (tool === "graph" && "a" in draft) setEditor({ kind: "graph", p: draft.a, b: draft.b, value: "س^2 - 2" });
      else if (tool === "chart" && "a" in draft) setEditor({ kind: "chart", p: draft.a, b: draft.b, value: "أ:5, ب:8, جـ:3, د:6" });
      else commit([...objs, draft]);
      setDraft(null);
    }
    drag.current = null;
  };

  const finishEditor = () => {
    if (!editor) return;
    const v = editor.value.trim();
    if (!v) { setEditor(null); return; }
    if (editor.kind === "text" || editor.kind === "math") commit([...objs, { id: uid(), t: editor.kind, p: editor.p, text: v, size: 18 + width * 3, color, width }]);
    else if (editor.kind === "graph") { try { parse(v); commit([...objs, { id: uid(), t: "graph", a: editor.p, b: editor.b!, expr: v, range: 6, color, width: 2 }]); } catch { alert("صيغة الدالة غير صحيحة"); return; } }
    else if (editor.kind === "table") { const rows = v.split("\n").map((r) => r.split("|").map((c) => c.trim())); const n = Math.max(...rows.map((r) => r.length)); commit([...objs, { id: uid(), t: "table", p: editor.p, cells: rows.map((r) => [...r, ...Array(n - r.length).fill("")]), cw: 64, ch: 38, color, width }]); }
    else if (editor.kind === "chart") { const pairs = v.split(/[,،]/).map((s) => s.split(":")); commit([...objs, { id: uid(), t: "chart", a: editor.p, b: editor.b!, labels: pairs.map((p) => p[0].trim()), values: pairs.map((p) => Number(p[1]) || 0), color, width }]); }
    setEditor(null);
  };

  const doUndo = () => { if (!undo.length) return; setRedo((r) => [objs, ...r]); setObjs(undo[undo.length - 1]); setUndo((u) => u.slice(0, -1)); setSel(null); };
  const doRedo = () => { if (!redo.length) return; setUndo((u) => [...u, objs]); setObjs(redo[0]); setRedo((r) => r.slice(1)); };
  const delSel = () => { if (sel) { commit(objs.filter((o) => o.id !== sel)); setSel(null); } };
  const dupSel = () => { const o = objs.find((x) => x.id === sel); if (o) { const n = { ...moveObj(o, 24, 24), id: uid() } as Obj; commit([...objs, n]); setSel(n.id); } };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (editor) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); doUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); doRedo(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); delSel(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const insertImage = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 360 / img.width, 300 / img.height);
        const c = document.createElement("canvas"); c.width = img.width * k * 2; c.height = img.height * k * 2;
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        const src = c.toDataURL("image/jpeg", 0.85);
        commit([...objs, { id: uid(), t: "image", a: { x: 40, y: 40 }, b: { x: 40 + img.width * k, y: 40 + img.height * k }, src, color, width }]);
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(f);
  };
  const savePng = () => { const a = document.createElement("a"); a.download = "سبورة-رياضيات.png"; a.href = canvasRef.current!.toDataURL("image/png"); a.click(); };
  const saveFile = () => { const a = document.createElement("a"); a.download = "سبورة.json"; a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: "math10-board", objs })], { type: "application/json" })); a.click(); };
  const loadFile = async (f: File) => { try { const j = JSON.parse(await f.text()); if (Array.isArray(j.objs)) commit(j.objs); } catch { alert("ملف غير صالح"); } };
  const fullscreen = () => { const el = document.getElementById("board-root"); if (!document.fullscreenElement) el?.requestFullscreen?.(); else document.exitFullscreen?.(); };
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const Btn = ({ onClick, active, label, icon, disabled }: { onClick: () => void; active?: boolean; label: string; icon: IconName; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={active} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl disabled:opacity-40 ${active ? "bg-brand-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/10"}`}><Icon name={icon} size={20} /></button>
  );

  return (
    <div id="board-root" className="flex h-[calc(100vh-57px)] flex-col bg-[var(--bg)]">
      <div className="flex flex-wrap items-center gap-1 border-b line surface p-1.5">
        {TOOLBAR.map((t) => <Btn key={t.id} onClick={() => { setTool(t.id); setSel(null); }} active={tool === t.id} label={t.label} icon={t.icon} />)}
        <span className="mx-1 h-8 w-px bg-black/10" />
        <Btn onClick={() => imgRef.current?.click()} label="إدراج صورة" icon="image" />
        <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ""; }} />
        <Btn onClick={doUndo} disabled={!undo.length} label="تراجع" icon="undo" />
        <Btn onClick={doRedo} disabled={!redo.length} label="إعادة" icon="redo" />
        {sel && <><Btn onClick={dupSel} label="نسخ العنصر" icon="plus" /><Btn onClick={delSel} label="حذف العنصر" icon="trash" /></>}
        <Btn onClick={() => { if (objs.length && confirm("مسح السبورة بالكامل؟")) commit([]); }} label="مسح السبورة" icon="refresh" />
        <span className="mx-1 h-8 w-px bg-black/10" />
        <div className="flex items-center gap-1" role="radiogroup" aria-label="اللون">
          {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border-2 ${color === c ? "scale-110 border-brand-500 ring-2 ring-brand-300" : "border-black/20"}`} style={{ background: c }} aria-label={`اللون ${c}`} />)}
        </div>
        <label className="flex items-center gap-1 px-1 text-xs"><span className="sr-only">السمك</span><input type="range" min={1} max={12} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-20 accent-brand-600" aria-label="سمك الخط" /></label>
        <span className="mx-1 h-8 w-px bg-black/10" />
        <select className="input !min-h-[40px] w-auto !py-1 text-sm" value={grid} onChange={(e) => setGrid(e.target.value as typeof grid)} aria-label="الخلفية"><option value="grid">شبكة مربعات</option><option value="dots">نقاط</option><option value="none">بدون</option></select>
        <Btn onClick={() => setDark(!dark)} active={dark} label="سبورة خضراء داكنة" icon="board" />
        <Btn onClick={() => setPanel(panel === "calc" ? "none" : "calc")} active={panel === "calc"} label="الآلة الحاسبة" icon="calc" />
        <Btn onClick={() => setPanel(panel === "steps" ? "none" : "steps")} active={panel === "steps"} label="إظهار خطوات الحل" icon="review" />
        <Btn onClick={savePng} label="حفظ كصورة" icon="download" />
        <Btn onClick={saveFile} label="حفظ ملف السبورة" icon="bookmark" />
        <Btn onClick={() => fileRef.current?.click()} label="فتح ملف سبورة" icon="upload" />
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />
        <Btn onClick={fullscreen} label="ملء الشاشة" icon="expand" />
      </div>
      <div className="relative flex min-h-0 flex-1">
        <div ref={wrapRef} className="relative min-w-0 flex-1 overflow-hidden">
          <canvas ref={canvasRef} style={{ width: size.w, height: size.h, touchAction: "none", cursor: tool === "select" ? "default" : "crosshair" }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="مساحة الرسم" />
          {editor && (
            <div className="absolute z-10 w-[min(92%,360px)] rounded-xl border line surface p-3 shadow-xl" style={{ left: Math.min(Math.max(8, editor.p.x - 300), size.w - 370), top: Math.min(editor.p.y + 10, size.h - 200) }}>
              <div className="mb-1 text-sm font-bold">{{ text: "أدخل النص", math: "أدخل المعادلة (\\frac{}{} للكسر، ^ للأس)", graph: "ص = (دالة بدلالة س)", table: "الجدول: افصل الأعمدة بـ | والصفوف بسطر جديد", chart: "القيم: تسمية:قيمة مفصولة بفواصل" }[editor.kind]}</div>
              {editor.kind === "table" ? (
                <textarea autoFocus className="input min-h-[90px]" value={editor.value} onChange={(e) => setEditor({ ...editor, value: e.target.value })} />
              ) : (
                <input autoFocus className="input" dir={editor.kind === "graph" ? "ltr" : "rtl"} value={editor.value} onChange={(e) => setEditor({ ...editor, value: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") finishEditor(); if (e.key === "Escape") setEditor(null); }} />
              )}
              {editor.kind === "math" && <div className="mt-1 flex flex-wrap gap-1">{[["كسر", "\\frac{}{}"], ["أس", "^{}"], ["جذر", "\\sqrt{}"], ["≤", "≤"], ["≥", "≥"], ["×", "×"], ["÷", "÷"], ["∝", "∝"]].map(([l, t]) => <button key={l} className="chip bg-black/5 !py-1" onClick={() => setEditor({ ...editor, value: editor.value + t })}>{l}</button>)}</div>}
              <div className="mt-2 flex gap-2"><button className="btn btn-primary !min-h-[38px]" onClick={finishEditor}>إضافة</button><button className="btn btn-ghost !min-h-[38px]" onClick={() => setEditor(null)}>إلغاء</button></div>
            </div>
          )}
        </div>
        {panel !== "none" && (
          <aside className="w-[min(90vw,340px)] shrink-0 overflow-y-auto border-r line surface p-3">
            {panel === "calc" && <Calculator />}
            {panel === "steps" && (
              <div className="space-y-2">
                <div className="font-bold">إظهار خطوات الحل تدريجياً</div>
                <textarea className="input min-h-[120px] text-sm" value={steps} onChange={(e) => { setSteps(e.target.value); setShown(0); }} aria-label="الخطوات" />
                <ol className="space-y-2">
                  {steps.split("\n").filter(Boolean).slice(0, shown).map((s, i) => <li key={i} className="anim-pop rounded-lg bg-brand-50 p-2 text-lg dark:bg-brand-900/40">{s}</li>)}
                </ol>
                <div className="flex gap-2"><button className="btn btn-primary !min-h-[40px]" onClick={() => setShown((n) => Math.min(n + 1, steps.split("\n").filter(Boolean).length))}>الخطوة التالية</button><button className="btn btn-ghost !min-h-[40px]" onClick={() => setShown(0)}>إخفاء الكل</button></div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
