"use client";

import BalloonNav from "@/components/balloon/BalloonNav";
import { ChalkEffect } from "@/components/ChalkEffect";
import AvatarCircle from "@/components/common/AvatarCircle";
import { LeaderboardCrown } from "@/components/common/LeaderboardList";
import { Button } from "@/components/ui/button";
import { QUIZ_CUP_BASE_POINTS, QUIZ_CUP_TACTICS } from "@/constants/quiz-cup";
import { cn } from "@/lib/utils";
import type { QuizCupQuestionResult } from "@/types/quiz-cup";
import { Check, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import QuizCupBackground from "./QuizCupBackground";
import { Board, ChalkFrame, ChalkIcon } from "./QuizCupChalk";

type Props = {
  selfName: string;
  selfAvatarSrc: string;
  selfAvatarBg: string;
  rank: number;
  totalPlayers: number;
  score: number;
  results: QuizCupQuestionResult[];
  onDone?: () => void;
  onLeave?: () => void;
};

function signed(points: number): string {
  return points > 0 ? `+${points}` : points < 0 ? `−${-points}` : "0";
}

function longestStreak(results: QuizCupQuestionResult[]): number {
  let best = 0;
  let run = 0;
  for (const r of results) {
    run = r.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative rounded-2xl bg-white/5 px-3 py-3 text-center">
      <ChalkFrame className="rounded-2xl border-white/50" />
      <p
        className={cn(
          "font-display heading-4 relative leading-tight tabular-nums",
          className,
        )}
      >
        {value}
      </p>
      <p className="caption relative text-neutral-300">{label}</p>
    </div>
  );
}

function tacticImpact(results: QuizCupQuestionResult[]) {
  return QUIZ_CUP_TACTICS.map((tactic) => {
    const used = results.filter((r) => r.tactic === tactic.id);
    let note: string;
    if (tactic.id === "double") {
      const gained = used
        .filter((r) => r.correct)
        .reduce((sum, r) => sum + QUIZ_CUP_BASE_POINTS + r.wager, 0);
      note = `ได้เพิ่ม ${signed(gained)}`;
    } else if (tactic.id === "shield") {
      const saved = used
        .filter((r) => r.correct === false)
        .reduce((sum, r) => sum + r.wager, 0);
      note = `กันไว้ ${saved} แต้ม`;
    } else {
      note = `ตอบถูก ${used.filter((r) => r.correct).length}/${used.length}`;
    }
    return { ...tactic, count: used.length, note };
  });
}

const QuizCupPlayerSummary = ({
  selfName,
  selfAvatarSrc,
  selfAvatarBg,
  rank,
  totalPlayers,
  score,
  results,
  onDone,
  onLeave,
}: Props) => {
  const correctCount = results.filter((r) => r.correct).length;
  const accuracy =
    results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
  const wagerNet = results.reduce((sum, r) => {
    if (r.correct) return sum + r.wager;
    if (r.correct === false && r.tactic !== "shield") return sum - r.wager;
    return sum;
  }, 0);
  const tactics = tacticImpact(results);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-white">
      <QuizCupBackground />
      <div aria-hidden className="absolute inset-0 bg-black/45" />
      <BalloonNav showLabels={false} onLeave={onLeave} />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <div className="relative p-1.5">
            {rank === 1 && (
              <LeaderboardCrown className="absolute -top-6 -left-6 z-10 size-10 -rotate-30 text-[#FCA346]" />
            )}
            <ChalkEffect
              as="span"
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full border-4"
              style={{ borderColor: selfAvatarBg }}
            />
            <AvatarCircle
              src={selfAvatarSrc}
              name={selfName}
              bg={selfAvatarBg}
              sizeClassName="size-24"
            />
          </div>
          <p className="subtitle">{selfName}</p>
          <ChalkEffect
            as="p"
            variant="chalk-soft"
            className="font-display heading-2 leading-none"
          >
            อันดับ {rank}
          </ChalkEffect>
          <p className="body-2 text-neutral-300">จาก {totalPlayers} คน</p>
          <p className="font-display heading-3 text-highlight-yellow tabular-nums">
            {score}
            <span className="body-2 ml-1.5 font-sans text-neutral-300">
              คะแนน
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="ตอบถูก"
            value={`${correctCount}/${results.length}`}
            className="text-highlight-green"
          />
          <Stat label="ความแม่นยำ" value={`${accuracy}%`} />
          <Stat
            label="ถูกติดกันสูงสุด"
            value={`${longestStreak(results)} ข้อ`}
          />
          <Stat
            label="ได้จากเดิมพัน"
            value={signed(wagerNet)}
            className={
              wagerNet > 0
                ? "text-highlight-yellow"
                : wagerNet < 0
                  ? "text-primary-300"
                  : undefined
            }
          />
        </div>

        <Board className="bg-black/65 p-3 sm:p-4">
          <p className="font-display subtitle mb-3 px-1">ผลรายข้อ</p>
          <ol className="grid grid-cols-10 gap-1.5">
            {results.map((r, index) => {
              const Icon = r.correct == null ? Minus : r.correct ? Check : X;
              return (
                <li
                  key={index}
                  title={`ข้อ ${index + 1}`}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-full",
                    r.correct == null
                      ? "bg-white/10 text-neutral-400"
                      : r.correct
                        ? "bg-highlight-green/25 text-highlight-green"
                        : "bg-primary/25 text-primary-300",
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={3} />
                  {r.tactic && (
                    <span className="bg-highlight-yellow absolute -top-0.5 -right-0.5 size-2 rounded-full" />
                  )}
                </li>
              );
            })}
          </ol>
          <p className="caption mt-3 flex items-center gap-1.5 px-1 text-neutral-300">
            <span className="bg-highlight-yellow size-2 rounded-full" />
            ข้อที่ใช้ Tactic
          </p>
        </Board>

        <Board className="bg-black/65 p-3 sm:p-4">
          <p className="font-display subtitle mb-1 px-1">Tactic ที่ใช้</p>
          <ul className="divide-y divide-dashed divide-white/20">
            {tactics.map((t) => (
              <li
                key={t.id}
                className={cn(
                  "flex items-center gap-3 px-1 py-2.5",
                  t.count === 0 && "opacity-40",
                )}
              >
                <ChalkIcon icon={t.icon} className="size-5" />
                <span className="body-2 flex-1 font-semibold">
                  {t.label}
                  <span className="ml-1.5 font-normal text-neutral-300">
                    ×{t.count}
                  </span>
                </span>
                <span className="caption text-neutral-300">
                  {t.count > 0 ? t.note : "ไม่ได้ใช้"}
                </span>
              </li>
            ))}
          </ul>
        </Board>

        {onDone && (
          <Button size="lg" className="mt-auto w-full" onClick={onDone}>
            ดูอันดับทั้งหมด
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizCupPlayerSummary;
