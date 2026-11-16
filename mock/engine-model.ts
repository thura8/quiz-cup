import { ApiError } from "@/lib/errors";
import type { QuizCupQuestionResult, QuizCupSettings } from "@/types/quiz-cup";
import type { QuizCupRoundOutcome, QuizCupSubmittedAnswer } from "@/types/quiz-cup-room";
import type { LeaderboardEntry, RoomPlayer, RoomState } from "@/types/room";

import type { MockQuestion } from "./questions";

export type MockEngineOptions = {
  preparingSeconds: number;
  answerGraceMs: number;
  speedBonusMax: number;
  autoAdvanceMs: number | null;
  botsAnswer: boolean;
};

export const DEFAULT_ENGINE_OPTIONS: MockEngineOptions = {
  preparingSeconds: 3,
  answerGraceMs: 500,
  speedBonusMax: 5,
  autoAdvanceMs: null,
  botsAnswer: true,
};

export type Bot = {
  skill: number;
  pace: number;
};

export type EnginePlayer = RoomPlayer & {
  bot: Bot | null;
  energy: number;
  totalScore: number;
  rank: number | null;
  previousRank: number | null;
  results: QuizCupQuestionResult[];
};

export type RoundAnswer = QuizCupSubmittedAnswer & { submittedAt: number };

export type RoundOutcome = {
  result: QuizCupRoundOutcome;
  roundScore: number;
  speedScore: number;
};

export type PlannedBotAnswer = { at: number; answer: QuizCupSubmittedAnswer };

export type PlayedQuestion = MockQuestion & {
  shown: string[];
  correct: number;
};

export type MockRoom = {
  roomId: string;
  state: RoomState;
  settings: QuizCupSettings;
  options: MockEngineOptions;
  players: EnginePlayer[];
  questions: PlayedQuestion[];
  round: number;
  phaseStartedAt: number;
  phaseEndsAt: number;
  answers: Record<string, RoundAnswer>;
  fifty: Record<string, number[]>;
  energyAtRoundStart: Record<string, number>;
  outcomes: Record<string, RoundOutcome>;
  botPlan: Record<string, PlannedBotAnswer>;
  leaderboard: LeaderboardEntry[];
  rand: () => number;
};

export const iso = (ms: number) => new Date(ms).toISOString();

export function findPlayer(room: MockRoom, playerId: string): EnginePlayer {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new ApiError("Player not found", 404, "INVALID_PLAYER");
  return player;
}
