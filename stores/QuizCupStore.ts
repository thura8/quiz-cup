import { create } from "zustand";

export type QuizCupStep =
  | "join"
  | "enter_room"
  | "waiting_room"
  | "settings"
  | "host_stage"
  | "answer"
  | "end_game"
  | "loading";

interface QuizCupState {
  step: QuizCupStep;
  setStep: (step: QuizCupStep) => void;
}

export const useQuizCupStore = create<QuizCupState>((set) => ({
  step: "loading",
  setStep: (step) => set({ step }),
}));
