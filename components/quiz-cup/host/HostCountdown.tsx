"use client";

import { QUIZ_CUP_CATEGORIES, QUIZ_CUP_DIFFICULTIES } from "@/constants/quiz-cup";
import { cn } from "@/lib/utils";
import type { QuizCupHostQuestion } from "@/types/quiz-cup";
import { useEffect, useState } from "react";
import { DifficultyBars } from "../QuizCupChalk";

const TICK_MS = 100;

type Props = {
  startsAt: string;
  durationSeconds: number;
  question: QuizCupHostQuestion;
  firstRound: boolean;
};

const HostCountdown = ({ startsAt, durationSeconds, question, firstRound }: Props) => {
  const [remainingMs, setRemainingMs] = useState(durationSeconds * 1000);

  useEffect(() => {
    const end = new Date(startsAt).getTime();
    const timer = setInterval(() => setRemainingMs(Math.max(0, end - Date.now())), TICK_MS);
    return () => clearInterval(timer);
  }, [startsAt]);

  const count = Math.ceil(remainingMs / 1000);
  const category = QUIZ_CUP_CATEGORIES.find((c) => c.id === question.category);
  const difficulty = QUIZ_CUP_DIFFICULTIES.find((d) => d.id === question.difficulty);

  const Icon = category?.icon;

  return (
    <div className="animate-in fade-in absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_at_center,rgb(20,10,60,0.35)_0%,rgb(7,4,26,0.8)_75%)] text-white duration-500">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="studio-title text-5xl">
          {firstRound ? "เกมกำลังจะเริ่ม!" : `ข้อที่ ${question.round} จาก ${question.totalRounds}`}
        </p>
        <div className="flex items-center gap-3">
          {category && Icon && (
            <span className="studio-chip body-1 px-4 py-1.5">
              <Icon className="size-5 text-[#ffbf47]" />
              {category.label}
            </span>
          )}
          {difficulty && (
            <span className="studio-chip body-1 px-4 py-1.5">
              <DifficultyBars filled={difficulty.bars} />
              {difficulty.label}
            </span>
          )}
        </div>
      </div>

      <p
        key={count}
        className={cn(
          "studio-title animate-countdown-pop leading-none",
          count === 0 ? "text-[150px]" : "text-[240px]",
        )}
      >
        {count === 0 ? "เริ่ม!" : count}
      </p>
    </div>
  );
};

export default HostCountdown;
