import type {
  QuizCupCategoryId,
  QuizCupDifficultyId,
  QuizCupQuestionResult,
  QuizCupTacticId,
} from "@/types/quiz-cup";
import type { LeaderboardEntry, RoomPlayer } from "@/types/room";

// What GET /rooms/:id returns for a Quiz Cup room (docs/quiz-cup.md §6 in the
// backend). Timestamps are ISO strings from the server.

interface QuizCupRoomBase {
  roomId: string;
  maxPlayers: number;
  totalRounds: number;
  /** Seconds per question. */
  roundDuration: number;
  /** Server clock when the view was built, for countdown drift. */
  serverTime: string;
}

/** Tactics sent with an answer; "fifty" has its own endpoint. */
export type QuizCupAnswerTactic = Exclude<QuizCupTacticId, "fifty">;

export interface QuizCupSubmittedAnswer {
  choice: number;
  wager: number;
  tactic: QuizCupAnswerTactic | null;
}

export type QuizCupRoundOutcome = "correct" | "wrong" | "missed";

export interface QuizCupQuestionView {
  round: number;
  totalRounds: number;
  category: QuizCupCategoryId;
  difficulty: QuizCupDifficultyId;
  question: string;
  /** In display order (after shuffling). */
  choices: string[];
}

/** Score, rank and energy before the current question. */
export interface QuizCupPlayerStanding {
  energy: number;
  maxEnergy: number;
  myScore: number;
  /** null before any question has been revealed. */
  myRank: number | null;
}

export interface QuizCupLobbyView extends QuizCupRoomBase {
  state: "LOBBY";
  players: RoomPlayer[];
}

export interface QuizCupPreparingView extends QuizCupRoomBase {
  state: "PREPARING";
  round: number;
  preparingStartedAt: string;
  preparingEndsAt: string;
  question: Pick<
    QuizCupQuestionView,
    "round" | "totalRounds" | "category" | "difficulty"
  >;
}

export type QuizCupPreparingPlayerView = QuizCupPreparingView &
  QuizCupPlayerStanding;

interface QuizCupPlayingBase extends QuizCupRoomBase {
  state: "PLAYING";
  round: number;
  roundStartedAt: string;
  roundEndsAt: string;
  question: QuizCupQuestionView;
}

export interface QuizCupPlayingHostView extends QuizCupPlayingBase {
  players: {
    playerId: string;
    name: string;
    connected: boolean;
    answered: boolean;
  }[];
}

export interface QuizCupPlayingPlayerView
  extends QuizCupPlayingBase,
    QuizCupPlayerStanding {
  hiddenChoices: number[];
  submitted: QuizCupSubmittedAnswer | null;
}

interface QuizCupRoundResultBase extends QuizCupRoomBase {
  state: "ROUND_RESULT";
  round: number;
  question: QuizCupQuestionView;
  /** null when the host turned "เฉลยคำตอบ" off. */
  correctChoice: number | null;
  isLastRound: boolean;
}

export interface QuizCupRoundResultHostView extends QuizCupRoundResultBase {
  players: {
    playerId: string;
    name: string;
    answered: boolean;
    choice: number | null;
    result: QuizCupRoundOutcome;
    roundScore: number;
    speedScore: number;
    totalScore: number;
  }[];
  leaderboard: LeaderboardEntry[];
}

export interface QuizCupRoundResultPlayerView extends QuizCupRoundResultBase {
  myAnswer: QuizCupSubmittedAnswer | null;
  myResult: QuizCupRoundOutcome;
  myRoundScore: number;
  mySpeedScore: number;
  myTotalScore: number;
  myTotalRank: number;
  myPreviousRank: number;
}

export interface QuizCupFinishedHostView extends QuizCupRoomBase {
  state: "FINISHED";
  leaderboard: LeaderboardEntry[];
}

export interface QuizCupFinishedPlayerView extends QuizCupRoomBase {
  state: "FINISHED";
  myTotalScore: number;
  myTotalRank: number;
  leaderboard: LeaderboardEntry[];
  results: QuizCupQuestionResult[];
}

export type QuizCupHostRoomView =
  | QuizCupLobbyView
  | QuizCupPreparingView
  | QuizCupPlayingHostView
  | QuizCupRoundResultHostView
  | QuizCupFinishedHostView;

export type QuizCupPlayerRoomView =
  | QuizCupLobbyView
  | QuizCupPreparingPlayerView
  | QuizCupPlayingPlayerView
  | QuizCupRoundResultPlayerView
  | QuizCupFinishedPlayerView;

export type QuizCupRoomView = QuizCupHostRoomView | QuizCupPlayerRoomView;
