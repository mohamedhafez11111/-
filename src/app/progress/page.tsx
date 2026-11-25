"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { UNITS, LESSONS } from "@/content";
import { PageHeader, Ring, Bar } from "@/components/ui/bits";
import { useProgress, curriculumProgress, stats, unitMastery, weakSkills, levelOf, BADGES, resetProgress, skillMastery } from "@/lib/progress";
import { exportAll, importAll } from "@/lib/storage";
import { Num } from "@/components/ui/MathText";
import { Icon } from "@/components/ui/Icon";

export default function ProgressPage() {
  const { p, ready } = useProgress();
  const st = stats(p);
  const lv = levelOf(p.xp);
  const weak = weakSkills(p, 8);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const mastered = UNITS.filter((u) => unitMastery(p, u.id) >= 0.7);

  const doExport = () => {
    const blob = new Blob([JSON.stringify({ app: "math10-oman", exportedAt: new Date().toISOString(), data: exportAll() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `تقدمي-رياضيات-العاشر-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== "math10-oman" || typeof j.data !== "object") throw new Error();
      importAll(j.data);
      setMsg("تم استيراد بياناتك بنجاح ✔");
    } catch { setMsg("الملف غير صالح."); }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon="trophy" title="إنجازاتي وتقدمي" subtitle="هذه البيانات محفوظة على هذا الجهاز فقط ولا تمثل أداءك على الأجهزة الأخرى (لا توجد مزامنة سحابية لحسابات الطلاب). يمكنك نقلها يدوياً بالتصدير والاستيراد.">
        <button className="btn btn-ghost" onClick={doExport}><Icon name="download" size={18} /> تصدير نسخة احتياطية</button>
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} /> استيراد</button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }} />
      </PageHeader>
      {msg && <div className="card p-3 text-sm">{msg}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-4 p-4"><Ring value={ready ? curriculumProgress(p) : 0} size={72} /><div><div className="text-sm muted">إنجاز المنهج</div><div className="font-bold"><Num>{`${st.lessonsCompleted}/${LESSONS.length}`}</Num> دروس مكتملة</div></div></div>
        <div className="card p-4"><div className="text-sm muted">الأسئلة</div><div className="text-2xl font-bold"><Num>{st.attempts}</Num> محاولة</div><div className="text-sm">لـ <Num>{st.answeredQuestions}</Num> سؤالاً مختلفاً</div></div>
        <div className="card p-4"><div className="text-sm muted">نسبة الإجابات الصحيحة</div><div className="text-2xl font-bold"><Num>{`${Math.round(st.accuracy * 100)}%`}</Num></div><Bar value={st.accuracy} color="#16a34a" /></div>
        <div className="card p-4"><div className="text-sm muted">المستوى <Num>{lv.level}</Num>: {lv.name}</div><div className="text-2xl font-bold">⚡ <Num>{p.xp}</Num></div><Bar value={lv.pct} /><div className="mt-1 text-xs muted">🔥 <Num>{p.streak.count}</Num> يوم متتالٍ</div></div>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">إتقان الوحدات</h2>
        <div className="space-y-3">
          {UNITS.map((u) => {
            const m = unitMastery(p, u.id);
            return (
              <div key={u.id}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">الوحدة <Num>{u.number}</Num>: {u.title}</span><span><Num>{`${Math.round(m * 100)}%`}</Num> {m >= 0.7 && "✔ متقن"}</span></div>
                <Bar value={m} color={u.color} />
                <div className="mt-1 flex flex-wrap gap-1">
                  {LESSONS.filter((l) => l.unitId === u.id).flatMap((l) => l.skills).map((s) => { const sm = skillMastery(p, s.id); return <span key={s.id} className={`chip text-[11px] ${sm === null ? "bg-black/5" : sm >= 0.7 ? "bg-ok-50 text-ok-700" : sm >= 0.4 ? "bg-warn-50 text-warn-700" : "bg-bad-50 text-bad-700"}`}>{s.name}</span>; })}
                </div>
              </div>
            );
          })}
        </div>
        {mastered.length > 0 && <p className="mt-3 text-sm">الوحدات المتقنة: <b>{mastered.map((u) => u.title).join("، ")}</b></p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold">مهارات تحتاج إلى تحسين</h2>
          {weak.length === 0 ? <p className="text-sm muted">لا توجد بعد. استمر في التدريب!</p> : (
            <ul className="space-y-2">{weak.map((s) => <li key={s.id} className="flex items-center justify-between gap-2 text-sm"><span>{s.name} <span className="muted">(<Num>{`${Math.round(s.acc * 100)}%`}</Num>)</span></span><Link className="btn btn-soft !min-h-[34px] !px-3 text-xs" href={`/bank?skill=${s.id}`}>تدرّب</Link></li>)}</ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold">نتائج الاختبارات</h2>
          {p.exams.length === 0 ? <p className="text-sm muted">لم تؤدِّ اختبارات بعد. <Link href="/exams" className="text-brand-600">ابدأ اختباراً</Link></p> : (
            <ul className="divide-y line text-sm">{p.exams.slice(0, 8).map((e, i) => <li key={i} className="flex justify-between py-2"><span>{e.title}</span><b><Num>{`${Math.round(e.pct)}%`}</Num></b></li>)}</ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">الشارات</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const got = p.badges.includes(b.id);
            return <div key={b.id} className={`rounded-xl border-2 p-3 text-center ${got ? "border-warn-500 bg-warn-50/50" : "line opacity-50 grayscale"}`}><div className="text-3xl">{b.icon}</div><div className="font-bold">{b.name}</div><div className="text-xs muted">{b.desc}</div></div>;
          })}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">آخر النشاطات</h2>
        {p.activity.length === 0 ? <p className="text-sm muted">لا يوجد نشاط بعد.</p> : (
          <ul className="divide-y line text-sm">{p.activity.slice(0, 15).map((a, i) => <li key={i} className="flex justify-between gap-2 py-2">{a.href ? <Link href={a.href} className="hover:text-brand-600">{a.text}</Link> : <span>{a.text}</span>}<span className="shrink-0 text-xs muted">{new Date(a.ts).toLocaleString("ar-OM", { dateStyle: "short", timeStyle: "short" })}</span></li>)}</ul>
        )}
      </section>

      <div className="text-center">
        <button className="btn btn-ghost text-bad-700" onClick={() => { if (confirm("سيتم حذف تقدمك المحفوظ على هذا الجهاز. هل أنت متأكد؟")) resetProgress(); }}><Icon name="trash" size={18} /> إعادة تعيين التقدم</button>
      </div>
    </div>
  );
}
