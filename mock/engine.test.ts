import { QUIZ_CUP_DEFAULT_SETTINGS } from "@/constants/quiz-cup";
import { describe, expect, it } from "vitest";
import * as engine from "./engine";

const settings = { ...QUIZ_CUP_DEFAULT_SETTINGS, questionCount: 5, secondsPerQuestion: 10 };

function roomWithBots(n = 3, options = {}) {
  const room = engine.createMockRoom({ roomId: "T1", seed: 42, options });
  for (let i = 0; i < n; i++) engine.addBot(room);
  return room;
}

describe("mock engine", () => {
  it("plays a whole game through every state", () => {
    const room = roomWithBots();
    engine.joinAsHuman(room, { name: "ฉัน" });
    let now = 1_000_000;
    engine.startGame(room, settings, now);
    expect(room.state).toBe("PREPARING");
    const seen = new Set<string>();
    for (let guard = 0; guard < 200 && room.state !== "FINISHED"; guard++) {
      now += 1000;
      engine.tick(room, now);
      seen.add(room.state);
      if (room.state === "ROUND_RESULT") engine.nextRound(room, now);
      seen.add(room.state);
    }
    expect(room.state).toBe("FINISHED");
    expect(seen).toEqual(new Set(["PREPARING", "PLAYING", "ROUND_RESULT", "FINISHED"]));
    const view = engine.playerView(room, "me", now);
    expect(view.state === "FINISHED" && view.results).toHaveLength(5);
  });

  it("scores right, wrong and missed like the real rules", () => {
    const room = roomWithBots(0);
    engine.joinAsHuman(room, { name: "ฉัน" });
    const now = 0;
    engine.startGame(room, { ...settings, speedBonus: false }, now);
    engine.tick(room, 3000);
    const right = room.questions[0].correct;
    engine.submitAnswer(room, "me", 1, { choice: right, wager: 20, tactic: "double" }, 4000);
    engine.tick(room, 4000);
    expect(room.state).toBe("ROUND_RESULT");
    expect(room.outcomes.me).toMatchObject({ result: "correct", roundScore: 60 });
  });

  it("charges fifty once and rejects a removed choice", () => {
    const room = roomWithBots(0, { botsAnswer: false });
    engine.joinAsHuman(room, { name: "ฉัน" });
    engine.startGame(room, settings, 0);
    engine.tick(room, 3000);
    const before = room.players[0].energy;
    const a = engine.requestFifty(room, "me", 1);
    const b = engine.requestFifty(room, "me", 1);
    expect(b.hiddenChoices).toEqual(a.hiddenChoices);
    expect(room.players[0].energy).toBe(before - 1);
    expect(() =>
      engine.submitAnswer(room, "me", 1, { choice: a.hiddenChoices[0], wager: 0, tactic: null }, 3500),
    ).toThrow("removed by fifty");
  });

  it("rejects answers after the grace window", () => {
    const room = roomWithBots(0, { answerGraceMs: 500 });
    engine.joinAsHuman(room, { name: "ฉัน" });
    engine.startGame(room, settings, 0);
    engine.tick(room, 3000);
    const end = room.phaseEndsAt;
    expect(() =>
      engine.submitAnswer(room, "me", 1, { choice: 0, wager: 0, tactic: null }, end + 600),
    ).toThrow();
    expect(() =>
      engine.submitAnswer(room, "me", 1, { choice: 0, wager: 0, tactic: null }, end + 400),
    ).not.toThrow();
  });

  it("hides the right choice when revealAnswer is off", () => {
    const room = roomWithBots(2);
    engine.startGame(room, { ...settings, revealAnswer: false }, 0);
    engine.skipPhase(room, 3000);
    engine.skipPhase(room, 4000);
    const view = engine.hostView(room, 4000);
    expect(view.state === "ROUND_RESULT" && view.correctChoice).toBeNull();
  });
});
