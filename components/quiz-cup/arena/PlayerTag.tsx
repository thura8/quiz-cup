"use client";

import { cn } from "@/lib/utils";
import type { QuizCupArenaPlayer } from "@/types/quiz-cup";
import { Check, X } from "lucide-react";
import { StudioLetter } from "../host/HostQuestionBoard";

export default function PlayerTag({ player }: { player: QuizCupArenaPlayer }) {
  const { status, choice } = player;

  if (status === "answered") {
    return (
      <span className="studio-pill font-studio animate-in fade-in zoom-in-50 flex items-center gap-1 px-3 py-1 text-base font-semibold whitespace-nowrap text-[#ffd36b]">
        <Check className="size-4" strokeWidth={3} />
        ตอบแล้ว
      </span>
    );
  }
  if (status === "missed") {
    return (
      <span className="font-studio animate-in fade-in rounded-full bg-[#140a3c]/90 px-3 py-1 text-base whitespace-nowrap text-[#b9a8e0] shadow-[0_0_0_2px_rgb(143,92,255,0.5)]">
        ไม่ตอบ
      </span>
    );
  }
  if ((status === "correct" || status === "wrong") && choice != null) {
    const correct = status === "correct";
    const Verdict = correct ? Check : X;
    return (
      <span
        className={cn(
          "animate-in fade-in zoom-in-50 flex items-center gap-2 rounded-full bg-[#140a3c]/95 py-1 pr-3 pl-1 duration-300",
          correct
            ? "shadow-[0_0_0_3px_#2ff07a,0_0_18px_4px_rgb(47,240,122,0.5)]"
            : "shadow-[0_0_0_3px_#ff3b4f,0_0_18px_4px_rgb(255,59,79,0.45)]",
        )}
      >
        <StudioLetter index={choice} className="size-9 text-lg" />
        <Verdict className={cn("size-6", correct ? "text-[#2ff07a]" : "text-[#ff5a6b]")} strokeWidth={3} />
      </span>
    );
  }
  return null;
}
