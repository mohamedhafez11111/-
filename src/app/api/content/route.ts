import { getKey } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** المحتوى العام الذي يضيفه المعلم: الإعلانات، الأسئلة الإضافية، الاختبارات، ملاحظات الدروس */
export async function GET() {
  const [announcements, questions, hiddenQuestions, exams, lessonNotes, hiddenGames] = await Promise.all([
    getKey("announcements"), getKey("questions"), getKey("hiddenQuestions"), getKey("exams"), getKey("lessonNotes"), getKey("hiddenGames"),
  ]);
  return Response.json(
    {
      announcements: announcements.filter((a) => a.active),
      questions,
      hiddenQuestions,
      exams: exams.filter((e) => e.active),
      lessonNotes,
      hiddenGames,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
