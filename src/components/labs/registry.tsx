"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { LabId } from "@/content/types";

const loading = () => <div className="grid h-64 place-items-center rounded-xl bg-black/[0.03] text-sm muted">جارٍ تحميل المختبر…</div>;

const G = () => import("./GraphLabs");
const D = () => import("./DataLabs");
const A = () => import("./AlgebraLabs");
const C = () => import("./CircleLabs");

export const LABS: Record<LabId, ComponentType> = {
  conversion: dynamic(() => G().then((m) => m.ConversionLab), { loading, ssr: false }),
  regions: dynamic(() => G().then((m) => m.RegionsLab), { loading, ssr: false }),
  "linear-programming": dynamic(() => G().then((m) => m.LinearProgrammingLab), { loading, ssr: false }),
  gradient: dynamic(() => G().then((m) => m.GradientLab), { loading, ssr: false }),
  motion: dynamic(() => G().then((m) => m.MotionLab), { loading, ssr: false }),
  "data-organizer": dynamic(() => D().then((m) => m.DataOrganizerLab), { loading, ssr: false }),
  charts: dynamic(() => D().then((m) => m.ChartsLab), { loading, ssr: false }),
  "stats-measures": dynamic(() => D().then((m) => m.StatsMeasuresLab), { loading, ssr: false }),
  "box-plot": dynamic(() => D().then((m) => m.BoxPlotLab), { loading, ssr: false }),
  scatter: dynamic(() => D().then((m) => m.ScatterLab), { loading, ssr: false }),
  histogram: dynamic(() => D().then((m) => m.HistogramLab), { loading, ssr: false }),
  cumulative: dynamic(() => D().then((m) => m.CumulativeLab), { loading, ssr: false }),
  "algebraic-fractions": dynamic(() => A().then((m) => m.AlgebraicFractionsLab), { loading, ssr: false }),
  proportion: dynamic(() => A().then((m) => m.ProportionLab), { loading, ssr: false }),
  functions: dynamic(() => A().then((m) => m.FunctionsLab), { loading, ssr: false }),
  "circle-symmetry": dynamic(() => C().then((m) => m.CircleSymmetryLab), { loading, ssr: false }),
  "circle-angles": dynamic(() => C().then((m) => m.CircleAnglesLab), { loading, ssr: false }),
};

export function LabEmbed({ id }: { id: LabId }) {
  const Lab = LABS[id];
  return <Lab />;
}
