import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LAB_META, LAB_IDS } from "@/components/labs/meta";
import { LabEmbed } from "@/components/labs/registry";
import { LESSON_BY_ID, lc } from "@/content";
import type { LabId } from "@/content/types";

export function generateStaticParams() {
  return LAB_IDS.map((labId) => ({ labId }));
}

export async function generateMetadata({ params }: { params: Promise<{ labId: string }> }): Promise<Metadata> {
  const { labId } = await params;
  return { title: LAB_META[labId as LabId]?.title ?? "مختبر" };
}

export default async function LabPage({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = await params;
  const m = LAB_META[labId as LabId];
  if (!m) notFound();
  return (
    <div className="space-y-4">
      <div>
        <Link href="/labs" className="text-sm font-semibold text-brand-600">→ كل المختبرات</Link>
        <h1 className="mt-1 text-2xl font-bold">{m.title}</h1>
        <p className="muted">{m.desc}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {m.lessons.map((l) => <Link key={l} href={`/lessons/${l}`} className="chip bg-brand-50 !py-1.5 text-brand-700">الدرس {lc(l)}: {LESSON_BY_ID[l].title}</Link>)}
        </div>
      </div>
      <div className="card p-4"><LabEmbed id={labId as LabId} /></div>
    </div>
  );
}
