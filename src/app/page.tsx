"use client";
import Link from "next/link";
import { UNITS, LESSON_BY_ID, LESSONS } from "@/content";
import { useProgress, curriculumProgress, unitMastery, lessonProgress, levelOf, stats, today } from "@/lib/progress";
import { Icon } from "@/components/ui/Icon";
import { Ring, Bar, UnitBadge, usePublicContent } from "@/components/ui/bits";
import { Num } from "@/components/ui/MathText";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "صباح الخير" : h < 18 ? "مساء الخير" : "مساء النور";
}

export default function Home() {
  const { p, ready } = useProgress();
  const { data } = usePublicContent();
  const prog = curriculumProgress(p);
  const st = stats(p);
  const lv = levelOf(p.xp);
  const nextLesson = p.lastLesson && !p.lessons[p.lastLesson]?.completed
    ? LESSON_BY_ID[p.lastLesson]
    : LESSONS.find((l) => !p.lessons[l.id]?.completed) ?? LESSONS[0];

  return (
    <div className="space-y-7">
      {/* الترحيب */}
      <section className="card relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-brand-100 opacity-60 dark:bg-brand-900/40" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="font-semibold text-brand-600">{greeting()} 👋</p>
            <h1 className="text-2xl font-bold sm:text-3xl">أهلاً بك في منصة الرياضيات التفاعلية</h1>
            <p className="max-w-xl muted">كل ما تحتاجه لرياضيات الصف العاشر – الفصل الدراسي الأول في مكان واحد: دروس تفاعلية، مختبرات، اختبارات، ألعاب، ومعلم ذكي.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href={`/lessons/${nextLesson.id}`} className="btn btn-primary"><Icon name="play" size={18} /> {ready && p.lastLesson ? "تابع التعلّم" : "ابدأ التعلّم"}: {nextLesson.id} {nextLesson.title}</Link>
              <Link href="/curriculum" className="btn btn-ghost"><Icon name="map" size={18} /> خريطة المنهج</Link>
            </div>
          </div>
          <div className="flex items-center gap-4 self-start rounded-2xl border line p-4 sm:self-auto">
            <Ring value={ready ? prog : 0} size={84} stroke={9} label="نسبة إنجاز المنهج" />
            <div className="space-y-1 text-sm">
              <div className="font-bold">إنجاز المنهج</div>
              <div className="muted">دروس مكتملة: <Num>{`${st.lessonsCompleted} / ${LESSONS.length}`}</Num></div>
              <div className="muted">المستوى <Num>{lv.level}</Num>: {lv.name}</div>
              <div className="muted">⚡ <Num>{p.xp}</Num> نقطة · 🔥 <Num>{p.streak.count}</Num> يوم</div>
            </div>
          </div>
        </div>
      </section>

      {/* الإعلانات */}
      {data.announcements.length > 0 && (
        <section aria-label="إعلانات المعلم" className="space-y-2">
          {data.announcements.map((a) => (
            <div key={a.id} className={`card flex gap-3 border-r-4 p-4 ${a.tone === "warn" ? "border-r-warn-500" : a.tone === "ok" ? "border-r-ok-500" : "border-r-brand-500"}`}>
              <Icon name={a.tone === "warn" ? "alert" : "flag"} className="mt-0.5 shrink-0" />
              <div><div className="font-bold">{a.title}</div><p className="whitespace-pre-line text-sm">{a.body}</p><div className="mt-1 text-xs muted">{a.date}</div></div>
            </div>
          ))}
        </section>
      )}

      {/* اختصارات */}
      <section aria-label="اختصارات" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: "/tutor", icon: "bot" as const, t: "المعلم الذكي", d: "اسأل واحصل على تلميح", c: "#1d63c9" },
          { href: "/whiteboard", icon: "board" as const, t: "السبورة", d: "ارسم وحل", c: "#0e9f6e" },
          { href: "/exams", icon: "exam" as const, t: "الاختبارات", d: "اختبر نفسك", c: "#7c3aed" },
          { href: "/games", icon: "game" as const, t: "الألعاب", d: "تحدَّ وتعلّم", c: "#ea580c" },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="card flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: x.c }}><Icon name={x.icon} /></span>
            <span className="font-bold">{x.t}</span>
            <span className="text-sm muted">{x.d}</span>
          </Link>
        ))}
      </section>

      {/* الوحدات */}
      <section aria-labelledby="units-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="units-h" className="text-xl font-bold">الوحدات الدراسية</h2>
          <Link href="/lessons" className="text-sm font-semibold text-brand-600">كل الدروس ←</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {UNITS.map((u) => {
            const lp = u.lessonIds.reduce((a, id) => a + lessonProgress(p, id), 0) / u.lessonIds.length;
            return (
              <Link key={u.id} href={`/curriculum#${u.id}`} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg" style={{ borderTop: `4px solid ${u.color}` }}>
                <div className="flex items-center gap-3">
                  <UnitBadge unit={u} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: u.color }}>الوحدة <Num>{u.number}</Num></div>
                    <div className="font-bold leading-snug">{u.title}</div>
                  </div>
                </div>
                <div className="text-xs muted"><Num>{u.lessonIds.length}</Num> {u.lessonIds.length > 2 ? "دروس" : u.lessonIds.length === 2 ? "درسان" : "درس"} · إتقان المهارات <Num>{`${Math.round(unitMastery(p, u.id) * 100)}%`}</Num></div>
                <Bar value={ready ? lp : 0} color={u.color} />
              </Link>
            );
          })}
        </div>
      </section>

      {/* النشاط الأخير */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Icon name="clock" size={20} /> آخر نشاطاتك</h2>
          {ready && p.activity.length ? (
            <ul className="space-y-2 text-sm">
              {p.activity.slice(0, 6).map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-b line pb-2 last:border-0">
                  {a.href ? <Link href={a.href} className="hover:text-brand-600">{a.text}</Link> : <span>{a.text}</span>}
                  <span className="shrink-0 text-xs muted">{new Date(a.ts).toLocaleDateString("ar-OM", { day: "numeric", month: "short" })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm muted">لم تبدأ بعد. اختر درساً وابدأ رحلتك!</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Icon name="bolt" size={20} /> التحدي اليومي</h2>
          <p className="mb-3 text-sm muted">خمسة أسئلة متنوعة كل يوم من دروس المنهج. أكملها لتحصل على 50 نقطة خبرة إضافية.</p>
          <div className="mb-3"><Bar value={ready && p.daily.date === today() ? p.daily.done / 5 : 0} color="#ea580c" /></div>
          <Link href="/review#daily" className="btn btn-warn">ابدأ التحدي اليومي</Link>
        </div>
      </section>
      <p className="text-center text-xs muted">يُحفظ تقدمك محلياً على هذا الجهاز فقط، ولا ينتقل تلقائياً إلى جهاز آخر. يمكنك تصديره من صفحة «إنجازاتي».</p>
    </div>
  );
}
