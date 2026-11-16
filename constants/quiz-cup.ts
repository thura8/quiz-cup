import type {
  QuizCupCategoryId,
  QuizCupDifficultyId,
  QuizCupDifficultySetting,
  QuizCupSettings,
  QuizCupSourceId,
  QuizCupTacticId,
} from "@/types/quiz-cup";
import {
  BookOpenText,
  Briefcase,
  Dumbbell,
  FlaskConical,
  Globe,
  Landmark,
  Languages,
  LayoutGrid,
  Leaf,
  Lightbulb,
  Monitor,
  Palette,
  Scissors,
  Shield,
  Shuffle,
  Sigma,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const QUIZ_CUP_BACKGROUND = "/quiz-cup/bg.png";
export const QUIZ_CUP_LOGO = "/quiz-cup/logo.png";

export const QUIZ_CUP_SOURCES: {
  id: QuizCupSourceId;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "all",
    label: "ทุกหมวด",
    description: "สุ่มคำถามจากทุกหมวด",
    icon: Shuffle,
  },
  {
    id: "custom",
    label: "เลือกหมวดเอง",
    description: "ถามเฉพาะหมวดที่เลือก",
    icon: LayoutGrid,
  },
  {
    id: "general",
    label: "ความรู้รอบตัว",
    description: "เรื่องน่ารู้รอบโลก",
    icon: Globe,
  },
];

export const QUIZ_CUP_CATEGORIES: {
  id: QuizCupCategoryId;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "general", label: "ความรู้รอบตัว", icon: Globe },
  { id: "science", label: "วิทยาศาสตร์", icon: FlaskConical },
  { id: "math", label: "คณิตศาสตร์", icon: Sigma },
  { id: "thai", label: "ภาษาไทย", icon: BookOpenText },
  { id: "english", label: "ภาษาอังกฤษ", icon: Languages },
  { id: "history", label: "ประวัติศาสตร์", icon: Landmark },
  { id: "technology", label: "เทคโนโลยี", icon: Monitor },
  { id: "arts", label: "ศิลปะและวัฒนธรรม", icon: Palette },
  { id: "sports", label: "กีฬาและบันเทิง", icon: Dumbbell },
  { id: "environment", label: "สิ่งแวดล้อม", icon: Leaf },
  { id: "career", label: "อาชีพและชีวิตประจำวัน", icon: Briefcase },
  { id: "logic", label: "ตรรกะและการคิด", icon: Lightbulb },
];

export const QUIZ_CUP_DIFFICULTIES: {
  id: QuizCupDifficultyId;
  label: string;
  /** How many of the three bars are filled. */
  bars: number;
}[] = [
  { id: "easy", label: "ง่าย", bars: 1 },
  { id: "medium", label: "ปานกลาง", bars: 2 },
  { id: "hard", label: "ยาก", bars: 3 },
];

/** The settings board's choices: every level, plus an equal mix of all three. */
export const QUIZ_CUP_DIFFICULTY_SETTINGS: {
  id: QuizCupDifficultySetting;
  label: string;
  /** Bars to fill; null for "random", which shows a shuffle icon instead. */
  bars: number | null;
}[] = [
  ...QUIZ_CUP_DIFFICULTIES,
  { id: "random", label: "สุ่ม", bars: null },
];

export const QUIZ_CUP_QUESTION_COUNTS = [10, 20, 30] as const;
export const QUIZ_CUP_QUESTION_MIN = 5;
export const QUIZ_CUP_QUESTION_MAX = 50;

export function clampQuestionCount(count: number): number {
  if (!Number.isFinite(count)) return QUIZ_CUP_QUESTION_MIN;
  return Math.min(
    QUIZ_CUP_QUESTION_MAX,
    Math.max(QUIZ_CUP_QUESTION_MIN, Math.round(count)),
  );
}
export const QUIZ_CUP_SECONDS_PER_QUESTION = [10, 15, 20, 30] as const;
export const QUIZ_CUP_MAX_PLAYERS = [5, 10, 15, 20] as const;

export const QUIZ_CUP_TACTICS: {
  id: QuizCupTacticId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Energy spent when the answer is confirmed. */
  cost: number;
}[] = [
  {
    id: "shield",
    label: "โล่",
    description: "ตอบผิดไม่เสียแต้มเลย",
    icon: Shield,
    cost: 1,
  },
  {
    id: "double",
    label: "คะแนน x2",
    description: "ตอบถูกได้คะแนนรวมเดิมพันสองเท่า",
    icon: Zap,
    cost: 1,
  },
  {
    id: "fifty",
    label: "ตัดตัวเลือก",
    description: "ตัดคำตอบผิดออก 2 ข้อ ใช้แล้วยกเลิกไม่ได้",
    icon: Scissors,
    cost: 1,
  },
];

/** Extra points staked on an answer: won if right, lost if wrong. */
export const QUIZ_CUP_WAGERS = [0, 10, 20] as const;

/** Points for a correct answer before the wager and tactics apply. */
export const QUIZ_CUP_BASE_POINTS = 10;

/**
 * Lost for a wrong answer, and for no answer while connected. Equal to the
 * base points, so double and shield break even at 50% confidence.
 */
export const QUIZ_CUP_MISS_PENALTY = 10;

/**
 * What an answer can win or lose. Double Down doubles everything won; Shield
 * cancels everything lost.
 */
export function quizCupOutcome({
  wager,
  tactic,
  basePoints = QUIZ_CUP_BASE_POINTS,
}: {
  wager: number;
  tactic: QuizCupTacticId | null;
  basePoints?: number;
}): { ifRight: number; ifWrong: number } {
  return {
    ifRight: (basePoints + wager) * (tactic === "double" ? 2 : 1),
    ifWrong: tactic === "shield" ? 0 : QUIZ_CUP_MISS_PENALTY + wager,
  };
}

/**
 * Energy each player starts with; every tactic spends some of it. 3 under 10
 * questions, then +1 every 5 questions.
 * 5–9 → 3, 10–14 → 4, 15–19 → 5, 20–24 → 6, … 50 → 12.
 */
export function quizCupStartingEnergy(questionCount: number): number {
  return Math.max(3, 2 + Math.floor(questionCount / 5));
}

export const QUIZ_CUP_DEFAULT_SETTINGS: QuizCupSettings = {
  source: "all",
  categories: [],
  difficulty: "medium",
  questionCount: 20,
  secondsPerQuestion: 20,
  maxPlayers: 10,
  shuffleChoices: true,
  revealAnswer: true,
  speedBonus: true,
};

export function quizCupWagerLabel(wager: number): string {
  return wager === 0 ? "ไม่เดิมพัน" : `${wager} แต้ม`;
}

export function quizCupBreakdown({
  correct,
  wager,
  tactic,
  basePoints = QUIZ_CUP_BASE_POINTS,
  missedPoints = -QUIZ_CUP_MISS_PENALTY,
}: {
  correct: boolean | null;
  wager: number;
  tactic: QuizCupTacticId | null;
  basePoints?: number;
  /** What no answer scored; 0 for a player who had dropped out. */
  missedPoints?: number;
}): { label: string; points: number }[] {
  if (correct == null) return [{ label: "ไม่ได้ตอบ", points: missedPoints }];

  if (correct) {
    const lines = [{ label: "ตอบถูก", points: basePoints }];
    if (wager > 0) lines.push({ label: "ชนะเดิมพัน", points: wager });
    if (tactic === "double") {
      lines.push({ label: "คะแนน x2", points: basePoints + wager });
    }
    return lines;
  }

  const lines = [{ label: "ตอบผิด", points: -QUIZ_CUP_MISS_PENALTY }];
  if (wager > 0) lines.push({ label: "เสียเดิมพัน", points: -wager });
  if (tactic === "shield") {
    lines.push({ label: "โล่กันไว้", points: QUIZ_CUP_MISS_PENALTY + wager });
  }
  return lines;
}

/** Host-screen sound effects (scripts/generate-quiz-cup-sfx.mjs). */
export const QUIZ_CUP_SOUNDS = {
  go: "/sounds/quiz-cup/go.wav",
  question: "/sounds/quiz-cup/question.wav",
  lock: "/sounds/quiz-cup/lock.wav",
  reveal: "/sounds/quiz-cup/reveal.wav",
  correct: "/sounds/quiz-cup/correct.wav",
  wrong: "/sounds/quiz-cup/wrong.wav",
} as const;
