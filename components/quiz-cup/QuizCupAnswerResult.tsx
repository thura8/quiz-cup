"use client";

import BalloonNav from "@/components/balloon/BalloonNav";
import { ChalkEffect } from "@/components/ChalkEffect";
import { QUIZ_CUP_TACTICS, quizCupBreakdown } from "@/constants/quiz-cup";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Check, Clock, X } from "lucide-react";
import type { QuizCupAnswer } from "./QuizCupAnswering";
import QuizCupBackground from "./QuizCupBackground";
import { Board, ChalkFrame, ChoiceBadge } from "./QuizCupChalk";
import QuizCupPlayerBar from "./QuizCupPlayerBar";

type Props = {
  round: number;
  totalRounds: number;
  question: string;
  choices: string[];
  /** null when the host turned "เฉลยคำตอบ" off: only right/wrong is shown. */
  correctChoice: number | null;
  /** The server's verdict; needed when correctChoice is hidden. */
  correct?: boolean | null;
  /** Points from answering fast, shown as its own line. */
  speedBonus?: number;
  /** What no answer scored on the server (0 if the player had dropped out). */
  missedPoints?: number;
  /** What this player locked in; null if time ran out first. */
  answer: QuizCupAnswer | null;
  selfName: string;
  selfAvatarSrc: string;
  selfAvatarBg: string;
  /** Total score after this question. */
  score: number;
  rank?: number | null;
  previousRank?: number | null;
  onLeave?: () => void;
};

const VERDICTS = {
  right: {
    title: "ถูกต้อง!",
    icon: Check,
    tone: "text-highlight-green border-highlight-green",
  },
  wrong: { title: "ตอบผิด", icon: X, tone: "text-primary border-primary" },
  missed: {
    title: "คุณไม่ได้ตอบ",
    icon: Clock,
    tone: "text-neutral-300 border-neutral-300",
  },
};

function signed(points: number): string {
  return points > 0 ? `+${points}` : points < 0 ? `−${-points}` : "0";
}

function ChoiceRow({
  index,
  text,
  tag,
  tone,
}: {
  index: number;
  text: string;
  tag: string;
  tone: "right" | "wrong";
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2",
        tone === "right" ? "bg-highlight-green/15" : "bg-primary/15",
      )}
    >
      <ChalkFrame
        className={cn(
          "rounded-2xl border-3",
          tone === "right" ? "border-highlight-green" : "border-primary",
        )}
      />
      <ChoiceBadge index={index} />
      <span
        className={cn(
          "body-1 relative flex-1 font-semibold",
          tone === "wrong" && "line-through decoration-2",
        )}
      >
        {text}
      </span>
      <span
        className={cn(
          "caption relative rounded-full px-2.5 py-0.5 font-semibold",
          tone === "right"
            ? "bg-highlight-green text-black"
            : "bg-primary text-white",
        )}
      >
        {tag}
      </span>
    </div>
  );
}

const QuizCupAnswerResult = ({
  round,
  totalRounds,
  question,
  choices,
  correctChoice,
  correct: verdictFromServer,
  speedBonus = 0,
  missedPoints,
  answer,
  selfName,
  selfAvatarSrc,
  selfAvatarBg,
  score,
  rank,
  previousRank,
  onLeave,
}: Props) => {
  const correct =
    verdictFromServer !== undefined
      ? verdictFromServer
      : answer && correctChoice != null
        ? answer.choice === correctChoice
        : null;
  const verdict =
    correct == null
      ? VERDICTS.missed
      : correct
        ? VERDICTS.right
        : VERDICTS.wrong;
  const lines = [
    ...quizCupBreakdown({
      correct,
      wager: answer?.wager ?? 0,
      tactic: answer?.tactic ?? null,
      missedPoints,
    }),
    ...(speedBonus > 0 ? [{ label: "ตอบเร็ว", points: speedBonus }] : []),
  ];
  const delta = lines.reduce((sum, line) => sum + line.points, 0);
  const deltaTone =
    delta > 0
      ? "text-highlight-yellow"
      : delta < 0
        ? "text-primary-300"
        : "text-neutral-300";
  const tacticInfo = QUIZ_CUP_TACTICS.find((t) => t.id === answer?.tactic);
  const rankMove =
    rank != null && previousRank != null ? previousRank - rank : 0;

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-white">
      <QuizCupBackground />
      <div aria-hidden className="absolute inset-0 bg-black/45" />
      <BalloonNav showLabels={false} onLeave={onLeave} />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
        <QuizCupPlayerBar
          name={selfName}
          avatarSrc={selfAvatarSrc}
          avatarBg={selfAvatarBg}
          round={round}
          totalRounds={totalRounds}
          rank={rank}
          score={score}
        />

        <div className="flex flex-col items-center gap-1 py-2 text-center">
          <span
            className={cn(
              "relative flex size-16 items-center justify-center",
              verdict.tone,
            )}
          >
            <ChalkEffect
              as="span"
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full border-4",
                verdict.tone,
              )}
            />
            <verdict.icon className="relative size-8" strokeWidth={3} />
          </span>
          <ChalkEffect
            as="p"
            variant="chalk-soft"
            className={cn("font-display heading-3", verdict.tone)}
          >
            {verdict.title}
          </ChalkEffect>
          <p
            className={cn(
              "font-display heading-2 animate-in zoom-in-50 fade-in leading-none tabular-nums duration-500",
              deltaTone,
            )}
          >
            {signed(delta)}
          </p>
        </div>

        <Board className="bg-black/65 p-3 sm:p-4">
          <p className="body-2 mb-3 px-1 text-neutral-300">{question}</p>
          <div className="flex flex-col gap-2">
            {correctChoice != null && (
              <ChoiceRow
                index={correctChoice}
                text={choices[correctChoice]}
                tag="เฉลย"
                tone="right"
              />
            )}
            {answer && correctChoice == null && (
              <ChoiceRow
                index={answer.choice}
                text={choices[answer.choice]}
                tag="คุณตอบ"
                tone={correct ? "right" : "wrong"}
              />
            )}
            {answer && correctChoice != null && !correct && (
              <ChoiceRow
                index={answer.choice}
                text={choices[answer.choice]}
                tag="คุณตอบ"
                tone="wrong"
              />
            )}
          </div>
        </Board>

        <Board className="bg-black/65 p-3 sm:p-4">
          <dl className="divide-y divide-dashed divide-white/20 px-1">
            {lines.map((line) => (
              <div
                key={line.label}
                className="flex items-center justify-between py-2"
              >
                <dt className="body-2 text-neutral-300">{line.label}</dt>
                <dd className="body-1 font-semibold tabular-nums">
                  {signed(line.points)}
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3">
              <dt className="font-display subtitle">รวมข้อนี้</dt>
              <dd
                className={cn("font-display heading-5 tabular-nums", deltaTone)}
              >
                {signed(delta)}
              </dd>
            </div>
          </dl>
          {tacticInfo && (
            <p className="caption mt-2 inline-flex items-center gap-1.5 px-1 text-neutral-300">
              <tacticInfo.icon className="size-3.5" />
              ใช้{tacticInfo.label}ในข้อนี้
            </p>
          )}
        </Board>

        <div className="mt-auto flex flex-col items-center gap-2 pt-2">
          {rank != null && (
            <p className="body-1 inline-flex items-center gap-2 font-semibold">
              ตอนนี้อันดับ {rank}
              {rankMove !== 0 && (
                <span
                  className={cn(
                    "caption inline-flex items-center gap-0.5 rounded-full px-2 py-0.5",
                    rankMove > 0
                      ? "bg-highlight-green/20 text-highlight-green"
                      : "bg-primary/20 text-primary-300",
                  )}
                >
                  {rankMove > 0 ? (
                    <ArrowUp className="size-3.5" />
                  ) : (
                    <ArrowDown className="size-3.5" />
                  )}
                  {Math.abs(rankMove)}
                </span>
              )}
            </p>
          )}
          <p className="caption animate-pulse text-neutral-300">
            {round < totalRounds ? "รอข้อต่อไป..." : "รอสรุปผล..."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizCupAnswerResult;
