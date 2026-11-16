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

export type QuizCupQuestionResult = {
  correct: boolean | null;
  wager: number;
  tactic: QuizCupTacticId | null;
};

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
  name: string;
  status: QuizCupArenaPlayerStatus;
  choice?: number | null;
};

export type QuizCupHostPlayer = {
  id: string;
  name: string;
  answered: boolean;
  result?: "correct" | "wrong" | "missed";
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
