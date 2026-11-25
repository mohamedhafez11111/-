"use client";
import Link from "next/link";
import { LAB_META, LAB_IDS } from "@/components/labs/meta";
import { UNIT_BY_ID } from "@/content";
import { PageHeader } from "@/components/ui/bits";
import { Icon } from "@/components/ui/Icon";

export default function LabsPage() {
  const groups = [...new Set(LAB_IDS.map((id) => LAB_META[id].group))];
  return (
    <div>
      <PageHeader icon="flask" title="المختبرات الرياضية" subtitle="تجارب تفاعلية مرتبطة بدروس المنهج: غيّر القيم، حرّك النقاط، ولاحظ النتائج. جميع الحسابات تتم على جهازك وتعمل دون اتصال." />
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="mb-3 text-lg font-bold">{g}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LAB_IDS.filter((id) => LAB_META[id].group === g).map((id) => {
                const m = LAB_META[id];
                const u = UNIT_BY_ID[m.unit];
                return (
                  <Link key={id} href={`/labs/${id}`} className="card flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: u.color }}><Icon name={m.icon} /></span>
                      <div><div className="font-bold">{m.title}</div><div className="text-xs muted">الدرس {m.lessons.join("، ")}</div></div>
                    </div>
                    <p className="text-sm muted">{m.desc}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
