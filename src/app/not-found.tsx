import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg pt-10 text-center">
      <div className="card space-y-3 p-8">
        <div className="text-5xl">🔍</div>
        <h1 className="text-xl font-bold">الصفحة غير موجودة</h1>
        <p className="muted">ربما تغيّر الرابط. يمكنك العودة إلى خريطة المنهج.</p>
        <div className="flex justify-center gap-2"><Link href="/" className="btn btn-primary">الرئيسية</Link><Link href="/curriculum" className="btn btn-ghost">خريطة المنهج</Link></div>
      </div>
    </div>
  );
}
