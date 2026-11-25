"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export default function AdminLogin() {
  const [role, setRole] = useState<"admin" | "teacher">("admin");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState<{ secret: boolean; admin: boolean; teacher: boolean } | null>(null);
  useEffect(() => { fetch("/api/admin/login").then((r) => r.json()).then(setCfg).catch(() => setCfg(null)); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, password }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? "تعذّر الدخول");
      else window.location.assign("/admin");
    } catch { setErr("تعذّر الاتصال بالخادم."); }
    finally { setBusy(false); }
  };

  const notReady = cfg && (!cfg.secret || (!cfg.admin && !cfg.teacher));
  return (
    <div className="mx-auto max-w-md pt-8">
      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white"><Icon name="admin" size={26} /></span><div><h1 className="text-xl font-bold">دخول لوحة المعلم</h1><p className="text-sm muted">للمدير والمعلم فقط. الطلاب لا يحتاجون إلى تسجيل.</p></div></div>
        {notReady && <div className="rounded-xl bg-warn-50 p-3 text-sm text-warn-700">لوحة الإدارة غير مهيأة بعد على هذا الخادم: يجب ضبط متغيرات البيئة SESSION_SECRET و ADMIN_PASSWORD (راجع ملف README).</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-1">
            <button type="button" className={`chip justify-center !py-2 ${role === "admin" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setRole("admin")}>المدير</button>
            <button type="button" className={`chip justify-center !py-2 ${role === "teacher" ? "bg-brand-600 text-white" : "bg-black/5"}`} onClick={() => setRole("teacher")} disabled={cfg ? !cfg.teacher : false}>المعلم</button>
          </div>
          <label className="block"><span className="mb-1 block text-sm font-semibold">كلمة المرور</span><input type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {err && <p className="text-sm text-bad-700" role="alert">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !password}>{busy ? "جارٍ التحقق…" : "دخول"}</button>
        </form>
      </div>
    </div>
  );
}
