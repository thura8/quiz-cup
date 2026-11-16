"use client";

import BalloonNav from "@/components/balloon/BalloonNav";
import { QUIZ_CUP_SOUNDS } from "@/constants/quiz-cup";
import type { ArenaQuality } from "@/constants/quiz-cup-arena";
import { useCountdownSound, useLoopSound, usePreloadSounds } from "@/hooks/shared/useSound";
import { sound } from "@/lib/sound/engine";
import { SOUNDS } from "@/lib/sound/sounds";
import type {
  QuizCupArenaPhase,
  QuizCupArenaPlayer,
  QuizCupArenaPlayerStatus,
  QuizCupHostPlayer,
  QuizCupHostQuestion,
} from "@/types/quiz-cup";
import { ChevronRight, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import HostCountdown from "./HostCountdown";
import { HostAnswerBanner, HostQuestionBoard } from "./HostQuestionBoard";
import HostRoundTimer from "./HostRoundTimer";

const QuizCupArena = memo(
  dynamic(() => import("@/components/quiz-cup/arena/QuizCupArena"), { ssr: false }),
);

const PRELOAD = [...Object.values(QUIZ_CUP_SOUNDS), SOUNDS.beep, SOUNDS.timeUp];

const ANSWER_AT = 1.3;
const BANNER_AT = 3.4;

export type QuizCupHostStageProps = {
  phase: "countdown" | "question" | "reveal";
  question: QuizCupHostQuestion;
  players: QuizCupHostPlayer[];
  endsAt?: string;
  durationSeconds: number;
  correctChoice?: number;
  onNext?: () => void;
  onLeave?: () => void;
  qrValue?: string;
  quality?: ArenaQuality;
};

function useStopwatch(key: string, active: boolean) {
  const [clock, setClock] = useState({ key: "", start: 0, now: 0 });
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const now = Date.now();
      setClock((c) => (c.key === key ? { ...c, now } : { key, start: now, now }));
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [key, active]);
  return active && clock.key === key ? (clock.now - clock.start) / 1000 : 0;
}

function arenaStatus(
  player: QuizCupHostPlayer,
  phase: QuizCupHostStageProps["phase"],
  answerShown: boolean,
): QuizCupArenaPlayerStatus {
  if (phase === "countdown") return "idle";
  if (phase === "reveal" && answerShown) {
    return player.result ?? (player.answered ? "wrong" : "missed");
  }
  return player.answered ? "answered" : "thinking";
}

const QuizCupHostStage = ({
  phase,
  question,
  players,
  endsAt,
  durationSeconds,
  correctChoice,
  onNext,
  onLeave,
  qrValue,
  quality,
}: QuizCupHostStageProps) => {
  usePreloadSounds(PRELOAD);
  useLoopSound(SOUNDS.bgm, { stream: true, volume: 0.18 });

  const revealing = phase === "reveal";
  const elapsed = useStopwatch(`${question.round}`, revealing);
  const answerShown = revealing && elapsed >= ANSWER_AT;
  const compact = revealing && elapsed >= BANNER_AT;

  const incomingKey = players.map((p) => `${p.id}\u0001${p.name}`).join("\u0002");
  const [heldKey, setHeldKey] = useState(incomingKey);
  if (incomingKey && incomingKey !== heldKey) setHeldKey(incomingKey);
  const rosterKey = incomingKey || (phase === "countdown" ? heldKey : "");
  const statusKey = players
    .map((p) => `${arenaStatus(p, phase, answerShown)}:${answerShown ? (p.choice ?? "") : ""}`)
    .join("|");
  const arenaPlayers = useMemo<QuizCupArenaPlayer[]>(() => {
    const states = statusKey.split("|");
    return (rosterKey ? rosterKey.split("\u0002") : []).map((entry, i) => {
      const [id, name] = entry.split("\u0001");
      const [status, choice] = (states[i] || "idle:").split(":");
      return {
        id,
        name,
        status: status as QuizCupArenaPlayerStatus,
        choice: choice === "" ? null : Number(choice),
      };
    });
  }, [rosterKey, statusKey]);
  const arenaPhase: QuizCupArenaPhase =
    phase === "countdown"
      ? question.round === 1
        ? "intro"
        : "leaderboard"
      : phase === "reveal" && !compact
        ? "question"
        : phase;

  useCountdownSound({
    endsAt: phase === "countdown" ? endsAt : null,
    tickFrom: 3,
    timeUpSrc: QUIZ_CUP_SOUNDS.go,
  });
  useCountdownSound({ endsAt: phase === "question" ? endsAt : null, tickFrom: 5 });

  useEffect(() => {
    if (phase === "question") sound.play(QUIZ_CUP_SOUNDS.question, { volume: 0.8 });
    if (phase === "reveal") sound.play(QUIZ_CUP_SOUNDS.reveal, { volume: 0.8 });
  }, [phase, question.round]);

  const answeredCount = players.filter((p) => p.answered).length;
  const lastAnswered = useRef(answeredCount);
  useEffect(() => {
    if (phase === "question" && answeredCount > lastAnswered.current) {
      sound.play(QUIZ_CUP_SOUNDS.lock, { volume: 0.7 });
    }
    lastAnswered.current = answeredCount;
  }, [phase, answeredCount]);

  useEffect(() => {
    if (answerShown) sound.play(QUIZ_CUP_SOUNDS.correct);
  }, [answerShown]);

  const canAdvance = compact && !!onNext;
  const lastRound = question.round >= question.totalRounds;
  useEffect(() => {
    if (!canAdvance) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== " " && e.key !== "ArrowRight")) return;
      e.preventDefault();
      onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canAdvance, onNext]);

  const tally = useMemo(() => {
    const t = { correct: 0, wrong: 0, missed: 0 };
    for (const p of players) t[p.result ?? (p.answered ? "wrong" : "missed")]++;
    return t;
  }, [players]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <QuizCupArena players={arenaPlayers} phase={arenaPhase} quality={quality} />

      <div className="absolute inset-x-0 top-0 z-30">
        <BalloonNav showLabels={false} onLeave={onLeave} qrValue={qrValue} />
      </div>

      {phase === "countdown" && endsAt && (
        <HostCountdown
          key={question.round}
          startsAt={endsAt}
          durationSeconds={durationSeconds}
          question={question}
          firstRound={question.round === 1}
        />
      )}

      {phase !== "countdown" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-40 pt-24">
          {compact && correctChoice != null ? (
            <HostAnswerBanner question={question} correctChoice={correctChoice} />
          ) : (
            <HostQuestionBoard
              key={question.round}
              question={question}
              correctChoice={answerShown ? correctChoice : null}
            />
          )}
        </div>
      )}

      {phase === "question" && endsAt && (
        <HostRoundTimer
          key={endsAt}
          endsAt={endsAt}
          durationSeconds={durationSeconds}
          className="absolute top-24 right-6 z-20"
        />
      )}

      {phase === "question" && (
        <p className="studio-pill font-studio absolute bottom-6 left-1/2 z-10 -translate-x-1/2 px-7 py-2 text-xl font-semibold text-[#efe4ff]">
          ตอบแล้ว{" "}
          <span className="studio-title ml-1 text-2xl">
            {answeredCount}/{players.length}
          </span>
        </p>
      )}

      {answerShown && (
        <p className="studio-pill font-studio animate-in fade-in absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-7 px-8 py-2 text-xl font-semibold">
          <span className="text-[#2ff07a]">ถูก {tally.correct}</span>
          <span className="text-[#ff5a6b]">ผิด {tally.wrong}</span>
          <span className="text-[#b9a8e0]">ไม่ตอบ {tally.missed}</span>
        </p>
      )}

      {canAdvance && (
        <button
          type="button"
          onClick={onNext}
          className="studio-button animate-in fade-in slide-in-from-right-4 absolute right-8 bottom-6 z-20 flex h-14 items-center gap-2 px-8 text-xl"
        >
          {lastRound ? (
            <>
              <Trophy className="size-5" />
              ดูสรุปคะแนน
            </>
          ) : (
            <>
              ข้อต่อไป
              <ChevronRight className="size-6" strokeWidth={3} />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default QuizCupHostStage;
