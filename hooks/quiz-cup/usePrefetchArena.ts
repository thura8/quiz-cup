import { useEffect } from "react";

const IDLE_TIMEOUT_MS = 2000;

export function usePrefetchArena(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const load = () => void import("@/components/quiz-cup/arena/QuizCupArena");
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(load, { timeout: IDLE_TIMEOUT_MS });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(load, IDLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [enabled]);
}
