import type { Metadata } from "next";
import { TutorChat } from "@/components/tutor/TutorPanel";

export const metadata: Metadata = { title: "المعلم الذكي" };

export default function TutorPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">المعلم الذكي</h1>
      <p className="mb-4 muted">مساعد تعليمي مخصص لرياضيات الصف العاشر (الفصل الأول): يشرح، ويلمّح، ويختبرك، ويحلل خطوات حلك. يحتاج إلى اتصال بالإنترنت.</p>
      <div className="h-[75vh]"><TutorChat fullPage /></div>
    </div>
  );
}
