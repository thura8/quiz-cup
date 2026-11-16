import { useEffect, useState } from "react";

import type { QuizCupHostPlayer, QuizCupHostQuestion } from "@/types/quiz-cup";
import type { QuizCupRoomView } from "@/types/quiz-cup-room";
import type { RoomPlayer } from "@/types/room";

import { secondsBetween } from "./time";

const REVEAL_HOLD_MS = 800;

export type HostStage = {
  phase: "countdown" | "question" | "reveal";
  question: QuizCupHostQuestion;
  players: QuizCupHostPlayer[];
  endsAt?: string;
  durationSeconds: number;
  correctChoice?: number;
};

type RosterEntry = { id: string; name: string };

const rosterKey = (list: RosterEntry[]) => list.map((entry) => `${entry.id}\u0001${entry.name}`).join("\u0002");

function rosterOf(room: QuizCupRoomView | null, lobbyPlayers: RoomPlayer[]): RosterEntry[] | null {
  if (!room) return null;
  if (room.state === "LOBBY") return lobbyPlayers.map((player) => ({ id: player.id, name: player.name }));
  if ((room.state === "PLAYING" || room.state === "ROUND_RESULT") && "players" in room) {
    return room.players.map((player) => ({ id: player.playerId, name: player.name }));
  }
  return null;
}

export function useLastRoster(room: QuizCupRoomView | null, lobbyPlayers: RoomPlayer[]) {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const next = rosterOf(room, lobbyPlayers);
  if (next && next.length > 0 && rosterKey(next) !== rosterKey(roster)) setRoster(next);
  return next && next.length > 0 ? next : roster;
}

export function toHostStage(room: QuizCupRoomView, holding: boolean, roster: RosterEntry[]): HostStage | null {
  if (room.state === "PREPARING") {
    return {
      phase: "countdown",
      question: { ...room.question, question: "", choices: [] },
      players: roster.map((entry) => ({ id: entry.id, name: entry.name, answered: false })),
      endsAt: room.preparingEndsAt,
      durationSeconds: secondsBetween(
        room.preparingStartedAt,
        room.preparingEndsAt,
      ),
    };
  }
  if (room.state === "PLAYING" && "players" in room) {
    return {
      phase: "question",
      question: room.question,
      players: room.players.map((player) => ({
        id: player.playerId,
        name: player.name,
        answered: player.answered,
      })),
      endsAt: room.roundEndsAt,
      durationSeconds: room.roundDuration,
    };
  }
  if (room.state === "ROUND_RESULT" && "players" in room) {
    return {
      phase: holding ? "question" : "reveal",
      question: room.question,
      players: room.players.map((player) => ({
        id: player.playerId,
        name: player.name,
        answered: player.answered,
        ...(holding ? {} : { result: player.result, choice: player.choice }),
      })),
      durationSeconds: room.roundDuration,
      correctChoice: room.correctChoice ?? undefined,
    };
  }
  return null;
}

export function useRevealHold(room: QuizCupRoomView | null): boolean {
  const state = room?.state ?? null;
  const round = room && "round" in room ? room.round : null;
  const [previous, setPrevious] = useState<{
    state: string | null;
    round: number | null;
  }>({ state, round });
  const [holdRound, setHoldRound] = useState<number | null>(null);

  if (previous.state !== state || previous.round !== round) {
    if (
      state === "ROUND_RESULT" &&
      previous.state === "PLAYING" &&
      previous.round === round
    ) {
      setHoldRound(round);
    }
    setPrevious({ state, round });
  }

  useEffect(() => {
    if (holdRound == null) return;
    const timer = setTimeout(() => setHoldRound(null), REVEAL_HOLD_MS);
    return () => clearTimeout(timer);
  }, [holdRound]);

  return holdRound != null && holdRound === round;
}
