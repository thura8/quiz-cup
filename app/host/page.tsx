import QuizCupGame from "@/components/quiz-cup/QuizCupGame";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Host" };

export default function HostPage() {
  return <QuizCupGame role="host" />;
}
