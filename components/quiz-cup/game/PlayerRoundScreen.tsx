"use client";

import type { useMockQuizCupRoom } from "@/hooks/quiz-cup/useMockQuizCupRoom";
import type { QuizCupPlayingPlayerView, QuizCupRoomView } from "@/types/quiz-cup-room";

import QuizCupAnswering, { type QuizCupAnswer } from "../QuizCupAnswering";
import QuizCupAnswerResult from "../QuizCupAnswerResult";
import QuizCupPlayerSummary from "../QuizCupPlayerSummary";
import QuizCupRoundIntro from "../QuizCupRoundIntro";
import { secondsBetween } from "./time";

type MockRoom = ReturnType<typeof useMockQuizCupRoom>;

export type SelfIdentity = { selfName: string; selfAvatarSrc: string; selfAvatarBg: string };

type Props = {
  room: QuizCupRoomView;
  self: SelfIdentity;
  localRound: MockRoom["localRound"];
  submitting: boolean;
  onUseFifty: () => void;
  onSubmit: (answer: QuizCupAnswer) => void;
  onDone: () => void;
  onLeave: () => void;
};

function PlayingRound({
  view,
  self,
  localRound,
  submitting,
  onUseFifty,
  onSubmit,
  onLeave,
}: Omit<Props, "room" | "onDone"> & { view: QuizCupPlayingPlayerView }) {
  const local = localRound?.round === view.round ? localRound : null;
  const hiddenChoices = view.hiddenChoices.length > 0 ? view.hiddenChoices : (local?.hiddenChoices ?? []);
  const sent = view.submitted ?? local?.submitted ?? null;
  const submitted: QuizCupAnswer | null =
    sent && hiddenChoices.length > 0 && !sent.tactic ? { ...sent, tactic: "fifty" } : sent;

  return (
    <QuizCupAnswering
      key={view.round}
      round={view.round}
      totalRounds={view.totalRounds}
      question={view.question.question}
      choices={view.question.choices}
      roundEndsAt={view.roundEndsAt}
      durationSeconds={view.roundDuration}
      {...self}
      score={view.myScore}
      rank={view.myRank}
      maxEnergy={view.maxEnergy}
      energy={local?.energy ?? view.energy}
      hiddenChoices={hiddenChoices}
      onUseFifty={onUseFifty}
      submitted={submitted}
      submitting={submitting}
      onSubmit={onSubmit}
      onLeave={onLeave}
    />
  );
}

export default function PlayerRoundScreen({ room, self, onDone, onLeave, ...playing }: Props) {
  if (room.state === "PREPARING" && "energy" in room) {
    return (
      <QuizCupRoundIntro
        round={room.round}
        totalRounds={room.totalRounds}
        category={room.question.category}
        difficulty={room.question.difficulty}
        startsAt={room.preparingEndsAt}
        durationSeconds={secondsBetween(room.preparingStartedAt, room.preparingEndsAt)}
        {...self}
        score={room.myScore}
        rank={room.myRank}
        energy={room.energy}
        onLeave={onLeave}
      />
    );
  }

  if (room.state === "PLAYING" && "energy" in room) {
    return <PlayingRound view={room as QuizCupPlayingPlayerView} self={self} onLeave={onLeave} {...playing} />;
  }

  if (room.state === "ROUND_RESULT" && "myResult" in room) {
    const missed = room.myResult === "missed";
    return (
      <QuizCupAnswerResult
        round={room.round}
        totalRounds={room.totalRounds}
        question={room.question.question}
        choices={room.question.choices}
        correctChoice={room.correctChoice}
        correct={missed ? null : room.myResult === "correct"}
        speedBonus={room.mySpeedScore}
        missedPoints={missed ? room.myRoundScore : undefined}
        answer={room.myAnswer}
        {...self}
        score={room.myTotalScore}
        rank={room.myTotalRank}
        previousRank={room.myPreviousRank}
        onLeave={onLeave}
      />
    );
  }

  if (room.state === "FINISHED" && "results" in room) {
    return (
      <QuizCupPlayerSummary
        {...self}
        rank={room.myTotalRank}
        totalPlayers={room.leaderboard.length}
        score={room.myTotalScore}
        results={room.results}
        onDone={onDone}
        onLeave={onLeave}
      />
    );
  }

  return null;
}
