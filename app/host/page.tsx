import QuizCupGame from "@/components/quiz-cup/QuizCupGame";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Host" };

/** The big screen: lobby + QR, settings, 3D arena, podium. Bots join and play. */
export default function HostPage() {
  return <QuizCupGame role="host" />;
}
