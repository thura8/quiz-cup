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

type LocalRound = {
  round: number;
  hiddenChoices?: number[];
  energy?: number;
  submitted?: QuizCupSubmittedAnswer;
};

export type MockRoomOptions = {
  botCount?: number;
  botJoinMs?: number;
  latencyMs?: number;
  pollMs?: number;
  engine?: Partial<engine.MockEngineOptions>;
};

const SELF_ID = "me";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function viewKey(view: QuizCupRoomView | null) {
  if (!view) return "";
  return JSON.stringify({ ...view, serverTime: undefined });
}

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
  const setStep = useQuizCupStore((state) => state.setStep);
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
    const mockRoom = roomRef.current;
    if (!mockRoom) return;
    engine.tick(mockRoom);
    const view =
      role === "host" || !mockRoom.players.some((player) => player.id === SELF_ID)
        ? engine.hostView(mockRoom)
        : engine.playerView(mockRoom, SELF_ID);
    const key = viewKey(view);
    if (key !== lastKey.current) {
      lastKey.current = key;
      setRoom(view);
    }
    const players = mockRoom.players.map(({ id, name, avatar, border, bgColor, connected }) => ({
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

  useEffect(() => {
    const mockRoom = engine.createMockRoom({
      options: {
        autoAdvanceMs: role === "player" ? 5000 : null,
        ...engineOptions,
      },
    });
    roomRef.current = mockRoom;
    lastKey.current = "";
    lastRosterKey.current = "";
    useQuizCupStore.getState().setStep(role === "host" ? "join" : "enter_room");
    publish();

    const loop = setInterval(publish, pollMs);
    const joiner = setInterval(() => {
      if (mockRoom.players.filter((player) => player.bot).length >= botCount) return;
      engine.addBot(mockRoom);
    }, botJoinMs);
    return () => {
      clearInterval(loop);
      clearInterval(joiner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, generation]);

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

  async function call<T>(fn: (mockRoom: engine.MockRoom) => T): Promise<T> {
    await delay(latencyMs);
    const mockRoom = roomRef.current;
    if (!mockRoom) throw new ApiError("Room not found", 404, "ROOM_NOT_FOUND");
    const result = fn(mockRoom);
    publish();
    return result;
  }

  const players: RoomPlayer[] = room?.state === "LOBBY" ? room.players : [];
  const playerDirectory: PlayerDirectory = Object.fromEntries(
    roster.map((player) => [
      player.id,
      { name: player.name, avatar: player.avatar, border: player.border, bgColor: player.bgColor },
    ]),
  );
  const selfPlayer: RoomPlayer | null =
    role === "player" ? (roster.find((player) => player.id === SELF_ID) ?? null) : null;

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
      const preset = AVATAR_COLORS.find((color) => color.avatarSrc === avatar?.src);
      await call((mockRoom) =>
        engine.joinAsHuman(mockRoom, {
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
      await call((mockRoom) => engine.startGame(mockRoom, settings));
    },
    async nextRoundAction() {
      await call((mockRoom) => engine.nextRound(mockRoom));
    },
    async submitAnswer(answer: QuizCupSubmittedAnswer) {
      if (room?.state !== "PLAYING") return;
      const at = room.round;
      await call((mockRoom) => engine.submitAnswer(mockRoom, SELF_ID, at, answer));
      setLocalRound((local) => ({
        ...(local?.round === at ? local : {}),
        round: at,
        submitted: answer,
      }));
    },
    async applyFifty() {
      if (room?.state !== "PLAYING") return;
      const at = room.round;
      const { hiddenChoices, energy } = await call((mockRoom) =>
        engine.requestFifty(mockRoom, SELF_ID, at),
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
      skip: () => {
        if (roomRef.current) engine.skipPhase(roomRef.current);
        publish();
      },
      startNow: () => {
        const mockRoom = roomRef.current;
        if (mockRoom?.state === "LOBBY") engine.startGame(mockRoom, mockRoom.settings);
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
        setGeneration((value) => value + 1);
      },
    },
  };
}

export type UseMockQuizCupRoomResult = ReturnType<typeof useMockQuizCupRoom>;
