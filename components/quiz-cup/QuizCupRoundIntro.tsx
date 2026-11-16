"use client";

import BalloonNav from "@/components/balloon/BalloonNav";
import { ChalkEffect } from "@/components/ChalkEffect";
import {
  QUIZ_CUP_CATEGORIES,
  QUIZ_CUP_DIFFICULTIES,
} from "@/constants/quiz-cup";
import { useCountdownSound } from "@/hooks/shared/useSound";
import { cn } from "@/lib/utils";
import type { QuizCupCategoryId, QuizCupDifficultyId } from "@/types/quiz-cup";
import { useEffect, useState } from "react";
import QuizCupBackground from "./QuizCupBackground";
import { Board, ChalkIcon, DifficultyBars } from "./QuizCupChalk";
import QuizCupPlayerBar from "./QuizCupPlayerBar";

type Props = {
  round: number;
  totalRounds: number;
  category: QuizCupCategoryId;
  difficulty: QuizCupDifficultyId;
  /** When the question appears; the ring drains until then. */
  startsAt: string;
  /** Length of the countdown, for the ring. */
  durationSeconds?: number;
  selfName: string;
  selfAvatarSrc: string;
  selfAvatarBg: string;
  score: number;
  rank?: number | null;
  energy: number;
  onLeave?: () => void;
};

const TICK_MS = 100;
const RING_RADIUS = 88;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function msLeft(endsAt: string): number {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

const QuizCupRoundIntro = ({
  round,
  totalRounds,
  category,
  difficulty,
  startsAt,
  durationSeconds = 3,
  selfName,
  selfAvatarSrc,
  selfAvatarBg,
  score,
  rank,
  energy,
  onLeave,
}: Props) => {
  const totalMs = durationSeconds * 1000;
  // Start full so server and client render the same frame; the first tick
  // syncs to the real clock.
  const [remainingMs, setRemainingMs] = useState(totalMs);

  useEffect(() => {
    const timer = setInterval(() => setRemainingMs(msLeft(startsAt)), TICK_MS);
    return () => clearInterval(timer);
  }, [startsAt]);

  useCountdownSound({ endsAt: startsAt, tickFrom: 3, timeUpSrc: null });

  const count = Math.ceil(remainingMs / 1000);
  const progress = Math.min(1, remainingMs / totalMs);
  const categoryInfo = QUIZ_CUP_CATEGORIES.find((c) => c.id === category);
  const difficultyInfo = QUIZ_CUP_DIFFICULTIES.find((d) => d.id === difficulty);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-white">
      <QuizCupBackground />
      <BalloonNav showLabels={false} onLeave={onLeave} />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8">
        <QuizCupPlayerBar
          name={selfName}
          avatarSrc={selfAvatarSrc}
          avatarBg={selfAvatarBg}
          round={round}
          totalRounds={totalRounds}
          rank={rank}
          score={score}
        />

        <Board className="text-center">
          <p className="body-2 text-highlight-yellow">
            ข้อที่ {round} จาก {totalRounds}
          </p>
          {categoryInfo && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <ChalkIcon icon={categoryInfo.icon} className="size-14" />
              <p className="font-display heading-3">{categoryInfo.label}</p>
            </div>
          )}
          {difficultyInfo && (
            <p className="body-2 mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1">
              <DifficultyBars filled={difficultyInfo.bars} />
              ความยาก: {difficultyInfo.label}
            </p>
          )}
          <p className="body-2 mt-4 text-neutral-300">
            เตรียมตัวให้พร้อม คำถามกำลังมา
          </p>
        </Board>

        <div className="flex flex-1 items-center justify-center">
          <div className="relative flex size-56 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
            <ChalkEffect as="div" aria-hidden className="absolute inset-0">
              <svg viewBox="0 0 200 200" className="size-full -rotate-90">
                <circle
                  cx="100"
                  cy="100"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="6"
                  className="stroke-white/25"
                />
                <circle
                  cx="100"
                  cy="100"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                  className="stroke-primary transition-[stroke-dashoffset] duration-100 ease-linear"
                />
              </svg>
            </ChalkEffect>
            <ChalkEffect
              key={count}
              as="p"
              variant="chalk-soft"
              className={cn(
                "font-display animate-countdown-pop text-[120px] leading-none",
                count === 0 && "text-highlight-yellow text-6xl",
              )}
            >
              {count === 0 ? "เริ่ม!" : count}
            </ChalkEffect>
          </div>
        </div>

        <p className="body-2 text-center text-neutral-300">
          Energy เหลือ{" "}
          <span className="text-highlight-yellow font-semibold">{energy}</span>{" "}
          ไว้ใช้ Tactic
        </p>
      </div>
    </div>
  );
};

export default QuizCupRoundIntro;
