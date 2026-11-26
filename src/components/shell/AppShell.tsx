"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { NAV, NAV_VISIBLE, BOTTOM_NAV } from "./nav";
import { SettingsContext, DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { readLS, writeLS } from "@/lib/storage";
import { TutorPanel } from "@/components/tutor/TutorPanel";
import { useTutorAvailable } from "@/lib/tutor";
import { BRAND } from "@/content/branding";
import { useProgress, levelOf } from "@/lib/progress";
import { Num } from "@/components/ui/MathText";

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-bold" aria-label="منصة الرياضيات التفاعلية – الرئيسية">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND.logo} alt={`شعار ${BRAND.schoolName}`} width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm" />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] text-brand-900 dark:text-white"><span className="sm:hidden">رياضيات العاشر</span><span className="hidden sm:inline">منصة الرياضيات التفاعلية</span></span>
          <span className="block text-xs font-medium muted"><span className="sm:hidden">{BRAND.schoolName}</span><span className="hidden sm:inline">{BRAND.schoolName} · الصف العاشر</span></span>
        </span>
      )}
    </Link>
  );
}

function ConnectionBadge() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="flex items-center gap-2 bg-warn-500 px-4 py-1.5 text-sm font-semibold text-white">
      <Icon name="wifi-off" size={18} /> أنت غير متصل بالإنترنت: الدروس والاختبارات والأدوات تعمل، أما المعلم الذكي فيحتاج إلى اتصال.
    </div>
  );
}

function BadgeToast() {
  const [items, setItems] = useState<{ name: string; icon: string }[]>([]);
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as { name: string; icon: string }[];
      setItems((x) => [...x, ...d]);
      setTimeout(() => setItems((x) => x.slice(d.length)), 4500);
    };
    window.addEventListener("m10-badge", h);
    return () => window.removeEventListener("m10-badge", h);
  }, []);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((b, i) => (
        <div key={i} className="anim-pop card flex items-center gap-3 px-4 py-3">
          <span className="text-2xl">{b.icon}</span>
          <div><div className="text-xs muted">شارة جديدة!</div><div className="font-bold">{b.name}</div></div>
        </div>
      ))}
    </div>
  );
}

function XpPill() {
  const { p, ready } = useProgress();
  if (!ready) return null;
  const lv = levelOf(p.xp);
  return (
    <Link href="/progress" className="hidden items-center gap-2 rounded-full border line px-3 py-1 text-sm sm:flex" title="نقاط الخبرة (محفوظة على هذا الجهاز)">
      <span className="font-bold text-brand-600">⚡ <Num>{p.xp}</Num></span>
      <span className="muted">المستوى <Num>{lv.level}</Num></span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const [drawer, setDrawer] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettingsState({ ...DEFAULT_SETTINGS, ...readLS<Partial<Settings>>("settings", {}) });
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const openTutor = () => setTutorOpen(true);
    window.addEventListener("m10-open-tutor", openTutor);
    return () => window.removeEventListener("m10-open-tutor", openTutor);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const dark = settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "dark" : "light";
    root.classList.toggle("dark", dark);
    root.style.setProperty("--font-scale", String(settings.fontScale));
  }, [settings]);

  useEffect(() => setDrawer(false), [path]);

  // تحويل جميع الأرقام الظاهرة إلى أرقام عربية شرقية (٠١٢٣…) في كل الصفحات، دون المساس بحقول الإدخال
  useEffect(() => {
    if (settings.digits !== "eastern") return;
    const SKIP = "input, textarea, script, style, code, pre, [data-keep-digits]";
    const MAP = "٠١٢٣٤٥٦٧٨٩";
    const fix = (t: Text) => {
      const v = t.nodeValue;
      if (!v || !/[0-9]/.test(v)) return;
      const el = t.parentElement;
      if (!el || el.closest(SKIP)) return;
      const nv = v.replace(/[0-9]/g, (d) => MAP[Number(d)]);
      if (nv !== v) t.nodeValue = nv;
    };
    const walk = (n: Node) => {
      if (n.nodeType === Node.TEXT_NODE) return fix(n as Text);
      const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
      for (let c = w.nextNode(); c; c = w.nextNode()) fix(c as Text);
    };
    walk(document.body);
    const obs = new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "characterData") fix(m.target as Text);
        else m.addedNodes.forEach(walk);
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => obs.disconnect();
  }, [settings.digits]);

  const setSettings = (s: Partial<Settings>) => {
    setSettingsState((cur) => {
      const n = { ...cur, ...s };
      writeLS("settings", n);
      return n;
    });
  };

  const isBoard = path.startsWith("/whiteboard");
  const tutorOn = useTutorAvailable();
  const navItems = NAV_VISIBLE.filter((n) => tutorOn || n.href !== "/tutor");

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:right-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-white focus:p-2">تخطَّ إلى المحتوى</a>
      <div className="min-h-screen lg:grid lg:grid-cols-[270px_1fr]">
        {/* الشريط الجانبي للشاشات الكبيرة */}
        <aside className="no-print sticky top-0 hidden h-screen flex-col gap-1 overflow-y-auto border-l line surface px-3 py-4 lg:flex">
          <div className="mb-4 px-2"><Logo /></div>
          <nav aria-label="القائمة الرئيسية" className="flex flex-col gap-0.5">
            {navItems.map((n, i) => (
              <div key={n.href}>
                {i > 0 && navItems[i - 1].group !== n.group && <div className="mx-3 my-2 border-t line" />}
                <Link href={n.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${isActive(path, n.href) ? "bg-brand-50 text-brand-700 dark:bg-brand-900/60 dark:text-white" : "hover:bg-black/5 dark:hover:bg-white/5"}`} aria-current={isActive(path, n.href) ? "page" : undefined}>
                  <Icon name={n.icon} size={20} />
                  {n.label}
                </Link>
              </div>
            ))}
          </nav>
          <div className="mt-auto space-y-1 border-t line px-2 pt-4 text-xs">
            <div className="font-semibold">{BRAND.schoolName}</div>
            <div className="muted">{BRAND.governorate}</div>
            <div className="font-semibold text-brand-700 dark:text-brand-300">إعداد: {BRAND.teacher}</div>
            <div className="muted">يُحفظ تقدمك على هذا الجهاز فقط.</div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="no-print sticky top-0 z-40 flex items-center justify-between gap-3 border-b line bg-[var(--surface)]/90 px-4 py-2 backdrop-blur">
            <div className="lg:hidden"><Logo compact={false} /></div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <XpPill />
              <button className="btn btn-ghost !min-h-[40px] !px-3 text-sm" onClick={() => { setSettings({ digits: settings.digits === "western" ? "eastern" : "western" }); if (settings.digits === "eastern") setTimeout(() => window.location.reload(), 50); }} title="تبديل شكل الأرقام" aria-label="تبديل شكل الأرقام" data-keep-digits>
                {settings.digits === "western" ? "١٢٣" : "123"}
              </button>
              <button className="btn btn-ghost !min-h-[40px] !px-3" onClick={() => setSettings({ theme: settings.theme === "dark" ? "light" : "dark" })} aria-label="الوضع الليلي" title="الوضع الليلي/النهاري">
                {settings.theme === "dark" ? "☀️" : "🌙"}
              </button>
              <button className="btn btn-ghost !min-h-[40px] !px-3 lg:hidden" onClick={() => setDrawer(true)} aria-label="فتح القائمة"><Icon name="menu" /></button>
            </div>
          </header>
          <ConnectionBadge />
          <main id="main" className={`flex-1 ${isBoard ? "" : "mx-auto w-full max-w-6xl px-4 pb-6 pt-5 lg:px-8"}`}>{children}</main>
          {!isBoard && (
            <footer className="mx-auto w-full max-w-6xl px-4 pb-28 pt-2 text-center text-xs muted lg:px-8 lg:pb-8">
              {BRAND.schoolName} – {BRAND.governorate} · إعداد: {BRAND.teacher}
            </footer>
          )}
        </div>
      </div>

      {/* القائمة السفلية للهواتف */}
      <nav aria-label="التنقل السريع" className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t line bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] lg:hidden">
        {BOTTOM_NAV.map((href) => {
          const n = NAV.find((x) => x.href === href)!;
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive(path, href) ? "text-brand-600" : "muted"}`}>
              <Icon name={n.icon} size={22} />
              {n.label.split(" ")[0]}
            </Link>
          );
        })}
        <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold muted">
          <Icon name="menu" size={22} />المزيد
        </button>
      </nav>

      {/* درج القائمة للهواتف */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col gap-1 overflow-y-auto surface p-4 anim-pop">
            <div className="mb-3 flex items-center justify-between"><Logo /><button className="btn btn-ghost !px-3" onClick={() => setDrawer(false)} aria-label="إغلاق"><Icon name="close" /></button></div>
            {navItems.map((n) => (
              <Link key={n.href} href={n.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 font-medium ${isActive(path, n.href) ? "bg-brand-50 text-brand-700 dark:bg-brand-900/60 dark:text-white" : ""}`}>
                <Icon name={n.icon} size={20} />{n.label}
              </Link>
            ))}
            <div className="mt-3 rounded-xl border line p-3 text-sm">
              <div className="mb-2 font-semibold">حجم الخط</div>
              <div className="flex gap-2">
                {[0.9, 1, 1.15, 1.3].map((s) => (
                  <button key={s} className={`btn !min-h-[40px] flex-1 ${settings.fontScale === s ? "btn-primary" : "btn-ghost"}`} onClick={() => setSettings({ fontScale: s })}>{s === 1 ? "عادي" : s < 1 ? "أصغر" : s < 1.2 ? "أكبر" : "كبير جداً"}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* زر المعلم الذكي العائم */}
      {tutorOn && !path.startsWith("/tutor") && (
        <button onClick={() => setTutorOpen(true)} className="no-print fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-3 font-bold text-white shadow-lg lg:bottom-6" aria-label="فتح المعلم الذكي">
          <Icon name="bot" /> <span className="hidden sm:inline">المعلم الذكي</span>
        </button>
      )}
      {tutorOn && tutorOpen && <TutorPanel onClose={() => setTutorOpen(false)} />}
      <BadgeToast />
    </SettingsContext.Provider>
  );
}
