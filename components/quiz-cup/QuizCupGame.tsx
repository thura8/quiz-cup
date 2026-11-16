"use client";

import { AVATAR_COLORS } from "@/constants/avatar";
import { QUIZ_CUP_BACKGROUND, QUIZ_CUP_LOGO } from "@/constants/quiz-cup";
import { useOnlineStatus } from "@/hooks/shared/useOnlineStatus";
import {
  useMockQuizCupRoom,
  type MockRoomOptions,
  type QuizCupRoomRole,
} from "@/hooks/quiz-cup/useMockQuizCupRoom";
import { ApiError } from "@/lib/errors";
import { isBenignConflict, mapErrorMessage } from "@/lib/rooms/error-messages";
import {
  toFloatingAvatarPlayer,
  toFloatingAvatarPlayers,
} from "@/lib/rooms/player-avatar";
import { getMockEmojiReactions } from "@/mock/emoji-reactions";
import { useQuizCupStore } from "@/stores/QuizCupStore";
import type { QuizCupHostPlayer, QuizCupHostQuestion } from "@/types/quiz-cup";
import type { RoomPlayer } from "@/types/room";
import type {
  QuizCupPlayingPlayerView,
  QuizCupRoomView,
} from "@/types/quiz-cup-room";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import EnterRoom from "../common/EnterRoom";
import GameEndGame from "../common/GameEndGame";
import GameWaitingRoom from "../common/GameWaitingRoom";
import JoinRoom from "../common/JoinRoom";
import Loading from "../common/Loading";
import RoomStatusScreen from "../common/RoomStatusScreen";
import MockDevToolbar from "../dev/MockDevToolbar";
import QuizCupAnswering, { type QuizCupAnswer } from "./QuizCupAnswering";
import QuizCupAnswerResult from "./QuizCupAnswerResult";
import QuizCupBackground from "./QuizCupBackground";
import QuizCupPlayerSummary from "./QuizCupPlayerSummary";
import QuizCupRoundIntro from "./QuizCupRoundIntro";
import QuizCupSetting from "./QuizCupSetting";
import QuizCupHostStage from "./host/QuizCupHostStage";

/** Lets the last answer's "lock" sound play before the host screen reveals. */
const REVEAL_HOLD_MS = 800;

/** Backend messages that read better in Thai than the generic fallback. */
const QUIZ_CUP_MESSAGES: Record<string, string> = {
  "Not enough energy": "พลังงานไม่พอ",
  "Not enough questions for these settings":
    "คำถามในคลังไม่พอสำหรับการตั้งค่านี้ ลองลดจำนวนข้อ หรือเปลี่ยนหมวด / ความยาก",
  "Only one tactic per question: fifty was already used":
    "ข้อนี้ใช้ตัดตัวเลือกไปแล้ว ใช้ Tactic อื่นเพิ่มไม่ได้",
  "That choice was removed by fifty": "ตัวเลือกนี้ถูกตัดออกไปแล้ว",
};

function quizCupErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return mapErrorMessage("UNKNOWN");
  if (error.code === "ALREADY_SUBMITTED") return "ส่งคำตอบข้อนี้ไปแล้ว";
  return QUIZ_CUP_MESSAGES[error.message] ?? mapErrorMessage(error.code);
}

function secondsBetween(from: string, to: string): number {
  return Math.max(
    1,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000),
  );
}

type HostStage = {
  phase: "countdown" | "question" | "reveal";
  question: QuizCupHostQuestion;
  players: QuizCupHostPlayer[];
  endsAt?: string;
  durationSeconds: number;
  correctChoice?: number;
};

type RosterEntry = { id: string; name: string };

/** Who is in the game, from whichever view lists them (PREPARING doesn't). */
function rosterOf(room: QuizCupRoomView | null, lobbyPlayers: RoomPlayer[]): RosterEntry[] | null {
  if (!room) return null;
  if (room.state === "LOBBY") return lobbyPlayers.map((p) => ({ id: p.id, name: p.name }));
  if ((room.state === "PLAYING" || room.state === "ROUND_RESULT") && "players" in room) {
    return room.players.map((p) => ({ id: p.playerId, name: p.name }));
  }
  return null;
}

/**
 * The last roster seen, kept through the views that don't list players, so the
 * 3D stage keeps its podiums during the countdown instead of emptying and
 * rebuilding the set before every question.
 */
function useLastRoster(room: QuizCupRoomView | null, lobbyPlayers: RoomPlayer[]) {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const next = rosterOf(room, lobbyPlayers);
  const key = (list: RosterEntry[]) => list.map((p) => `${p.id}\u0001${p.name}`).join("\u0002");
  // Adjusting state during render (React's documented pattern): no extra effect pass.
  if (next && next.length > 0 && key(next) !== key(roster)) setRoster(next);
  return next && next.length > 0 ? next : roster;
}

/**
 * Maps the host's room view onto the 3D stage. `holding` keeps the question
 * board up for a moment after the server has already moved to the reveal.
 */
function toHostStage(room: QuizCupRoomView, holding: boolean, roster: RosterEntry[]): HostStage | null {
  if (room.state === "PREPARING") {
    return {
      phase: "countdown",
      question: { ...room.question, question: "", choices: [] },
      players: roster.map((p) => ({ id: p.id, name: p.name, answered: false })),
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
      players: room.players.map((p) => ({
        id: p.playerId,
        name: p.name,
        answered: p.answered,
      })),
      endsAt: room.roundEndsAt,
      durationSeconds: room.roundDuration,
    };
  }
  if (room.state === "ROUND_RESULT" && "players" in room) {
    return {
      phase: holding ? "question" : "reveal",
      question: room.question,
      players: room.players.map((p) => ({
        id: p.playerId,
        name: p.name,
        answered: p.answered,
        ...(holding ? {} : { result: p.result, choice: p.choice }),
      })),
      durationSeconds: room.roundDuration,
      correctChoice: room.correctChoice ?? undefined,
    };
  }
  return null;
}

/** True for REVEAL_HOLD_MS after the room moves from PLAYING to ROUND_RESULT. */
function useRevealHold(room: QuizCupRoomView | null): boolean {
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

type Props = {
  role: QuizCupRoomRole;
  options?: MockRoomOptions;
};

/**
 * The whole Quiz Cup flow for one device, as in dd-join-joy-frontend, but
 * driven by the in-browser mock room instead of the backend.
 */
const QuizCupGame = ({ role, options }: Props) => {
  const router = useRouter();
  const step = useQuizCupStore((s) => s.step);
  const setStep = useQuizCupStore((s) => s.setStep);
  const {
    room,
    players,
    playerDirectory,
    joinUrl,
    selfPlayer,
    selfId,
    error,
    localRound,
    joinAsPlayer,
    startGame,
    nextRoundAction,
    submitAnswer,
    applyFifty,
    sendEmoji,
    dev,
  } = useMockQuizCupRoom(role, options);
  const online = useOnlineStatus();
  const holding = useRevealHold(role === "host" ? room : null);
  const roster = useLastRoster(room, players);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const exitGame = () => router.push("/");

  if (role === "player" && !online) {
    return (
      <RoomStatusScreen
        variant="disconnected"
        background={<QuizCupBackground />}
        onLeave={exitGame}
      />
    );
  }

  const roomCode = room?.roomId ?? dev.roomId;
  const self = selfPlayer ? toFloatingAvatarPlayer(selfPlayer) : null;
  const selfName = self?.name ?? "Player";
  const selfAvatarSrc = self?.avatarSrc ?? AVATAR_COLORS[0].avatarSrc;
  const selfAvatarBg = self?.avatarBg ?? AVATAR_COLORS[0].avatarBg;

  async function handleStart(settings: Parameters<typeof startGame>[0]) {
    setStarting(true);
    try {
      await startGame(settings);
    } catch (err) {
      toast.error(quizCupErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  async function handleNext() {
    try {
      await nextRoundAction();
    } catch (err) {
      // A double-tapped "next" is a 409 the next poll already resolves.
      if (err instanceof ApiError && isBenignConflict(err.code)) return;
      toast.error(quizCupErrorMessage(err));
    }
  }

  async function handleSubmit(answer: QuizCupAnswer) {
    setSubmitting(true);
    try {
      // The screen reports a fifty-question as tactic "fifty"; the server
      // already knows (fifty has its own request) and takes no tactic then.
      await submitAnswer({
        ...answer,
        tactic: answer.tactic === "fifty" ? null : answer.tactic,
      });
    } catch (err) {
      toast.error(quizCupErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFifty() {
    try {
      await applyFifty();
    } catch (err) {
      toast.error(quizCupErrorMessage(err));
    }
  }

  async function handleJoin(...args: Parameters<typeof joinAsPlayer>) {
    setJoining(true);
    try {
      await joinAsPlayer(...args);
    } catch (err) {
      toast.error(quizCupErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  function renderAnswer() {
    if (!room || role !== "player") return null;

    if (room.state === "PREPARING" && "energy" in room) {
      return (
        <QuizCupRoundIntro
          round={room.round}
          totalRounds={room.totalRounds}
          category={room.question.category}
          difficulty={room.question.difficulty}
          startsAt={room.preparingEndsAt}
          durationSeconds={secondsBetween(
            room.preparingStartedAt,
            room.preparingEndsAt,
          )}
          selfName={selfName}
          selfAvatarSrc={selfAvatarSrc}
          selfAvatarBg={selfAvatarBg}
          score={room.myScore}
          rank={room.myRank}
          energy={room.energy}
          onLeave={exitGame}
        />
      );
    }

    if (room.state === "PLAYING" && "energy" in room) {
      const view = room as QuizCupPlayingPlayerView;
      const local = localRound?.round === view.round ? localRound : null;
      const hiddenChoices =
        view.hiddenChoices.length > 0
          ? view.hiddenChoices
          : (local?.hiddenChoices ?? []);
      const sent = view.submitted ?? local?.submitted ?? null;
      return (
        <QuizCupAnswering
          key={view.round}
          round={view.round}
          totalRounds={view.totalRounds}
          question={view.question.question}
          choices={view.question.choices}
          roundEndsAt={view.roundEndsAt}
          durationSeconds={view.roundDuration}
          selfName={selfName}
          selfAvatarSrc={selfAvatarSrc}
          selfAvatarBg={selfAvatarBg}
          score={view.myScore}
          rank={view.myRank}
          maxEnergy={view.maxEnergy}
          energy={local?.energy ?? view.energy}
          hiddenChoices={hiddenChoices}
          onUseFifty={handleFifty}
          submitted={
            sent && hiddenChoices.length > 0 && !sent.tactic
              ? { ...sent, tactic: "fifty" }
              : sent
          }
          submitting={submitting}
          onSubmit={handleSubmit}
          onLeave={exitGame}
        />
      );
    }

    if (room.state === "ROUND_RESULT" && "myResult" in room) {
      return (
        <QuizCupAnswerResult
          round={room.round}
          totalRounds={room.totalRounds}
          question={room.question.question}
          choices={room.question.choices}
          correctChoice={room.correctChoice}
          correct={room.myResult === "missed" ? null : room.myResult === "correct"}
          speedBonus={room.mySpeedScore}
          missedPoints={
            room.myResult === "missed" ? room.myRoundScore : undefined
          }
          answer={room.myAnswer}
          selfName={selfName}
          selfAvatarSrc={selfAvatarSrc}
          selfAvatarBg={selfAvatarBg}
          score={room.myTotalScore}
          rank={room.myTotalRank}
          previousRank={room.myPreviousRank}
          onLeave={exitGame}
        />
      );
    }

    if (room.state === "FINISHED" && "results" in room) {
      return (
        <QuizCupPlayerSummary
          selfName={selfName}
          selfAvatarSrc={selfAvatarSrc}
          selfAvatarBg={selfAvatarBg}
          rank={room.myTotalRank}
          totalPlayers={room.leaderboard.length}
          score={room.myTotalScore}
          results={room.results}
          onDone={dev.restart}
          onLeave={exitGame}
        />
      );
    }

    return null;
  }

  function renderStep() {
    switch (step) {
      case "join":
        return (
          <JoinRoom
            logoSrc={QUIZ_CUP_LOGO}
            backgroundImage={QUIZ_CUP_BACKGROUND}
            roomCode={roomCode}
            qrValue={joinUrl ?? undefined}
            players={toFloatingAvatarPlayers(players)}
            onBack={exitGame}
            onClose={exitGame}
            onStart={async () => {
              setStep("settings");
            }}
            hostToken="mock-host"
            getEmojiReactions={getMockEmojiReactions}
          />
        );
      case "settings":
        return (
          <QuizCupSetting
            submitting={starting}
            onSubmit={handleStart}
            onBack={() => setStep("join")}
          />
        );
      case "loading":
        return <Loading videoSrc="/loading/loading_cat.webm" />;
      case "enter_room":
        return (
          <EnterRoom
            logoSrc={QUIZ_CUP_LOGO}
            backgroundImage={QUIZ_CUP_BACKGROUND}
            roomCode={roomCode}
            allowUpload={false}
            submitting={joining}
            onSubmit={handleJoin}
          />
        );
      case "waiting_room":
        return (
          <GameWaitingRoom
            background={<QuizCupBackground />}
            logoSrc={QUIZ_CUP_LOGO}
            playerName={self?.name}
            avatarSrc={self?.avatarSrc}
            avatarBg={self?.avatarBg}
            avatarBorder={self?.borderColor}
            players={toFloatingAvatarPlayers(players)}
            onBack={exitGame}
            onSendEmoji={sendEmoji}
          />
        );
      case "host_stage": {
        if (!room || role !== "host") return null;
        const stage = toHostStage(room, holding, roster);
        if (!stage) return null;
        return (
          <QuizCupHostStage
            {...stage}
            onNext={
              stage.phase === "reveal" && room.state === "ROUND_RESULT"
                ? handleNext
                : undefined
            }
            onLeave={exitGame}
            qrValue={joinUrl ?? undefined}
          />
        );
      }
      case "answer":
        return renderAnswer();
      case "end_game": {
        if (room?.state !== "FINISHED") return null;
        return (
          <GameEndGame
            background={<QuizCupBackground />}
            logoSrc={QUIZ_CUP_LOGO}
            leaderboard={room.leaderboard}
            playerDirectory={playerDirectory}
            role={role}
            selfId={selfId}
            onCloseRoom={async () => dev.restart()}
            qrValue={joinUrl ?? undefined}
            onLeave={exitGame}
          />
        );
      }
      default:
        return null;
    }
  }

  return (
    <>
      {error ? (
        <div className="fixed inset-x-0 top-0 z-50 bg-red-600/90 py-2 text-center text-sm text-white">
          การเชื่อมต่อขาดหาย กำลังลองใหม่...
        </div>
      ) : null}
      {renderStep()}
      <MockDevToolbar role={role} dev={dev} />
    </>
  );
};

export default QuizCupGame;
