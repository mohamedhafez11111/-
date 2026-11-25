"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UNITS, LESSONS, BANK_QUESTIONS, SKILLS, UNIT_BY_ID } from "@/content";
import { DIFFICULTY_LABEL, QTYPE_LABEL, type QuestionType } from "@/content/types";
import { PageHeader, usePublicContent, Empty } from "@/components/ui/bits";
import { PracticeQuestion } from "@/components/questions/QuestionCard";
import { useProgress, skillMastery } from "@/lib/progress";
import { Num } from "@/components/ui/MathText";
import { Icon } from "@/components/ui/Icon";

const PAGE = 8;

function BankInner() {
  const sp = useSearchParams();
  const { p } = useProgress();
  const { data: pub } = usePublicContent();
  const [unit, setUnit] = useState("all");
  const [lesson, setLesson] = useState(sp.get("lesson") ?? "all");
  const [skill, setSkill] = useState(sp.get("skill") ?? "all");
  const [diff, setDiff] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  useEffect(() => { const l = sp.get("lesson"); if (l) { setLesson(l); setUnit(LESSONS.find((x) => x.id === l)?.unitId ?? "all"); } }, [sp]);
  useEffect(() => setPage(0), [unit, lesson, skill, diff, type, status]);

  const all = useMemo(() => [...BANK_QUESTIONS, ...pub.questions].filter((q) => !pub.hiddenQuestions.includes(q.id)), [pub]);
  const list = all.filter((q) => {
    const l = LESSONS.find((x) => x.id === q.lessonId);
    if (unit !== "all" && l?.unitId !== unit) return false;
    if (lesson !== "all" && q.lessonId !== lesson) return false;
    if (skill !== "all" && q.skill !== skill) return false;
    if (diff !== "all" && String(q.difficulty) !== diff) return false;
    if (type !== "all" && q.type !== type && q.format !== type) return false;
    const a = p.answers[q.id];
    if (status === "new" && a) return false;
    if (status === "wrong" && !(a && !a.last)) return false;
    if (status === "right" && !(a && a.last)) return false;
    return true;
  });
  const lessons = LESSONS.filter((l) => unit === "all" || l.unitId === unit);
  const skills = SKILLS.filter((s) => (lesson === "all" ? unit === "all" || s.unitId === unit : s.lessonId === lesson));
  const pages = Math.ceil(list.length / PAGE);

  return (
    <div>
      <PageHeader icon="bank" title="بنك الأسئلة" subtitle={`${all.length} سؤالاً منظمة حسب الوحدة والدرس والمهارة والصعوبة والنوع، مع تصحيح فوري وشرح وسؤال مشابه عند الخطأ.`}>
        <Link href={`/exams?mode=practice${lesson !== "all" ? `&lesson=${lesson}` : unit !== "all" ? `&unit=${unit}` : ""}`} className="btn btn-primary"><Icon name="exam" size={18} /> اختبار عشوائي من هذا الاختيار</Link>
      </PageHeader>
      <div className="card mb-5 grid gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
        <select className="input" value={unit} onChange={(e) => { setUnit(e.target.value); setLesson("all"); setSkill("all"); }} aria-label="الوحدة">
          <option value="all">كل الوحدات</option>{UNITS.map((u) => <option key={u.id} value={u.id}>الوحدة {u.number}: {u.title}</option>)}
        </select>
        <select className="input" value={lesson} onChange={(e) => { setLesson(e.target.value); setSkill("all"); }} aria-label="الدرس">
          <option value="all">كل الدروس</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.id} {l.title}</option>)}
        </select>
        <select className="input" value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="المهارة">
          <option value="all">كل المهارات</option>{skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="الصعوبة">
          <option value="all">كل المستويات</option>{([1, 2, 3, 4] as const).map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
        </select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="نوع السؤال">
          <option value="all">كل الأنواع</option>{(Object.keys(QTYPE_LABEL) as QuestionType[]).map((t) => <option key={t} value={t}>{QTYPE_LABEL[t]}</option>)}
          <option value="graph">قراءة رسم بياني</option><option value="table">تحليل جدول</option><option value="word">مسألة لفظية</option>
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="الحالة">
          <option value="all">كل الأسئلة</option><option value="new">لم أحلها بعد</option><option value="wrong">أخطأت فيها</option><option value="right">أجبتها صحيحاً</option>
        </select>
      </div>

      {skills.length > 0 && skills.length <= 16 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {skills.map((s) => {
            const m = skillMastery(p, s.id);
            return (
              <button key={s.id} onClick={() => setSkill(skill === s.id ? "all" : s.id)} className={`chip !py-1.5 ${skill === s.id ? "ring-2 ring-brand-500" : ""} ${m === null ? "bg-black/5 dark:bg-white/10" : m >= 0.7 ? "bg-ok-50 text-ok-700" : m >= 0.4 ? "bg-warn-50 text-warn-700" : "bg-bad-50 text-bad-700"}`}>
                {s.name} {m !== null && <Num>{`${Math.round(m * 100)}%`}</Num>}
              </button>
            );
          })}
        </div>
      )}

      <p className="mb-3 text-sm muted"><Num>{list.length}</Num> سؤالاً مطابقاً</p>
      {list.length === 0 ? <Empty title="لا توجد أسئلة مطابقة" icon="bank">غيّر عوامل التصفية.</Empty> : (
        <div className="space-y-4">
          {list.slice(page * PAGE, page * PAGE + PAGE).map((q) => (
            <div key={q.id}>
              <div className="mb-1 text-xs muted">{UNIT_BY_ID[LESSONS.find((l) => l.id === q.lessonId)!.unitId].title} · {q.source === "teacher" ? "سؤال من المعلم" : ""} <span className="ltr">{q.id}</span></div>
              <PracticeQuestion question={q} />
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button className="btn btn-ghost" disabled={page === 0} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0 }); }}>السابق</button>
          <span className="text-sm"><Num>{`${page + 1} / ${pages}`}</Num></span>
          <button className="btn btn-ghost" disabled={page >= pages - 1} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0 }); }}>التالي</button>
        </div>
      )}
    </div>
  );
}

export default function BankPage() {
  return <Suspense fallback={<div className="muted">جارٍ التحميل…</div>}><BankInner /></Suspense>;
}
