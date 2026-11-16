"use client";

import BalloonNav from "@/components/balloon/BalloonNav";
import { ChalkEffect } from "@/components/ChalkEffect";
import AppDrawer from "@/components/common/AppDrawer";
import { Button } from "@/components/ui/button";
import {
  QUIZ_CUP_TACTICS,
  QUIZ_CUP_WAGERS,
  quizCupOutcome,
  quizCupWagerLabel,
} from "@/constants/quiz-cup";
import { useCountdownSound } from "@/hooks/shared/useSound";
import { cn } from "@/lib/utils";
import type { QuizCupTacticId } from "@/types/quiz-cup";
import { Check, ChevronRight, Lock, Timer, X, Zap } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import QuizCupBackground from "./QuizCupBackground";
import {
  Board,
  CHOICE_COLORS,
  CHOICE_LETTERS,
  ChalkFrame,
  ChalkIcon,
  ChoiceBadge,
} from "./QuizCupChalk";
import QuizCupPlayerBar from "./QuizCupPlayerBar";

export type QuizCupAnswer = {
  choice: number;
  wager: number;
  tactic: QuizCupTacticId | null;
};

type Props = {
  round: number;
  totalRounds: number;
  question: string;
  choices: string[];
  roundEndsAt: string;
  durationSeconds: number;
  selfName: string;
  selfAvatarSrc: string;
  selfAvatarBg: string;
  score: number;
  rank?: number | null;
  /** Energy the player started the game with. */
  maxEnergy: number;
  /** Energy left before this question; the tactic picked here spends it on confirm. */
  energy: number;
  /** Choices removed by "ตัดตัวเลือก"; non-empty once the server has applied it. */
  hiddenChoices?: number[];
  /** "ตัดตัวเลือก" reveals right away, so it is requested before confirming. */
  onUseFifty?: () => void;
  /** The locked-in answer, once the server has it. */
  submitted?: QuizCupAnswer | null;
  submitting?: boolean;
  onSubmit?: (answer: QuizCupAnswer) => void;
  onLeave?: () => void;
};

const TICK_MS = 250;
const HURRY_SECONDS = 5;

function msLeft(endsAt: string): number {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

function SectionLabel({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <p className="font-display subtitle">{title}</p>
      {aside}
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <dt className="body-2 w-20 shrink-0 text-neutral-300">{label}</dt>
      <dd className="body-1 font-semibold">{children}</dd>
    </div>
  );
}

const QuizCupAnswering = ({
  round,
  totalRounds,
  question,
  choices,
  roundEndsAt,
  durationSeconds,
  selfName,
  selfAvatarSrc,
  selfAvatarBg,
  score,
  rank,
  maxEnergy,
  energy,
  hiddenChoices = [],
  onUseFifty,
  submitted = null,
  submitting = false,
  onSubmit,
  onLeave,
}: Props) => {
  // Start from the full duration so server and client render the same frame;
  // the first tick syncs to the real clock.
  const [remainingMs, setRemainingMs] = useState(durationSeconds * 1000);
  const [pendingChoice, setPendingChoice] = useState<number | null>(null);
  const [pendingWager, setPendingWager] = useState<number>(QUIZ_CUP_WAGERS[0]);
  const [pendingTactic, setPendingTactic] = useState<QuizCupTacticId | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(
      () => setRemainingMs(msLeft(roundEndsAt)),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, [roundEndsAt]);

  // Once two choices are gone the player has seen them, so Fifty can't be undone.
  const fiftyUsed = pendingTactic === "fifty" || hiddenChoices.length > 0;
  const tactic = fiftyUsed ? "fifty" : pendingTactic;
  const choice =
    submitted?.choice ??
    (pendingChoice != null && !hiddenChoices.includes(pendingChoice)
      ? pendingChoice
      : null);
  const wager = submitted?.wager ?? pendingWager;
  const usedTactic = submitted ? submitted.tactic : tactic;
  const outcome = quizCupOutcome({ wager, tactic: usedTactic });

  const timeUp = remainingMs <= 0;
  const locked = submitted != null || submitting || timeUp;
  const seconds = Math.ceil(remainingMs / 1000);
  const hurry = !locked && seconds <= HURRY_SECONDS;
  const progressPct = Math.min(
    100,
    (remainingMs / (durationSeconds * 1000)) * 100,
  );
  const usedTacticInfo = QUIZ_CUP_TACTICS.find((t) => t.id === usedTactic);
  const pendingCost = submitted ? 0 : (usedTacticInfo?.cost ?? 0);

  function submit() {
    if (choice == null || locked) return;
    setConfirmOpen(false);
    onSubmit?.({ choice, wager, tactic });
  }

  // A picked-but-unconfirmed answer still counts when time runs out.
  useEffect(() => {
    if (!timeUp) return;
    if (!submitted && !submitting && choice != null) {
      onSubmit?.({ choice, wager, tactic });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  function pickTactic(id: QuizCupTacticId) {
    if (locked || fiftyUsed) return;
    if (id === "fifty") {
      setPendingTactic("fifty");
      onUseFifty?.();
      return;
    }
    setPendingTactic((current) => (current === id ? null : id));
  }

  useCountdownSound({ endsAt: roundEndsAt, enabled: !submitted });

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-white">
      <QuizCupBackground />
      <div aria-hidden className="absolute inset-0 bg-black/45" />
      <BalloonNav showLabels={false} onLeave={onLeave} />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3">
          <QuizCupPlayerBar
            name={selfName}
            avatarSrc={selfAvatarSrc}
            avatarBg={selfAvatarBg}
            round={round}
            totalRounds={totalRounds}
            rank={rank}
            score={score}
          />

          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/15">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-200 ease-linear",
                  hurry ? "bg-primary" : "bg-highlight-yellow",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p
              className={cn(
                "body-2 flex min-w-16 items-center justify-end gap-1 font-semibold whitespace-nowrap tabular-nums",
                hurry && "text-primary-300 animate-pulse",
              )}
            >
              <Timer className="size-4" />
              {seconds} วิ
            </p>
          </div>

          <Board className="bg-black/65 py-5 sm:py-5">
            <ChalkEffect
              as="p"
              variant="chalk-soft"
              className="font-display heading-4 block"
            >
              {question}
            </ChalkEffect>
          </Board>

          <div className="flex flex-col gap-2">
            {choices.map((text, index) => {
              const hidden = hiddenChoices.includes(index);
              const selected = choice === index;
              return (
                <button
                  key={index}
                  type="button"
                  disabled={locked || hidden}
                  aria-pressed={selected}
                  onClick={() => setPendingChoice(index)}
                  className={cn(
                    "relative flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 text-left transition-[background-color,opacity,transform]",
                    selected ? "bg-primary/30" : "bg-black/65",
                    !locked && !hidden && "cursor-pointer active:scale-[0.98]",
                    !locked && !hidden && !selected && "hover:bg-black/50",
                    hidden && "opacity-30",
                    locked && !selected && !hidden && "opacity-50",
                  )}
                >
                  <ChalkFrame
                    active={selected}
                    className={cn(
                      "rounded-2xl",
                      !selected && "border-white/80",
                    )}
                  />
                  <ChoiceBadge index={index} />
                  <span
                    className={cn(
                      "body-1 relative flex-1 font-semibold",
                      hidden && "line-through",
                    )}
                  >
                    {text}
                  </span>
                  {selected && (
                    <Check
                      className="text-primary relative size-6 shrink-0"
                      strokeWidth={3}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {!submitted && (
            <>
              <Board className="bg-black/65 p-3 sm:p-3">
                <SectionLabel
                  title="เดิมพัน"
                  aside={
                    <p className="caption">
                      <span className="text-green-300">
                        ถูก +{outcome.ifRight}
                      </span>
                      <span className="mx-1.5 text-neutral-500">/</span>
                      <span className="text-primary-300">
                        ผิด −{outcome.ifWrong}
                      </span>
                    </p>
                  }
                />
                <div className="grid grid-cols-3 gap-2">
                  {QUIZ_CUP_WAGERS.map((value) => {
                    const active = wager === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={locked}
                        aria-pressed={active}
                        onClick={() => setPendingWager(value)}
                        className={cn(
                          "relative h-11 rounded-2xl transition-[background-color,transform]",
                          active
                            ? "bg-highlight-yellow font-semibold text-black"
                            : "bg-white/5",
                          !locked && "cursor-pointer active:scale-95",
                          !locked && !active && "hover:bg-white/10",
                        )}
                      >
                        {!active && (
                          <ChalkFrame className="rounded-2xl border-white/70" />
                        )}
                        <span className="body-1 relative">
                          {value === 0 ? "ไม่เดิมพัน" : value}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Board>

              <Board className="bg-black/65 p-3 sm:p-3">
                <SectionLabel
                  title="Tactic"
                  aside={
                    <div
                      className="flex items-center gap-1.5"
                      aria-label={`Energy เหลือ ${energy} จาก ${maxEnergy}`}
                    >
                      <Zap className="text-highlight-yellow size-4 fill-current" />
                      <span className="body-2 mr-1 font-semibold tabular-nums">
                        {energy - pendingCost}
                      </span>
                      {Array.from({ length: maxEnergy }, (_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "size-2.5 rounded-full border-2",
                            i >= energy
                              ? "border-white/30"
                              : i >= energy - pendingCost
                                ? "border-highlight-yellow animate-pulse"
                                : "border-highlight-yellow bg-highlight-yellow",
                          )}
                        />
                      ))}
                    </div>
                  }
                />
                <div className="grid grid-cols-3 gap-2">
                  {QUIZ_CUP_TACTICS.map((item) => {
                    const active = tactic === item.id;
                    const disabled =
                      locked || fiftyUsed || (!active && energy < item.cost);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={disabled}
                        aria-pressed={active}
                        onClick={() => pickTactic(item.id)}
                        className={cn(
                          "relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 transition-[background-color,opacity,transform]",
                          active ? "bg-primary/30" : "bg-white/5",
                          !disabled && "cursor-pointer active:scale-95",
                          !disabled && !active && "hover:bg-white/10",
                          disabled && !active && "opacity-35",
                        )}
                      >
                        <ChalkFrame
                          active={active}
                          className={cn(
                            "rounded-2xl",
                            !active && "border-white/70",
                          )}
                        />
                        <ChalkIcon icon={item.icon} className="size-6" />
                        <span className="body-2 relative font-semibold">
                          {item.label}
                        </span>
                        <span className="caption relative inline-flex items-center gap-0.5 text-neutral-300">
                          <Zap className="size-3" />
                          {item.cost} Energy
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="caption mt-2 min-h-[1.5em] text-center text-neutral-300">
                  {usedTacticInfo
                    ? usedTacticInfo.description
                    : energy > 0
                      ? "ข้อละ 1 Tactic เปลี่ยนได้ หัก Energy ตอนยืนยันคำตอบ"
                      : "Energy หมดแล้ว"}
                </p>
              </Board>
            </>
          )}
        </div>

        <div className="px-4 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {submitted ? (
            <div className="relative rounded-3xl bg-black/65 px-4 py-4 text-center">
              <ChalkFrame className="rounded-3xl border-dashed border-white/50" />
              <p className="font-display subtitle relative">
                ส่งคำตอบแล้ว รอเพื่อนตอบให้ครบ
              </p>
              <p className="caption relative mt-1 text-neutral-300">
                เดิมพัน {quizCupWagerLabel(wager)}
                {usedTacticInfo && ` · ใช้${usedTacticInfo.label}`}
              </p>
            </div>
          ) : timeUp ? (
            <p className="font-display heading-5 text-center">หมดเวลา!</p>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={choice == null || submitting}
              onClick={() => setConfirmOpen(true)}
            >
              {submitting
                ? "กำลังส่ง..."
                : choice == null
                  ? "เลือกคำตอบก่อน"
                  : "ล็อกคำตอบ"}
              {choice != null && !submitting && (
                <ChevronRight data-icon="inline-end" />
              )}
            </Button>
          )}
        </div>
      </div>

      <AppDrawer
        open={confirmOpen && choice != null && !locked}
        onOpenChange={setConfirmOpen}
        className="border-none bg-[#2B2B2BE5] backdrop-blur-[2px]"
        title={
          <span className="flex flex-col gap-1">
            <span className="caption text-highlight-yellow inline-flex items-center gap-1.5">
              <Lock className="size-3.5" />
              ยืนยันครั้งสุดท้าย
            </span>
            <span className="font-display heading-4">ล็อกคำตอบนี้เลยไหม?</span>
          </span>
        }
        titleClassName="text-white text-left"
        footer={
          <>
            <Button
              variant="outline"
              size="default"
              className="h-12 flex-1 bg-transparent px-4 text-white!"
              onClick={() => setConfirmOpen(false)}
            >
              กลับไปแก้
            </Button>
            <Button className="h-12 flex-1 px-4" onClick={submit}>
              ยืนยันคำตอบ
            </Button>
          </>
        }
      >
        {choice != null && (
          <div className="text-white">
            <dl className="divide-y divide-dashed divide-white/20 border-y border-dashed border-white/20">
              <SummaryRow label="คำตอบ">
                <span className={CHOICE_COLORS[choice].text}>
                  {CHOICE_LETTERS[choice]}
                </span>{" "}
                {choices[choice]}
              </SummaryRow>
              <SummaryRow label="เดิมพัน">
                {quizCupWagerLabel(wager)}
              </SummaryRow>
              <SummaryRow label="Tactic">
                {usedTacticInfo ? (
                  <>
                    {usedTacticInfo.label}
                    <span className="body-2 ml-2 font-normal text-neutral-300">
                      −{usedTacticInfo.cost} Energy
                    </span>
                  </>
                ) : (
                  "ไม่ใช้"
                )}
              </SummaryRow>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <p className="body-2 flex items-center justify-center gap-1.5 rounded-2xl bg-green-500/15 py-3 text-green-300">
                <Check className="size-4" />
                ถูก +{outcome.ifRight}
              </p>
              <p className="body-2 text-primary-300 bg-primary/15 flex items-center justify-center gap-1.5 rounded-2xl py-3">
                <X className="size-4" />
                ผิด −{outcome.ifWrong}
              </p>
            </div>
            <p className="caption mt-3 text-neutral-300">
              ยืนยันแล้วเปลี่ยนคำตอบไม่ได้
            </p>
          </div>
        )}
      </AppDrawer>
    </div>
  );
};

export default QuizCupAnswering;
