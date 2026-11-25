import Link from "next/link";

export const metadata = { title: "غير متصل" };

export default function Offline() {
  return (
    <div className="mx-auto max-w-lg pt-10 text-center">
      <div className="card space-y-3 p-8">
        <div className="text-5xl">📡</div>
        <h1 className="text-xl font-bold">أنت غير متصل بالإنترنت</h1>
        <p className="muted">هذه الصفحة لم تُحفظ بعد على جهازك. الصفحات التي فتحتها سابقاً، والدروس الأساسية، والأدوات، والاختبارات تعمل دون اتصال. المعلم الذكي يحتاج إلى اتصال.</p>
        <Link href="/" className="btn btn-primary">الصفحة الرئيسية</Link>
      </div>
    </div>
  );
}
