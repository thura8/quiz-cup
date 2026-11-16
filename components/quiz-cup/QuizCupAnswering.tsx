"use client";

import { useEffect, useEffectEvent, useState } from "react";

import BalloonNav from "@/components/balloon/BalloonNav";
import { ChalkEffect } from "@/components/ChalkEffect";
import { QUIZ_CUP_TACTICS, QUIZ_CUP_WAGERS, quizCupOutcome } from "@/constants/quiz-cup";
import { useCountdownSound } from "@/hooks/shared/useSound";
import type { QuizCupTacticId } from "@/types/quiz-cup";

import AnswerFooter from "./answering/AnswerFooter";
import ChoiceList from "./answering/ChoiceList";
import ConfirmAnswerDrawer from "./answering/ConfirmAnswerDrawer";
import RoundTimerBar from "./answering/RoundTimerBar";
import TacticPicker from "./answering/TacticPicker";
import WagerPicker from "./answering/WagerPicker";
import QuizCupBackground from "./QuizCupBackground";
import { Board } from "./QuizCupChalk";
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
  maxEnergy: number;
  energy: number;
  hiddenChoices?: number[];
  onUseFifty?: () => void;
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

function useRemainingMs(endsAt: string, durationSeconds: number) {
  const [remainingMs, setRemainingMs] = useState(durationSeconds * 1000);
  useEffect(() => {
    const timer = setInterval(() => setRemainingMs(msLeft(endsAt)), TICK_MS);
    return () => clearInterval(timer);
  }, [endsAt]);
  return remainingMs;
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
  const remainingMs = useRemainingMs(roundEndsAt, durationSeconds);
  const [pendingChoice, setPendingChoice] = useState<number | null>(null);
  const [pendingWager, setPendingWager] = useState<number>(QUIZ_CUP_WAGERS[0]);
  const [pendingTactic, setPendingTactic] = useState<QuizCupTacticId | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fiftyUsed = pendingTactic === "fifty" || hiddenChoices.length > 0;
  const tactic = fiftyUsed ? "fifty" : pendingTactic;
  const visiblePendingChoice =
    pendingChoice != null && !hiddenChoices.includes(pendingChoice) ? pendingChoice : null;
  const choice = submitted?.choice ?? visiblePendingChoice;
  const wager = submitted?.wager ?? pendingWager;
  const usedTacticId = submitted ? submitted.tactic : tactic;
  const outcome = quizCupOutcome({ wager, tactic: usedTacticId });
  const usedTactic = QUIZ_CUP_TACTICS.find((item) => item.id === usedTacticId);
  const pendingCost = submitted ? 0 : (usedTactic?.cost ?? 0);

  const timeUp = remainingMs <= 0;
  const locked = submitted != null || submitting || timeUp;
  const seconds = Math.ceil(remainingMs / 1000);
  const hurry = !locked && seconds <= HURRY_SECONDS;
  const progressPercent = Math.min(100, (remainingMs / (durationSeconds * 1000)) * 100);

  function submit() {
    if (choice == null || locked) return;
    setConfirmOpen(false);
    onSubmit?.({ choice, wager, tactic });
  }

  const autoSubmitOnTimeUp = useEffectEvent(() => {
    if (!submitted && !submitting && choice != null) onSubmit?.({ choice, wager, tactic });
  });

  useEffect(() => {
    if (timeUp) autoSubmitOnTimeUp();
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
          <RoundTimerBar progressPercent={progressPercent} seconds={seconds} hurry={hurry} />

          <Board className="bg-black/65 py-5 sm:py-5">
            <ChalkEffect as="p" variant="chalk-soft" className="font-display heading-4 block">
              {question}
            </ChalkEffect>
          </Board>

          <ChoiceList
            choices={choices}
            hiddenChoices={hiddenChoices}
            selectedChoice={choice}
            locked={locked}
            onSelect={setPendingChoice}
          />

          {!submitted && (
            <>
              <WagerPicker wager={wager} outcome={outcome} locked={locked} onChange={setPendingWager} />
              <TacticPicker
                tactic={tactic}
                usedTactic={usedTactic}
                energy={energy}
                maxEnergy={maxEnergy}
                pendingCost={pendingCost}
                locked={locked}
                fiftyUsed={fiftyUsed}
                onPick={pickTactic}
              />
            </>
          )}
        </div>

        <div className="px-4 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <AnswerFooter
            submitted={submitted != null}
            timeUp={timeUp}
            submitting={submitting}
            hasChoice={choice != null}
            wager={wager}
            usedTactic={usedTactic}
            onLock={() => setConfirmOpen(true)}
          />
        </div>
      </div>

      <ConfirmAnswerDrawer
        open={confirmOpen && choice != null && !locked}
        onOpenChange={setConfirmOpen}
        onConfirm={submit}
        choice={choice}
        choices={choices}
        wager={wager}
        usedTactic={usedTactic}
        outcome={outcome}
      />
    </div>
  );
};

export default QuizCupAnswering;
