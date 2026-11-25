"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { UNITS, LESSONS, UNIT_BY_ID, lc } from "@/content";
import { PageHeader, Bar } from "@/components/ui/bits";
import { useProgress, lessonProgress } from "@/lib/progress";
import { Icon } from "@/components/ui/Icon";
import { Num } from "@/components/ui/MathText";

export default function LessonsPage() {
  const { p } = useProgress();
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState<string>("all");
  const list = useMemo(() => {
    const t = q.trim();
    return LESSONS.filter((l) => (unit === "all" || l.unitId === unit) && (!t || l.title.includes(t) || l.id.includes(t) || l.skills.some((s) => s.name.includes(t)) || l.objectives.some((o) => o.includes(t))));
  }, [q, unit]);

  return (
    <div>
      <PageHeader icon="book" title="مكتبة الدروس" subtitle="دروس الفصل الدراسي الأول بقالب موحّد: أهداف، تمهيد، شرح متدرّج بثلاثة مستويات، أمثلة محلولة، تدريبات، واختبار قصير." />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input className="input sm:max-w-sm" placeholder="ابحث عن درس أو مهارة…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث" />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button className={`chip shrink-0 !py-2 ${unit === "all" ? "bg-brand-600 text-white" : "bg-black/5 dark:bg-white/10"}`} onClick={() => setUnit("all")}>الكل</button>
          {UNITS.map((u) => (
            <button key={u.id} className="chip shrink-0 !py-2" style={unit === u.id ? { background: u.color, color: "#fff" } : { background: `${u.color}18`, color: u.color }} onClick={() => setUnit(u.id)}>الوحدة <Num>{u.number}</Num></button>
          ))}
        </div>
      </div>
      {list.length === 0 && <p className="muted">لا توجد نتائج.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((l) => {
          const u = UNIT_BY_ID[l.unitId];
          const lp = lessonProgress(p, l.id);
          return (
            <Link key={l.id} href={`/lessons/${l.id}`} className="card flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold text-white" style={{ background: u.color }}><Num>{lc(l.id)}</Num></span>
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block text-xs font-semibold" style={{ color: u.color }}>الوحدة <Num>{u.number}</Num>: {u.title}</span>
                <span className="block font-bold">{l.title}</span>
                <span className="block text-sm muted line-clamp-2">{l.objectives[0]}</span>
                <span className="flex items-center gap-2"><Bar value={lp} color={u.color} />{p.lessons[l.id]?.completed && <Icon name="check" size={18} className="text-ok-500" />}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
