import { AVATAR_COLORS } from "@/constants/avatar";
import {
  QUIZ_CUP_BASE_POINTS,
  QUIZ_CUP_DEFAULT_SETTINGS,
  QUIZ_CUP_MISS_PENALTY,
  quizCupStartingEnergy,
} from "@/constants/quiz-cup";
import { ApiError } from "@/lib/errors";
import type { QuizCupDifficultyId, QuizCupSettings, QuizCupTacticId } from "@/types/quiz-cup";
import type { QuizCupAnswerTactic, QuizCupSubmittedAnswer } from "@/types/quiz-cup-room";
import type { LeaderboardEntry } from "@/types/room";

import {
  DEFAULT_ENGINE_OPTIONS,
  type Bot,
  type EnginePlayer,
  type MockEngineOptions,
  type MockRoom,
  type PlannedBotAnswer,
  type PlayedQuestion,
  type RoundAnswer,
  type RoundOutcome,
  findPlayer,
  iso,
} from "./engine-model";
import { MOCK_BOT_NAMES } from "./players";
import { MOCK_QUESTIONS, type MockQuestion } from "./questions";

export { DEFAULT_ENGINE_OPTIONS, type MockEngineOptions, type MockRoom };

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


function conflict(message: string, code = "Conflict"): never {
  throw new ApiError(message, 409, code);
}

function rankPlayers(players: EnginePlayer[]): LeaderboardEntry[] {
  const sorted = [...players].sort(
    (a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name),
  );
  let rank = 0;
  return sorted.map((player, i) => {
    if (i === 0 || sorted[i - 1].totalScore !== player.totalScore) rank = i + 1;
    return { rank, playerId: player.id, name: player.name, totalScore: player.totalScore };
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

export function addBot(room: MockRoom): string | null {
  if (room.state !== "LOBBY") return null;
  if (room.players.length >= room.settings.maxPlayers) return null;
  const usedNames = new Set(room.players.map((player) => player.name));
  const name = MOCK_BOT_NAMES.find((candidate) => !usedNames.has(candidate));
  if (!name) return null;
  const id = `bot-${room.players.filter((player) => player.bot).length + 1}`;
  const bot = { skill: 0.35 + room.rand() * 0.5, pace: 0.25 + room.rand() * 0.6 };
  room.players.push(makePlayer(id, name, room.players.length, bot));
  return id;
}

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
  room.players = [player, ...room.players.filter((player) => player.id !== id)];
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
  for (const player of room.players) {
    player.energy = energy;
    player.totalScore = 0;
    player.rank = null;
    player.previousRank = null;
    player.results = [];
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
  room.energyAtRoundStart = Object.fromEntries(room.players.map((player) => [player.id, player.energy]));
  planBots(room, now);
}

const CHOICE_INDICES = [0, 1, 2, 3];
const BOT_SKIP_CHANCE = 0.08;
const BOT_CONFIDENCE_CHANCE = 0.6;
const BOT_TACTIC_CHANCE = 0.25;

function chooseBotWager(confident: boolean, rand: () => number) {
  if (confident) return rand() < 0.5 ? 20 : 10;
  return rand() < 0.2 ? 10 : 0;
}

function planBotAnswer(room: MockRoom, player: EnginePlayer, bot: Bot, now: number): PlannedBotAnswer {
  const question = room.questions[room.round - 1];
  const windowMs = room.settings.secondsPerQuestion * 1000;
  const knows = room.rand() < bot.skill;
  const wrongChoices = CHOICE_INDICES.filter((i) => i !== question.correct);
  const choice = knows ? question.correct : wrongChoices[Math.floor(room.rand() * wrongChoices.length)];
  const confident = knows && room.rand() < BOT_CONFIDENCE_CHANCE;
  const wager = chooseBotWager(confident, room.rand);
  let tactic: QuizCupAnswerTactic | null = null;
  if (player.energy > 0 && room.rand() < BOT_TACTIC_CHANCE) tactic = confident ? "double" : "shield";
  const jitter = (room.rand() - 0.5) * 0.3;
  const at = now + Math.max(0.12, Math.min(0.95, bot.pace + jitter)) * windowMs;
  return { at, answer: { choice, wager, tactic } };
}

function planBots(room: MockRoom, now: number) {
  for (const player of room.players) {
    if (!player.bot) continue;
    if (room.rand() < BOT_SKIP_CHANCE) continue;
    room.botPlan[player.id] = planBotAnswer(room, player, player.bot, now);
  }
}

function scoreAnswer(room: MockRoom, player: EnginePlayer, answer: RoundAnswer | undefined): RoundOutcome {
  const question = room.questions[room.round - 1];
  if (!answer) {
    return { result: "missed", roundScore: player.connected ? -QUIZ_CUP_MISS_PENALTY : 0, speedScore: 0 };
  }
  if (answer.choice === question.correct) {
    const windowMs = room.settings.secondsPerQuestion * 1000;
    const basePoints = (QUIZ_CUP_BASE_POINTS + answer.wager) * (answer.tactic === "double" ? 2 : 1);
    const timeLeftFraction = Math.max(0, room.phaseEndsAt - answer.submittedAt) / windowMs;
    const speedScore = room.settings.speedBonus ? Math.round(timeLeftFraction * room.options.speedBonusMax) : 0;
    return { result: "correct", roundScore: basePoints + speedScore, speedScore };
  }
  const loss = answer.tactic === "shield" ? 0 : QUIZ_CUP_MISS_PENALTY + answer.wager;
  return { result: "wrong", roundScore: -loss, speedScore: 0 };
}

function recordResult(room: MockRoom, player: EnginePlayer, answer: RoundAnswer | undefined, outcome: RoundOutcome) {
  const usedFifty = (room.fifty[player.id]?.length ?? 0) > 0;
  player.results.push({
    correct: outcome.result === "missed" ? null : outcome.result === "correct",
    wager: answer?.wager ?? 0,
    tactic: (answer?.tactic ?? (usedFifty ? "fifty" : null)) as QuizCupTacticId | null,
  });
}

function updateRanks(room: MockRoom) {
  room.leaderboard = rankPlayers(room.players);
  for (const player of room.players) {
    const newRank = room.leaderboard.find((entry) => entry.playerId === player.id)!.rank;
    player.previousRank = player.rank ?? newRank;
    player.rank = newRank;
  }
}

function revealRound(room: MockRoom, now: number) {
  for (const player of room.players) {
    const answer = room.answers[player.id];
    const outcome = scoreAnswer(room, player, answer);
    room.outcomes[player.id] = outcome;
    player.totalScore += outcome.roundScore;
    recordResult(room, player, answer, outcome);
  }
  updateRanks(room);
  room.state = "ROUND_RESULT";
  room.phaseStartedAt = now;
  room.phaseEndsAt = room.options.autoAdvanceMs != null ? now + room.options.autoAdvanceMs : Infinity;
}

function submitDueBotAnswers(room: MockRoom, now: number) {
  for (const [id, plan] of Object.entries(room.botPlan)) {
    if (!room.options.botsAnswer || now < plan.at || room.answers[id]) continue;
    const bot = room.players.find((player) => player.id === id);
    if (!bot) continue;
    const tactic = plan.answer.tactic && bot.energy > 0 ? plan.answer.tactic : null;
    if (tactic) bot.energy -= 1;
    room.answers[id] = { ...plan.answer, tactic, submittedAt: now };
  }
}

export function tick(room: MockRoom, now = Date.now()) {
  if (room.state === "PREPARING" && now >= room.phaseEndsAt) enterPlaying(room, now);

  if (room.state === "PLAYING") {
    submitDueBotAnswers(room, now);
    const everyoneAnswered = room.players
      .filter((player) => player.connected)
      .every((player) => room.answers[player.id]);
    if (everyoneAnswered || now >= room.phaseEndsAt) revealRound(room, Math.min(now, room.phaseEndsAt));
  }

  if (room.state === "ROUND_RESULT" && now >= room.phaseEndsAt) nextRound(room, now);
}

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

export function skipPhase(room: MockRoom, now = Date.now()) {
  if (room.state === "PREPARING") enterPlaying(room, now);
  else if (room.state === "PLAYING") revealRound(room, now);
  else if (room.state === "ROUND_RESULT") nextRound(room, now);
}

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
  const question = room.questions[round - 1];
  const removed = shuffle(CHOICE_INDICES.filter((i) => i !== question.correct), room.rand).slice(0, 2);
  player.energy -= 1;
  room.fifty[playerId] = removed.sort();
  return { hiddenChoices: room.fifty[playerId], energy: player.energy };
}

export function setConnected(room: MockRoom, playerId: string, connected: boolean) {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (player) player.connected = connected;
}

export { hostView, playerView } from "./engine-views";
