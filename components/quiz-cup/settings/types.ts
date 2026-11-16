import type { QuizCupSettings } from "@/types/quiz-cup";

export type UpdateSetting = <K extends keyof QuizCupSettings>(key: K, value: QuizCupSettings[K]) => void;

export const SHOW_MAX_PLAYERS = false;
