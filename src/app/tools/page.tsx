"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/bits";
import { Icon } from "@/components/ui/Icon";
import { useToolsList } from "@/components/tools/Tools";

export default function ToolsPage() {
  const tools = useToolsList();
  const [active, setActive] = useState("sci");
  useEffect(() => { const h = window.location.hash.slice(1); if (h && tools.some((t) => t.id === h)) setActive(h); }, [tools]);
  const T = tools.find((t) => t.id === active)!;
  return (
    <div>
      <PageHeader icon="tools" title="أدوات الرياضيات" subtitle="أدوات مستقلة تعمل دون اتصال: آلات حاسبة، كسور، نسب مئوية، جداول، رسم المستقيمات والدوال، المستوى الإحداثي، ومحرر المعادلات." />
      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col" aria-label="الأدوات">
          {tools.map((t) => (
            <button key={t.id} onClick={() => { setActive(t.id); history.replaceState(null, "", `#${t.id}`); }} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-semibold ${active === t.id ? "bg-brand-600 text-white" : "surface border line"}`}>
              <Icon name={t.icon} size={18} />{t.title}
            </button>
          ))}
          <Link href="/labs/charts" className="flex shrink-0 items-center gap-2 rounded-xl border line px-3 py-2.5 text-sm font-semibold surface"><Icon name="data" size={18} />المخططات الإحصائية ←</Link>
          <Link href="/whiteboard" className="flex shrink-0 items-center gap-2 rounded-xl border line px-3 py-2.5 text-sm font-semibold surface"><Icon name="triangle" size={18} />الهندسة والرسم (السبورة) ←</Link>
        </nav>
        <section className="card p-5" aria-label={T.title}>
          <h2 className="mb-4 text-lg font-bold">{T.title}</h2>
          <T.C />
        </section>
      </div>
    </div>
  );
}
