"use client";
import dynamic from "next/dynamic";

const Whiteboard = dynamic(() => import("@/components/whiteboard/Whiteboard").then((m) => m.Whiteboard), { ssr: false, loading: () => <div className="p-8 text-center muted">جارٍ تحميل السبورة…</div> });

export default function WhiteboardPage() {
  return <Whiteboard />;
}
