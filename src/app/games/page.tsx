"use client";
import Link from "next/link";
import { GAME_META, GAME_IDS } from "@/components/games/meta";
import { PageHeader, Bar } from "@/components/ui/bits";
import { useProgress, levelOf, BADGES } from "@/lib/progress";
import { useLocal } from "@/lib/storage";
import { Num } from "@/components/ui/MathText";

export default function GamesPage() {
  const { p } = useProgress();
  const [best] = useLocal<Record<string, number>>("game-best", {});
  const lv = levelOf(p.xp);
  return (
    <div>
      <PageHeader icon="game" title="الألعاب والتحديات" subtitle="ألعاب تعليمية حقيقية مرتبطة بمهارات المنهج. التحفيز هنا لدعم الفهم: كل لعبة تعرض الحل الصحيح وسبب الخطأ." />
      <div className="card mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <div><div className="text-sm muted">المستوى</div><div className="text-2xl font-bold"><Num>{lv.level}</Num> · {lv.name}</div><div className="mt-2"><Bar value={lv.pct} /></div><div className="mt-1 text-xs muted"><Num>{`${p.xp} / ${lv.next}`}</Num> نقطة خبرة</div></div>
        <div><div className="text-sm muted">الشارات</div><div className="text-2xl">{BADGES.filter((b) => p.badges.includes(b.id)).map((b) => b.icon).join(" ") || "—"}</div><Link href="/progress" className="text-sm font-semibold text-brand-600">كل الشارات ←</Link></div>
        <div><div className="text-sm muted">الألعاب الملعوبة</div><div className="text-2xl font-bold"><Num>{p.games.length}</Num></div><Link href="/review#daily" className="text-sm font-semibold text-brand-600">التحدي اليومي ←</Link></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_IDS.map((id) => {
          const g = GAME_META[id];
          return (
            <Link key={id} href={`/games/${id}`} className="card group flex flex-col gap-2 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="grid h-24 place-items-center text-5xl" style={{ background: `${g.color}18` }}>{g.emoji}</div>
              <div className="space-y-1 p-4 pt-1">
                <div className="font-bold">{g.title}</div>
                <p className="text-sm muted">{g.desc}</p>
                <div className="flex items-center justify-between pt-1 text-xs"><span className="chip" style={{ background: `${g.color}18`, color: g.color }}>{g.skills}</span>{best[id] !== undefined && <span>أفضل نتيجة: <b><Num>{best[id]}</Num></b></span>}</div>
              </div>
            </Link>
          );
        })}
      </div>
      {p.games.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-2 font-bold">سجل الألعاب</h2>
          <ul className="divide-y line text-sm">
            {p.games.slice(0, 10).map((g, i) => <li key={i} className="flex justify-between py-2"><span>{GAME_META[g.game as keyof typeof GAME_META]?.title ?? g.game}</span><span><Num>{g.score}</Num> نقطة · {new Date(g.ts).toLocaleDateString("ar-OM")}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
