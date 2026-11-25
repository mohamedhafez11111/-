import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LESSONS, LESSON_BY_ID, lc } from "@/content";
import { LessonView } from "@/components/lesson/LessonView";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ lessonId: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  const l = LESSON_BY_ID[lessonId];
  return { title: l ? `${lc(l.id)} ${l.title}` : "درس" };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = LESSON_BY_ID[lessonId];
  if (!lesson) notFound();
  return <LessonView lesson={lesson} />;
}
