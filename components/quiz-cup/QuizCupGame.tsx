"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AVATAR_COLORS } from "@/constants/avatar";
import { QUIZ_CUP_BACKGROUND, QUIZ_CUP_LOGO } from "@/constants/quiz-cup";
import { useMockQuizCupRoom, type MockRoomOptions, type QuizCupRoomRole } from "@/hooks/quiz-cup/useMockQuizCupRoom";
import { useOnlineStatus } from "@/hooks/shared/useOnlineStatus";
import { ApiError } from "@/lib/errors";
import { isBenignConflict } from "@/lib/rooms/error-messages";
import { toFloatingAvatarPlayer, toFloatingAvatarPlayers } from "@/lib/rooms/player-avatar";
import { getMockEmojiReactions } from "@/mock/emoji-reactions";
import { useQuizCupStore } from "@/stores/QuizCupStore";

import EnterRoom from "../common/EnterRoom";
import GameEndGame from "../common/GameEndGame";
import GameWaitingRoom from "../common/GameWaitingRoom";
import JoinRoom from "../common/JoinRoom";
import Loading from "../common/Loading";
import RoomStatusScreen from "../common/RoomStatusScreen";
import MockDevToolbar from "../dev/MockDevToolbar";
import { quizCupErrorMessage } from "./game/errors";
import { toHostStage, useLastRoster, useRevealHold } from "./game/host-stage";
import PlayerRoundScreen from "./game/PlayerRoundScreen";
import QuizCupHostStage from "./host/QuizCupHostStage";
import { type QuizCupAnswer } from "./QuizCupAnswering";
import QuizCupBackground from "./QuizCupBackground";
import QuizCupSetting from "./QuizCupSetting";

type Props = {
  role: QuizCupRoomRole;
  options?: MockRoomOptions;
};

const QuizCupGame = ({ role, options }: Props) => {
  const router = useRouter();
  const step = useQuizCupStore((state) => state.step);
  const setStep = useQuizCupStore((state) => state.setStep);
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
  const showError = (err: unknown) => toast.error(quizCupErrorMessage(err));

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
      showError(err);
    } finally {
      setStarting(false);
    }
  }

  async function handleNext() {
    try {
      await nextRoundAction();
    } catch (err) {
      if (err instanceof ApiError && isBenignConflict(err.code)) return;
      showError(err);
    }
  }

  async function handleSubmit(answer: QuizCupAnswer) {
    setSubmitting(true);
    try {
      await submitAnswer({
        ...answer,
        tactic: answer.tactic === "fifty" ? null : answer.tactic,
      });
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFifty() {
    try {
      await applyFifty();
    } catch (err) {
      showError(err);
    }
  }

  async function handleJoin(...args: Parameters<typeof joinAsPlayer>) {
    setJoining(true);
    try {
      await joinAsPlayer(...args);
    } catch (err) {
      showError(err);
    } finally {
      setJoining(false);
    }
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
        if (!room || role !== "player") return null;
        return (
          <PlayerRoundScreen
            room={room}
            self={{ selfName, selfAvatarSrc, selfAvatarBg }}
            localRound={localRound}
            submitting={submitting}
            onUseFifty={handleFifty}
            onSubmit={handleSubmit}
            onDone={dev.restart}
            onLeave={exitGame}
          />
        );
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
