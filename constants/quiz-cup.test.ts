import { describe, expect, it } from "vitest";
import { quizCupBreakdown, quizCupOutcome } from "./quiz-cup";

const sum = (lines: { points: number }[]) =>
  lines.reduce((total, line) => total + line.points, 0);

describe("quizCupOutcome", () => {
  it("loses 10 plus the wager when wrong", () => {
    expect(quizCupOutcome({ wager: 0, tactic: null })).toEqual({ ifRight: 10, ifWrong: 10 });
    expect(quizCupOutcome({ wager: 20, tactic: "double" })).toEqual({ ifRight: 60, ifWrong: 30 });
  });

  it("loses nothing with shield", () => {
    expect(quizCupOutcome({ wager: 20, tactic: "shield" })).toEqual({ ifRight: 30, ifWrong: 0 });
  });
});

describe("quizCupBreakdown", () => {
  it("adds up for a wrong answer", () => {
    const lines = quizCupBreakdown({ correct: false, wager: 20, tactic: null });
    expect(sum(lines)).toBe(-30);
  });

  it("shows the shield giving the whole loss back", () => {
    const lines = quizCupBreakdown({ correct: false, wager: 10, tactic: "shield" });
    expect(sum(lines)).toBe(0);
  });

  it("takes 10 for no answer, or what the server says", () => {
    expect(quizCupBreakdown({ correct: null, wager: 0, tactic: null })).toEqual([
      { label: "ไม่ได้ตอบ", points: -10 },
    ]);
    expect(
      quizCupBreakdown({ correct: null, wager: 0, tactic: null, missedPoints: 0 }),
    ).toEqual([{ label: "ไม่ได้ตอบ", points: 0 }]);
  });

  it("keeps the right-answer lines", () => {
    expect(sum(quizCupBreakdown({ correct: true, wager: 20, tactic: "double" }))).toBe(60);
  });
});
