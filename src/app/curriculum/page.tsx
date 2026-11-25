"use client";
import Link from "next/link";
import { UNITS, LESSON_BY_ID, questionsOfLesson } from "@/content";
import { LAB_META } from "@/components/labs/meta";
import { useProgress, lessonProgress, skillMastery } from "@/lib/progress";
import { PageHeader, UnitBadge, Bar } from "@/components/ui/bits";
import { Icon } from "@/components/ui/Icon";
import { Num } from "@/components/ui/MathText";

export default function CurriculumPage() {
  const { p } = useProgress();
  return (
    <div>
      <PageHeader icon="map" title="خريطة المنهج" subtitle="الوحدات الثماني ودروسها كما وردت في كتاب الطالب وكتاب النشاط – الصف العاشر – الفصل الدراسي الأول، مع المهارات والمتطلبات السابقة والأدوات المرتبطة بكل درس." />
      <ol className="relative space-y-6 border-r-2 border-dashed line pr-6">
        {UNITS.map((u) => (
          <li key={u.id} id={u.id} className="scroll-mt-24">
            <span className="absolute -right-[13px] mt-3 h-6 w-6 rounded-full border-4 border-[var(--bg)]" style={{ background: u.color }} />
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 p-4" style={{ background: `${u.color}12` }}>
                <UnitBadge unit={u} size={48} />
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: u.color }}>الوحدة <Num>{u.number}</Num></div>
                  <h2 className="text-xl font-bold">{u.title}</h2>
                  <p className="text-sm muted">{u.description}</p>
                </div>
                <div className="text-xs muted">كتاب الطالب ص <Num>{u.sbPage}</Num>{u.abMixedPage ? <> · تمارين متنوعة (النشاط) ص <Num>{u.abMixedPage}</Num></> : null}</div>
              </div>
              <div className="divide-y line">
                {u.lessonIds.map((id) => {
                  const l = LESSON_BY_ID[id];
                  const lp = lessonProgress(p, id);
                  return (
                    <div key={id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="chip text-white" style={{ background: u.color }}><Num>{id}</Num></span>
                          <Link href={`/lessons/${id}`} className="text-lg font-bold hover:text-brand-600">{l.title}</Link>
                          {p.lessons[id]?.completed && <span className="chip bg-ok-50 text-ok-700">✔ مكتمل</span>}
                        </div>
                        <div className="text-xs muted">كتاب الطالب ص <Num>{l.sbPage}</Num> · كتاب النشاط ص <Num>{l.abPages}</Num> · <Num>{questionsOfLesson(id).length}</Num> سؤالاً في البنك</div>
                        {l.prerequisites.length > 0 && (
                          <div className="text-sm"><span className="font-semibold">المتطلبات السابقة: </span>
                            {l.prerequisites.map((pr, i) => (
                              <span key={i}>{i > 0 && "، "}{pr.lessonId ? <Link className="text-brand-600 underline" href={`/lessons/${pr.lessonId}`}>{pr.text}</Link> : pr.text}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {l.skills.map((s) => {
                            const m = skillMastery(p, s.id);
                            return <span key={s.id} className={`chip ${m === null ? "bg-black/5 dark:bg-white/10" : m >= 0.7 ? "bg-ok-50 text-ok-700" : m >= 0.4 ? "bg-warn-50 text-warn-700" : "bg-bad-50 text-bad-700"}`} title={m === null ? "لم تُختبر بعد" : `إتقان ${Math.round(m * 100)}%`}>{s.name}</span>;
                          })}
                        </div>
                        <div className="max-w-sm"><Bar value={lp} color={u.color} /></div>
                      </div>
                      <div className="flex flex-wrap items-start gap-2 md:flex-col md:items-stretch">
                        <Link href={`/lessons/${id}`} className="btn btn-primary !min-h-[40px] text-sm"><Icon name="book" size={18} /> الدرس</Link>
                        <Link href={`/bank?lesson=${id}`} className="btn btn-soft !min-h-[40px] text-sm"><Icon name="bank" size={18} /> تدريب</Link>
                        {l.labs[0] && <Link href={`/labs/${l.labs[0]}`} className="btn btn-ghost !min-h-[40px] text-sm"><Icon name="flask" size={18} /> {LAB_META[l.labs[0]].title}</Link>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
