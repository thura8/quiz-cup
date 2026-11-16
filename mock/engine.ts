/**
 * In-browser stand-in for the Quiz Cup backend.
 *
 * It runs the same room state machine (LOBBY → PREPARING → PLAYING →
 * ROUND_RESULT → … → FINISHED), applies the same scoring rules as
 * constants/quiz-cup.ts, and builds the exact view shapes in
 * types/quiz-cup-room.ts, so the UI components run unchanged.
 *
 * Everything here is plain data + pure-ish functions over a mutable
 * `MockRoom`; React wiring lives in hooks/quiz-cup/useMockQuizCupRoom.ts.
 */
import { AVATAR_COLORS } from "@/constants/avatar";
import {
  QUIZ_CUP_BASE_POINTS,
  QUIZ_CUP_DEFAULT_SETTINGS,
  QUIZ_CUP_MISS_PENALTY,
  quizCupStartingEnergy,
} from "@/constants/quiz-cup";
import { ApiError } from "@/lib/errors";
import type {
  QuizCupDifficultyId,
  QuizCupQuestionResult,
  QuizCupSettings,
  QuizCupTacticId,
} from "@/types/quiz-cup";
import type {
  QuizCupAnswerTactic,
  QuizCupHostRoomView,
  QuizCupPlayerRoomView,
  QuizCupQuestionView,
  QuizCupRoundOutcome,
  QuizCupSubmittedAnswer,
} from "@/types/quiz-cup-room";
import type { LeaderboardEntry, RoomPlayer, RoomState } from "@/types/room";
import { MOCK_BOT_NAMES } from "./players";
import { MOCK_QUESTIONS, type MockQuestion } from "./questions";

// --- Tunables ----------------------------------------------------------------------------

export type MockEngineOptions = {
  /** Seconds of 3-2-1 before each question. */
  preparingSeconds: number;
  /** Server-side grace after roundEndsAt for answers already in flight. */
  answerGraceMs: number;
  /** Max points from answering fast (only when settings.speedBonus is on). */
  speedBonusMax: number;
  /** ROUND_RESULT moves on by itself after this long; null waits for the host. */
  autoAdvanceMs: number | null;
  /** Bots answer at all (turn off to watch the timer run out). */
  botsAnswer: boolean;
};

export const DEFAULT_ENGINE_OPTIONS: MockEngineOptions = {
  preparingSeconds: 3,
  answerGraceMs: 500,
  speedBonusMax: 5,
  autoAdvanceMs: null,
  botsAnswer: true,
};

// --- State -------------------------------------------------------------------------------

type Bot = {
  /** 0–1: chance of knowing the answer. */
  skill: number;
  /** 0–1 of the answering window by which they've usually answered. */
  pace: number;
};

type EnginePlayer = RoomPlayer & {
  bot: Bot | null;
  energy: number;
  totalScore: number;
  /** Rank after the previous revealed question; null before any reveal. */
  rank: number | null;
  previousRank: number | null;
  results: QuizCupQuestionResult[];
};

type RoundAnswer = QuizCupSubmittedAnswer & { submittedAt: number };

type RoundOutcome = {
  result: QuizCupRoundOutcome;
  roundScore: number;
  speedScore: number;
};

type PlannedBotAnswer = { at: number; answer: QuizCupSubmittedAnswer };

type PlayedQuestion = MockQuestion & {
  /** Choices in display order, and where the right one landed. */
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
  /** Energy each player had when the current question began. */
  energyAtRoundStart: Record<string, number>;
  outcomes: Record<string, RoundOutcome>;
  botPlan: Record<string, PlannedBotAnswer>;
  leaderboard: LeaderboardEntry[];
  /** Deterministic RNG so a reload with the same seed replays the same game. */
  rand: () => number;
};

// --- Helpers -----------------------------------------------------------------------------

/** mulberry32: tiny seeded PRNG. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const iso = (ms: number) => new Date(ms).toISOString();

function conflict(message: string, code = "Conflict"): never {
  throw new ApiError(message, 409, code);
}

function findPlayer(room: MockRoom, playerId: string): EnginePlayer {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new ApiError("Player not found", 404, "INVALID_PLAYER");
  return player;
}

function rankPlayers(players: EnginePlayer[]): LeaderboardEntry[] {
  const sorted = [...players].sort(
    (a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name),
  );
  let rank = 0;
  return sorted.map((p, i) => {
    if (i === 0 || sorted[i - 1].totalScore !== p.totalScore) rank = i + 1;
    return { rank, playerId: p.id, name: p.name, totalScore: p.totalScore };
  });
}

function makePlayer(
  id: string,
  name: string,
  index: number,
  bot: Bot | null,
): EnginePlayer {
  const look = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return {
    id,
    name,
    avatar: look.avatarSrc,
    border: look.borderColor,
    bgColor: look.avatarBg,
    connected: true,
    bot,
    energy: 0,
    totalScore: 0,
    rank: null,
    previousRank: null,
    results: [],
  };
}

// --- Room lifecycle ----------------------------------------------------------------------

export function createMockRoom({
  roomId = "QC" + Math.floor(1000 + Math.random() * 9000),
  seed = Date.now(),
  options = {},
}: {
  roomId?: string;
  seed?: number;
  options?: Partial<MockEngineOptions>;
} = {}): MockRoom {
  const now = Date.now();
  return {
    roomId,
    state: "LOBBY",
    settings: { ...QUIZ_CUP_DEFAULT_SETTINGS },
    options: { ...DEFAULT_ENGINE_OPTIONS, ...options },
    players: [],
    questions: [],
    round: 0,
    phaseStartedAt: now,
    phaseEndsAt: now,
    answers: {},
    fifty: {},
    energyAtRoundStart: {},
    outcomes: {},
    botPlan: {},
    leaderboard: [],
    rand: seededRandom(seed),
  };
}

/** Adds one bot with a random skill; returns its id, or null once the bot names run out. */
export function addBot(room: MockRoom): string | null {
  if (room.state !== "LOBBY") return null;
  if (room.players.length >= room.settings.maxPlayers) return null;
  const used = new Set(room.players.map((p) => p.name));
  const name = MOCK_BOT_NAMES.find((n) => !used.has(n));
  if (!name) return null;
  // Stable ids (bot-1, bot-2, …) so mock emoji reactions can target them.
  const id = `bot-${room.players.filter((p) => p.bot).length + 1}`;
  const bot = { skill: 0.35 + room.rand() * 0.5, pace: 0.25 + room.rand() * 0.6 };
  room.players.push(makePlayer(id, name, room.players.length, bot));
  return id;
}

/** The human on this device joining as a player. */
export function joinAsHuman(
  room: MockRoom,
  { name, avatar, bgColor, border }: { name: string; avatar?: string; bgColor?: string; border?: string },
): string {
  if (room.state !== "LOBBY") throw new ApiError("Game already started", 409, "GAME_ALREADY_STARTED");
  if (room.players.length >= room.settings.maxPlayers) throw new ApiError("Room is full", 409, "ROOM_FULL");
  const id = "me";
  const player = makePlayer(id, name, room.players.length, null);
  if (avatar) player.avatar = avatar;
  if (bgColor) player.bgColor = bgColor;
  if (border) player.border = border;
  room.players = [player, ...room.players.filter((p) => p.id !== id)];
  return id;
}

function pickQuestions(room: MockRoom, settings: QuizCupSettings): PlayedQuestion[] {
  const categories =
    settings.source === "all"
      ? null
      : settings.source === "general"
        ? new Set(["general"])
        : new Set(settings.categories);
  const pool = MOCK_QUESTIONS.filter((q) => !categories || categories.has(q.category));
  if (pool.length === 0) {
    throw new ApiError("Not enough questions for these settings", 422, "ValidationErrorQuestions");
  }

  const byLevel = (level: QuizCupDifficultyId) => pool.filter((q) => q.difficulty === level);
  const levels: QuizCupDifficultyId[] = ["easy", "medium", "hard"];
  const picked: MockQuestion[] = [];
  for (let i = 0; i < settings.questionCount; i++) {
    const level =
      settings.difficulty === "random" ? levels[i % 3] : settings.difficulty;
    // Prefer the asked level; the mock bank is small, so fall back to anything
    // in the chosen categories and repeat once it runs dry.
    const fresh = byLevel(level).filter((q) => !picked.includes(q));
    const anyFresh = pool.filter((q) => !picked.includes(q));
    const from = fresh.length ? fresh : anyFresh.length ? anyFresh : pool;
    picked.push(from[Math.floor(room.rand() * from.length)]);
  }

  return shuffle(picked, room.rand).map((q) => {
    const order = settings.shuffleChoices ? shuffle([0, 1, 2, 3], room.rand) : [0, 1, 2, 3];
    return { ...q, shown: order.map((i) => q.choices[i]), correct: order.indexOf(q.answer) };
  });
}

export function startGame(room: MockRoom, settings: QuizCupSettings, now = Date.now()) {
  if (room.state !== "LOBBY") conflict("Game already started");
  if (room.players.length === 0) conflict("No players in the room");
  room.settings = { ...settings };
  room.questions = pickQuestions(room, settings);
  const energy = quizCupStartingEnergy(settings.questionCount);
  for (const p of room.players) {
    p.energy = energy;
    p.totalScore = 0;
    p.rank = null;
    p.previousRank = null;
    p.results = [];
  }
  enterPreparing(room, 1, now);
}

function enterPreparing(room: MockRoom, round: number, now: number) {
  room.state = "PREPARING";
  room.round = round;
  room.phaseStartedAt = now;
  room.phaseEndsAt = now + room.options.preparingSeconds * 1000;
  room.answers = {};
  room.fifty = {};
  room.outcomes = {};
  room.botPlan = {};
}

function enterPlaying(room: MockRoom, now: number) {
  room.state = "PLAYING";
  room.phaseStartedAt = now;
  room.phaseEndsAt = now + room.settings.secondsPerQuestion * 1000;
  room.energyAtRoundStart = Object.fromEntries(room.players.map((p) => [p.id, p.energy]));
  planBots(room, now);
}

function planBots(room: MockRoom, now: number) {
  const q = room.questions[room.round - 1];
  const windowMs = room.settings.secondsPerQuestion * 1000;
  for (const p of room.players) {
    if (!p.bot) continue;
    // ~8% of the time a bot just doesn't answer.
    if (room.rand() < 0.08) continue;
    const knows = room.rand() < p.bot.skill;
    const wrong = [0, 1, 2, 3].filter((i) => i !== q.correct);
    const choice = knows ? q.correct : wrong[Math.floor(room.rand() * wrong.length)];
    const confident = knows && room.rand() < 0.6;
    const wager = confident ? (room.rand() < 0.5 ? 20 : 10) : room.rand() < 0.2 ? 10 : 0;
    let tactic: QuizCupAnswerTactic | null = null;
    if (p.energy > 0 && room.rand() < 0.25) tactic = confident ? "double" : "shield";
    const jitter = (room.rand() - 0.5) * 0.3;
    const at = now + Math.max(0.12, Math.min(0.95, p.bot.pace + jitter)) * windowMs;
    room.botPlan[p.id] = { at, answer: { choice, wager, tactic } };
  }
}

function revealRound(room: MockRoom, now: number) {
  const q = room.questions[room.round - 1];
  const windowMs = room.settings.secondsPerQuestion * 1000;
  for (const p of room.players) {
    const a = room.answers[p.id];
    const usedFifty = (room.fifty[p.id]?.length ?? 0) > 0;
    let outcome: RoundOutcome;
    if (!a) {
      outcome = { result: "missed", roundScore: p.connected ? -QUIZ_CUP_MISS_PENALTY : 0, speedScore: 0 };
    } else if (a.choice === q.correct) {
      const base = (QUIZ_CUP_BASE_POINTS + a.wager) * (a.tactic === "double" ? 2 : 1);
      const left = Math.max(0, room.phaseEndsAt - a.submittedAt) / windowMs;
      const speed = room.settings.speedBonus ? Math.round(left * room.options.speedBonusMax) : 0;
      outcome = { result: "correct", roundScore: base + speed, speedScore: speed };
    } else {
      const loss = a.tactic === "shield" ? 0 : QUIZ_CUP_MISS_PENALTY + a.wager;
      outcome = { result: "wrong", roundScore: -loss, speedScore: 0 };
    }
    room.outcomes[p.id] = outcome;
    p.totalScore += outcome.roundScore;
    p.results.push({
      correct: outcome.result === "missed" ? null : outcome.result === "correct",
      wager: a?.wager ?? 0,
      tactic: (a?.tactic ?? (usedFifty ? "fifty" : null)) as QuizCupTacticId | null,
    });
  }
  room.leaderboard = rankPlayers(room.players);
  for (const p of room.players) {
    p.previousRank = p.rank ?? room.leaderboard.find((e) => e.playerId === p.id)!.rank;
    p.rank = room.leaderboard.find((e) => e.playerId === p.id)!.rank;
  }
  room.state = "ROUND_RESULT";
  room.phaseStartedAt = now;
  room.phaseEndsAt = room.options.autoAdvanceMs != null ? now + room.options.autoAdvanceMs : Infinity;
}

/** Advances timers and lets bots act. Call it often (the hook does every 200 ms). */
export function tick(room: MockRoom, now = Date.now()) {
  if (room.state === "PREPARING" && now >= room.phaseEndsAt) enterPlaying(room, now);

  if (room.state === "PLAYING") {
    for (const [id, plan] of Object.entries(room.botPlan)) {
      if (!room.options.botsAnswer || now < plan.at || room.answers[id]) continue;
      const bot = room.players.find((p) => p.id === id);
      if (!bot) continue;
      const tactic = plan.answer.tactic && bot.energy > 0 ? plan.answer.tactic : null;
      if (tactic) bot.energy -= 1;
      room.answers[id] = { ...plan.answer, tactic, submittedAt: now };
    }
    const everyone = room.players.filter((p) => p.connected).every((p) => room.answers[p.id]);
    if (everyone || now >= room.phaseEndsAt) revealRound(room, Math.min(now, room.phaseEndsAt));
  }

  if (room.state === "ROUND_RESULT" && now >= room.phaseEndsAt) nextRound(room, now);
}

/** Host's "next": next question, or the final scores after the last. */
export function nextRound(room: MockRoom, now = Date.now()) {
  if (room.state !== "ROUND_RESULT") conflict("Not in round result");
  if (room.round >= room.questions.length) {
    room.state = "FINISHED";
    room.phaseStartedAt = now;
    room.phaseEndsAt = Infinity;
    return;
  }
  enterPreparing(room, room.round + 1, now);
}

/** Dev shortcut: end whatever is on a timer right now. */
export function skipPhase(room: MockRoom, now = Date.now()) {
  if (room.state === "PREPARING") enterPlaying(room, now);
  else if (room.state === "PLAYING") revealRound(room, now);
  else if (room.state === "ROUND_RESULT") nextRound(room, now);
}

// --- Player actions ----------------------------------------------------------------------

export function submitAnswer(
  room: MockRoom,
  playerId: string,
  round: number,
  answer: QuizCupSubmittedAnswer,
  now = Date.now(),
) {
  if (room.state !== "PLAYING" || room.round !== round) {
    throw new ApiError("Round not active", 409, room.round === round ? "ROUND_EXPIRED" : "INVALID_ROUND");
  }
  if (now > room.phaseEndsAt + room.options.answerGraceMs) {
    throw new ApiError("Round expired", 409, "ROUND_EXPIRED");
  }
  if (room.answers[playerId]) throw new ApiError("Already submitted", 409, "ALREADY_SUBMITTED");
  const player = findPlayer(room, playerId);
  const hidden = room.fifty[playerId] ?? [];
  if (hidden.includes(answer.choice)) conflict("That choice was removed by fifty");
  if (answer.tactic && hidden.length > 0) {
    conflict("Only one tactic per question: fifty was already used");
  }
  if (answer.tactic) {
    if (player.energy < 1) conflict("Not enough energy");
    player.energy -= 1;
  }
  room.answers[playerId] = { ...answer, submittedAt: now };
  return { round, submittedAt: iso(now) };
}

export function requestFifty(room: MockRoom, playerId: string, round: number) {
  if (room.state !== "PLAYING" || room.round !== round) {
    throw new ApiError("Round not active", 409, "ROUND_NOT_ACTIVE");
  }
  const player = findPlayer(room, playerId);
  const already = room.fifty[playerId];
  if (already) return { hiddenChoices: already, energy: player.energy };
  if (room.answers[playerId]) throw new ApiError("Already submitted", 409, "ALREADY_SUBMITTED");
  if (player.energy < 1) conflict("Not enough energy");
  const q = room.questions[round - 1];
  const wrong = shuffle([0, 1, 2, 3].filter((i) => i !== q.correct), room.rand).slice(0, 2);
  player.energy -= 1;
  room.fifty[playerId] = wrong.sort();
  return { hiddenChoices: room.fifty[playerId], energy: player.energy };
}

export function setConnected(room: MockRoom, playerId: string, connected: boolean) {
  const p = room.players.find((x) => x.id === playerId);
  if (p) p.connected = connected;
}

// --- Views (what GET /rooms/:id would return) --------------------------------------------

function base(room: MockRoom, now: number) {
  return {
    roomId: room.roomId,
    maxPlayers: room.settings.maxPlayers,
    totalRounds: room.questions.length || room.settings.questionCount,
    roundDuration: room.settings.secondsPerQuestion,
    serverTime: iso(now),
  };
}

function questionView(room: MockRoom): QuizCupQuestionView {
  const q = room.questions[room.round - 1];
  return {
    round: room.round,
    totalRounds: room.questions.length,
    category: q.category,
    difficulty: q.difficulty,
    question: q.question,
    choices: q.shown,
  };
}

function lobbyPlayers(room: MockRoom): RoomPlayer[] {
  return room.players.map(({ id, name, avatar, border, bgColor, connected }) => ({
    id,
    name,
    avatar,
    border,
    bgColor,
    connected,
  }));
}

function correctChoice(room: MockRoom) {
  return room.settings.revealAnswer ? room.questions[room.round - 1].correct : null;
}

export function hostView(room: MockRoom, now = Date.now()): QuizCupHostRoomView {
  const b = base(room, now);
  switch (room.state) {
    case "LOBBY":
      return { ...b, state: "LOBBY", players: lobbyPlayers(room) };
    case "PREPARING": {
      const q = questionView(room);
      return {
        ...b,
        state: "PREPARING",
        round: room.round,
        preparingStartedAt: iso(room.phaseStartedAt),
        preparingEndsAt: iso(room.phaseEndsAt),
        question: { round: q.round, totalRounds: q.totalRounds, category: q.category, difficulty: q.difficulty },
      };
    }
    case "PLAYING":
      return {
        ...b,
        state: "PLAYING",
        round: room.round,
        roundStartedAt: iso(room.phaseStartedAt),
        roundEndsAt: iso(room.phaseEndsAt),
        question: questionView(room),
        players: room.players.map((p) => ({
          playerId: p.id,
          name: p.name,
          connected: p.connected,
          answered: Boolean(room.answers[p.id]),
        })),
      };
    case "ROUND_RESULT":
      return {
        ...b,
        state: "ROUND_RESULT",
        round: room.round,
        question: questionView(room),
        correctChoice: correctChoice(room),
        isLastRound: room.round >= room.questions.length,
        players: room.players.map((p) => {
          const o = room.outcomes[p.id];
          return {
            playerId: p.id,
            name: p.name,
            answered: Boolean(room.answers[p.id]),
            choice: room.answers[p.id]?.choice ?? null,
            result: o.result,
            roundScore: o.roundScore,
            speedScore: o.speedScore,
            totalScore: p.totalScore,
          };
        }),
        leaderboard: room.leaderboard,
      };
    case "FINISHED":
      return { ...b, state: "FINISHED", leaderboard: room.leaderboard };
  }
}

export function playerView(room: MockRoom, playerId: string, now = Date.now()): QuizCupPlayerRoomView {
  const b = base(room, now);
  const p = findPlayer(room, playerId);
  const standing = {
    energy: room.state === "PLAYING" ? (room.energyAtRoundStart[p.id] ?? p.energy) : p.energy,
    maxEnergy: quizCupStartingEnergy(room.settings.questionCount),
    myScore: p.totalScore,
    myRank: p.rank,
  };
  switch (room.state) {
    case "LOBBY":
      return { ...b, state: "LOBBY", players: lobbyPlayers(room) };
    case "PREPARING": {
      const h = hostView(room, now);
      if (h.state !== "PREPARING") throw new Error("unreachable");
      return { ...h, ...standing };
    }
    case "PLAYING": {
      const a = room.answers[p.id];
      return {
        ...b,
        ...standing,
        state: "PLAYING",
        round: room.round,
        roundStartedAt: iso(room.phaseStartedAt),
        roundEndsAt: iso(room.phaseEndsAt),
        question: questionView(room),
        hiddenChoices: room.fifty[p.id] ?? [],
        submitted: a ? { choice: a.choice, wager: a.wager, tactic: a.tactic } : null,
      };
    }
    case "ROUND_RESULT": {
      const a = room.answers[p.id];
      const o = room.outcomes[p.id];
      return {
        ...b,
        state: "ROUND_RESULT",
        round: room.round,
        question: questionView(room),
        correctChoice: correctChoice(room),
        isLastRound: room.round >= room.questions.length,
        myAnswer: a ? { choice: a.choice, wager: a.wager, tactic: a.tactic } : null,
        myResult: o.result,
        myRoundScore: o.roundScore,
        mySpeedScore: o.speedScore,
        myTotalScore: p.totalScore,
        myTotalRank: p.rank ?? 1,
        myPreviousRank: p.previousRank ?? p.rank ?? 1,
      };
    }
    case "FINISHED":
      return {
        ...b,
        state: "FINISHED",
        myTotalScore: p.totalScore,
        myTotalRank: p.rank ?? 1,
        leaderboard: room.leaderboard,
        results: p.results,
      };
  }
}
