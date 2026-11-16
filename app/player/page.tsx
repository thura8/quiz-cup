import QuizCupGame from "@/components/quiz-cup/QuizCupGame";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Player" };

export default function PlayerPage() {
  return <QuizCupGame role="player" />;
}
