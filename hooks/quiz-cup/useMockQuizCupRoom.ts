"use client";

import { AVATAR_COLORS } from "@/constants/avatar";
import { ApiError } from "@/lib/errors";
import type { SelectedAvatar } from "@/lib/rooms/guest";
import * as engine from "@/mock/engine";
import { useQuizCupStore } from "@/stores/QuizCupStore";
import type { QuizCupSettings } from "@/types/quiz-cup";
import type {
  QuizCupRoomView,
  QuizCupSubmittedAnswer,
} from "@/types/quiz-cup-room";
import type { PlayerDirectory, RoomPlayer } from "@/types/room";
import { useCallback, useEffect, useRef, useState } from "react";

export type QuizCupRoomRole = "host" | "player";

/** What this phone did in the current question before the next "poll" confirms it. */
type LocalRound = {
  round: number;
  hiddenChoices?: number[];
  energy?: number;
  submitted?: QuizCupSubmittedAnswer;
};

export type MockRoomOptions = {
  /** Bots that join the lobby, one every `botJoinMs`. */
  botCount?: number;
  botJoinMs?: number;
  /** Simulated request round-trip, so loading states show. */
  latencyMs?: number;
  /** How often the view is rebuilt (the real app polls every 1 s while playing). */
  pollMs?: number;
  engine?: Partial<engine.MockEngineOptions>;
};

const SELF_ID = "me";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** View equality without the always-changing server clock. */
function viewKey(view: QuizCupRoomView | null) {
  if (!view) return "";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { serverTime, ...rest } = view;
  return JSON.stringify(rest);
}

/**
 * Same surface as dd-join-joy-frontend's useQuizCupRoom, backed by the
 * in-browser mock engine instead of the /rooms API. Extra `dev` controls
 * drive the mock (skip a phase, restart, toggle bots).
 */
export function useMockQuizCupRoom(
  role: QuizCupRoomRole,
  {
    botCount = role === "host" ? 8 : 5,
    botJoinMs = 1200,
    latencyMs = 150,
    pollMs = 250,
    engine: engineOptions,
  }: MockRoomOptions = {},
) {
  const setStep = useQuizCupStore((s) => s.setStep);
  const roomRef = useRef<engine.MockRoom | null>(null);
  const [generation, setGeneration] = useState(0);
  const [room, setRoom] = useState<QuizCupRoomView | null>(null);
  const [joined, setJoined] = useState(role === "host");
  const [localRound, setLocalRound] = useState<LocalRound | null>(null);
  const [botsAnswer, setBotsAnswer] = useState(true);
  const [roster, setRoster] = useState<RoomPlayer[]>([]);
  const lastKey = useRef("");
  const lastRosterKey = useRef("");

  const publish = useCallback(() => {
    const r = roomRef.current;
    if (!r) return;
    engine.tick(r);
    const view =
      role === "host" || !r.players.some((p) => p.id === SELF_ID)
        ? engine.hostView(r)
        : engine.playerView(r, SELF_ID);
    const key = viewKey(view);
    if (key !== lastKey.current) {
      lastKey.current = key;
      setRoom(view);
    }
    const players = r.players.map(({ id, name, avatar, border, bgColor, connected }) => ({
      id,
      name,
      avatar,
      border,
      bgColor,
      connected,
    }));
    const rosterKey = JSON.stringify(players);
    if (rosterKey !== lastRosterKey.current) {
      lastRosterKey.current = rosterKey;
      setRoster(players);
    }
  }, [role]);

  // (Re)create the room and run the "server" loop.
  useEffect(() => {
    const r = engine.createMockRoom({
      options: {
        // No host on a player-only demo, so results move on by themselves.
        autoAdvanceMs: role === "player" ? 5000 : null,
        ...engineOptions,
      },
    });
    roomRef.current = r;
    lastKey.current = "";
    lastRosterKey.current = "";
    useQuizCupStore.getState().setStep(role === "host" ? "join" : "enter_room");
    publish();

    const loop = setInterval(publish, pollMs);
    const joiner = setInterval(() => {
      if (r.players.filter((p) => p.bot).length >= botCount) return;
      engine.addBot(r);
    }, botJoinMs);
    return () => {
      clearInterval(loop);
      clearInterval(joiner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, generation]);

  // Server state → screen, as in the real hook.
  useEffect(() => {
    if (!room) return;
    if (room.state === "LOBBY") {
      if (role === "player") {
        setStep(joined ? "waiting_room" : "enter_room");
        return;
      }
      if (useQuizCupStore.getState().step === "settings") return;
      setStep("join");
      return;
    }
    if (room.state === "FINISHED") {
      setStep(role === "host" ? "end_game" : "answer");
      return;
    }
    setStep(role === "host" ? "host_stage" : "answer");
  }, [room, role, joined, setStep]);

  async function call<T>(fn: (r: engine.MockRoom) => T): Promise<T> {
    await delay(latencyMs);
    const r = roomRef.current;
    if (!r) throw new ApiError("Room not found", 404, "ROOM_NOT_FOUND");
    const out = fn(r);
    publish();
    return out;
  }

  const players: RoomPlayer[] = room?.state === "LOBBY" ? room.players : [];
  // Unlike the real hook, the directory survives past the lobby (see the review's reload note).
  const playerDirectory: PlayerDirectory = Object.fromEntries(
    roster.map((p) => [
      p.id,
      { name: p.name, avatar: p.avatar, border: p.border, bgColor: p.bgColor },
    ]),
  );
  const selfPlayer: RoomPlayer | null =
    role === "player" ? (roster.find((p) => p.id === SELF_ID) ?? null) : null;

  const round = room && "round" in room ? room.round : null;
  const roomId = room?.roomId ?? "";

  return {
    role,
    room,
    players,
    playerDirectory,
    joinUrl: roomId ? `https://example.com/join/${roomId}` : null,
    selfPlayer,
    selfId: role === "player" ? SELF_ID : undefined,
    error: null as ApiError | null,
    localRound: localRound && localRound.round === round ? localRound : null,

    async joinAsPlayer(name: string, avatar: SelectedAvatar | null) {
      const preset = AVATAR_COLORS.find((a) => a.avatarSrc === avatar?.src);
      await call((r) =>
        engine.joinAsHuman(r, {
          name: name.trim() || "ฉัน",
          avatar: avatar?.src,
          bgColor: avatar?.type === "preset" ? avatar.bg : preset?.avatarBg,
          border: preset?.borderColor,
        }),
      );
      setJoined(true);
    },
    async closeRoom() {},
    async leaveRoom() {},
    async startGame(settings: QuizCupSettings) {
      await call((r) => engine.startGame(r, settings));
    },
    async nextRoundAction() {
      await call((r) => engine.nextRound(r));
    },
    async submitAnswer(answer: QuizCupSubmittedAnswer) {
      if (room?.state !== "PLAYING") return;
      const at = room.round;
      await call((r) => engine.submitAnswer(r, SELF_ID, at, answer));
      setLocalRound((local) => ({
        ...(local?.round === at ? local : {}),
        round: at,
        submitted: answer,
      }));
    },
    async applyFifty() {
      if (room?.state !== "PLAYING") return;
      const at = room.round;
      const { hiddenChoices, energy } = await call((r) =>
        engine.requestFifty(r, SELF_ID, at),
      );
      setLocalRound((local) => ({
        ...(local?.round === at ? local : {}),
        round: at,
        hiddenChoices,
        energy,
      }));
    },
    async sendEmoji(emoji: number) {
      void emoji;
      await delay(latencyMs);
    },

    dev: {
      roomId,
      state: room?.state ?? null,
      botsAnswer,
      /** End the current timer now (countdown, question or result). */
      skip: () => {
        if (roomRef.current) engine.skipPhase(roomRef.current);
        publish();
      },
      /** Player demo: the room starts without a host. */
      startNow: () => {
        const r = roomRef.current;
        if (r?.state === "LOBBY") engine.startGame(r, r.settings);
        publish();
      },
      addBot: () => {
        if (roomRef.current) engine.addBot(roomRef.current);
        publish();
      },
      setBotsAnswer: (on: boolean) => {
        setBotsAnswer(on);
        if (roomRef.current) roomRef.current.options.botsAnswer = on;
      },
      restart: () => {
        setJoined(role === "host");
        setLocalRound(null);
        setGeneration((g) => g + 1);
      },
    },
  };
}

export type UseMockQuizCupRoomResult = ReturnType<typeof useMockQuizCupRoom>;
