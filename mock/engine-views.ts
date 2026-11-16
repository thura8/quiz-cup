import { quizCupStartingEnergy } from "@/constants/quiz-cup";
import type { QuizCupHostRoomView, QuizCupPlayerRoomView, QuizCupQuestionView } from "@/types/quiz-cup-room";
import type { RoomPlayer } from "@/types/room";

import { type MockRoom, findPlayer, iso } from "./engine-model";

function baseView(room: MockRoom, now: number) {
  return {
    roomId: room.roomId,
    maxPlayers: room.settings.maxPlayers,
    totalRounds: room.questions.length || room.settings.questionCount,
    roundDuration: room.settings.secondsPerQuestion,
    serverTime: iso(now),
  };
}

function questionView(room: MockRoom): QuizCupQuestionView {
  const question = room.questions[room.round - 1];
  return {
    round: room.round,
    totalRounds: room.questions.length,
    category: question.category,
    difficulty: question.difficulty,
    question: question.question,
    choices: question.shown,
  };
}

function lobbyPlayers(room: MockRoom): RoomPlayer[] {
  return room.players.map(({ id, name, avatar, border, bgColor, connected }) => ({
    id,
    name,
    avatar,
    border,
    bgColor,
    connected,
  }));
}

function correctChoice(room: MockRoom) {
  return room.settings.revealAnswer ? room.questions[room.round - 1].correct : null;
}

export function hostView(room: MockRoom, now = Date.now()): QuizCupHostRoomView {
  const base = baseView(room, now);
  switch (room.state) {
    case "LOBBY":
      return { ...base, state: "LOBBY", players: lobbyPlayers(room) };
    case "PREPARING": {
      const question = questionView(room);
      return {
        ...base,
        state: "PREPARING",
        round: room.round,
        preparingStartedAt: iso(room.phaseStartedAt),
        preparingEndsAt: iso(room.phaseEndsAt),
        question: {
          round: question.round,
          totalRounds: question.totalRounds,
          category: question.category,
          difficulty: question.difficulty,
        },
      };
    }
    case "PLAYING":
      return {
        ...base,
        state: "PLAYING",
        round: room.round,
        roundStartedAt: iso(room.phaseStartedAt),
        roundEndsAt: iso(room.phaseEndsAt),
        question: questionView(room),
        players: room.players.map((player) => ({
          playerId: player.id,
          name: player.name,
          connected: player.connected,
          answered: Boolean(room.answers[player.id]),
        })),
      };
    case "ROUND_RESULT":
      return {
        ...base,
        state: "ROUND_RESULT",
        round: room.round,
        question: questionView(room),
        correctChoice: correctChoice(room),
        isLastRound: room.round >= room.questions.length,
        players: room.players.map((player) => {
          const outcome = room.outcomes[player.id];
          return {
            playerId: player.id,
            name: player.name,
            answered: Boolean(room.answers[player.id]),
            choice: room.answers[player.id]?.choice ?? null,
            result: outcome.result,
            roundScore: outcome.roundScore,
            speedScore: outcome.speedScore,
            totalScore: player.totalScore,
          };
        }),
        leaderboard: room.leaderboard,
      };
    case "FINISHED":
      return { ...base, state: "FINISHED", leaderboard: room.leaderboard };
  }
}

export function playerView(room: MockRoom, playerId: string, now = Date.now()): QuizCupPlayerRoomView {
  const base = baseView(room, now);
  const player = findPlayer(room, playerId);
  const standing = {
    energy: room.state === "PLAYING" ? (room.energyAtRoundStart[player.id] ?? player.energy) : player.energy,
    maxEnergy: quizCupStartingEnergy(room.settings.questionCount),
    myScore: player.totalScore,
    myRank: player.rank,
  };
  switch (room.state) {
    case "LOBBY":
      return { ...base, state: "LOBBY", players: lobbyPlayers(room) };
    case "PREPARING": {
      const hostPreparing = hostView(room, now);
      if (hostPreparing.state !== "PREPARING") throw new Error("unreachable");
      return { ...hostPreparing, ...standing };
    }
    case "PLAYING": {
      const answer = room.answers[player.id];
      return {
        ...base,
        ...standing,
        state: "PLAYING",
        round: room.round,
        roundStartedAt: iso(room.phaseStartedAt),
        roundEndsAt: iso(room.phaseEndsAt),
        question: questionView(room),
        hiddenChoices: room.fifty[player.id] ?? [],
        submitted: answer ? { choice: answer.choice, wager: answer.wager, tactic: answer.tactic } : null,
      };
    }
    case "ROUND_RESULT": {
      const answer = room.answers[player.id];
      const outcome = room.outcomes[player.id];
      return {
        ...base,
        state: "ROUND_RESULT",
        round: room.round,
        question: questionView(room),
        correctChoice: correctChoice(room),
        isLastRound: room.round >= room.questions.length,
        myAnswer: answer ? { choice: answer.choice, wager: answer.wager, tactic: answer.tactic } : null,
        myResult: outcome.result,
        myRoundScore: outcome.roundScore,
        mySpeedScore: outcome.speedScore,
        myTotalScore: player.totalScore,
        myTotalRank: player.rank ?? 1,
        myPreviousRank: player.previousRank ?? player.rank ?? 1,
      };
    }
    case "FINISHED":
      return {
        ...base,
        state: "FINISHED",
        myTotalScore: player.totalScore,
        myTotalRank: player.rank ?? 1,
        leaderboard: room.leaderboard,
        results: player.results,
      };
  }
}
