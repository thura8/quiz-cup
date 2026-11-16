export type QuizCupSourceId = "all" | "custom" | "general";

export type QuizCupCategoryId =
  | "general"
  | "science"
  | "math"
  | "thai"
  | "english"
  | "history"
  | "technology"
  | "arts"
  | "sports"
  | "environment"
  | "career"
  | "logic";

export type QuizCupDifficultyId = "easy" | "medium" | "hard";

export type QuizCupTacticId = "shield" | "double" | "fifty";

/** What the host picks: one level, or "random" for an equal mix of all three. */
export type QuizCupDifficultySetting = QuizCupDifficultyId | "random";

export type QuizCupSettings = {
  source: QuizCupSourceId;
  categories: QuizCupCategoryId[];
  difficulty: QuizCupDifficultySetting;
  questionCount: number;
  secondsPerQuestion: number;
  maxPlayers: number;
  shuffleChoices: boolean;
  revealAnswer: boolean;
  speedBonus: boolean;
};

/** One question from a player's point of view, for the end-of-game summary. */
export type QuizCupQuestionResult = {
  /** null when the player didn't answer in time. */
  correct: boolean | null;
  wager: number;
  tactic: QuizCupTacticId | null;
};

/** What the 3D host arena is showing; drives the camera and the stage lighting. */
export type QuizCupArenaPhase = "intro" | "question" | "reveal" | "leaderboard";

export type QuizCupArenaPlayerStatus =
  | "idle"
  | "thinking"
  | "answered"
  | "correct"
  | "wrong"
  | "missed";

export type QuizCupArenaPlayer = {
  id: string;
  /** Shown on the podium screen; keep it short (≤ 8 characters reads best). */
  name: string;
  status: QuizCupArenaPlayerStatus;
  /** The choice they picked, shown over their head. Only pass it once the answer is
   *  revealed: everyone in the room can see the host screen. */
  choice?: number | null;
};

/** A contestant as the host screen sees them during a question. */
export type QuizCupHostPlayer = {
  id: string;
  name: string;
  answered: boolean;
  /** Known once the answer is revealed; unset players count as missed / wrong. */
  result?: "correct" | "wrong" | "missed";
  /** The choice they picked; shown over their head only after the reveal. */
  choice?: number | null;
};

export type QuizCupHostQuestion = {
  round: number;
  totalRounds: number;
  category: QuizCupCategoryId;
  difficulty: QuizCupDifficultyId;
  question: string;
  choices: string[];
};
