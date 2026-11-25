import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GAME_META, GAME_IDS } from "@/components/games/meta";
import { GamePlayer } from "@/components/games/Games";
import type { GameId } from "@/content/types";

export function generateStaticParams() {
  return GAME_IDS.map((gameId) => ({ gameId }));
}
export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const { gameId } = await params;
  return { title: GAME_META[gameId as GameId]?.title ?? "لعبة" };
}
export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (!GAME_META[gameId as GameId]) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Link href="/games" className="text-sm font-semibold text-brand-600">→ كل الألعاب</Link>
      <GamePlayer id={gameId as GameId} />
    </div>
  );
}
