import QuizCupGame from "@/components/quiz-cup/QuizCupGame";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Player" };

/** The phone: enter name, wait, answer, results, summary. There's no host, so results auto-advance. */
export default function PlayerPage() {
  return <QuizCupGame role="player" />;
}
