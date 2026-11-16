"use client";

import { ApiError } from "@/lib/errors";
import { isBenignConflict, mapErrorMessage } from "@/lib/rooms/error-messages";
import { resolveDirectoryAvatar } from "@/lib/rooms/player-avatar";
import { SOUNDS } from "@/lib/sound/sounds";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, PlayerDirectory } from "@/types/room";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChalkEffect } from "../ChalkEffect";
import BalloonNav from "../balloon/BalloonNav";
import { Button } from "../ui/button";
import AvatarCircle from "./AvatarCircle";
import BackgroundMusic from "./BackgroundMusic";
import Confetti from "./Confetti";
import GamePodium from "./GamePodium";
import LeaderboardList, {
  LeaderboardCrown,
  type LeaderboardItem,
} from "./LeaderboardList";

type Props = {
  background: ReactNode;
  logoSrc?: string;
  leaderboard: LeaderboardEntry[];
  playerDirectory: PlayerDirectory;
  role: "host" | "player";
  selfId?: string;
  onCloseRoom?: () => Promise<void>;
  qrValue?: string;
  onLeave?: () => void;
  music?: boolean;
  clipSlot?: ReactNode;
};

function toLeaderboardItems(
  entries: LeaderboardEntry[],
  directory: PlayerDirectory,
): LeaderboardItem[] {
  return entries.map((entry) => {
    const avatar = resolveDirectoryAvatar(
      directory,
      entry.playerId,
      entry.name,
    );
    return {
      name: entry.name,
      avatar: avatar.avatarSrc,
      avatarBg: avatar.avatarBg,
      avatarBorder: avatar.borderColor,
      score: entry.totalScore,
    };
  });
}

const GameEndGame = ({
  background,
  logoSrc,
  leaderboard,
  playerDirectory,
  role,
  selfId,
  onCloseRoom,
  qrValue,
  onLeave,
  music = true,
  clipSlot,
}: Props) => {
  const [isCongrat, setIsCongrat] = useState(false);
  const [closing, setClosing] = useState(false);
  const items = toLeaderboardItems(leaderboard, playerDirectory);
  const [first, second, third] = items;
  const self = leaderboard.find((entry) => entry.playerId === selfId);
  const selfAvatar =
    self && resolveDirectoryAvatar(playerDirectory, self.playerId, self.name);

  const handleIsCongrat = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsCongrat(true);
  };

  async function handleCloseRoom() {
    if (!onCloseRoom) return;
    setClosing(true);
    try {
      await onCloseRoom();
    } catch (err) {
      if (!(err instanceof ApiError && isBenignConflict(err.code))) {
        toast.error(
          mapErrorMessage(err instanceof ApiError ? err.code : "UNKNOWN"),
        );
      }
      setClosing(false);
    }
  }

  const closeRoomButton = role === "host" && onCloseRoom && (
    <Button
      size="xl"
      variant="outline"
      disabled={closing}
      onClick={handleCloseRoom}
      className="mt-8 w-full max-w-xs"
    >
      {closing ? "กำลังปิดห้อง..." : "ปิดห้อง"}
    </Button>
  );

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden">
      {music && <BackgroundMusic src={SOUNDS.bgm} stream />}
      {background}
      <BalloonNav onLeave={onLeave} qrValue={qrValue} />

      {self && selfAvatar && (
        <div className="no-scrollbar font-display relative z-10 flex flex-1 flex-col overflow-y-auto px-4 pb-10 text-white md:hidden">
          <div className="my-auto flex flex-col items-center">
            <p className="heading-5">อันดับของคุณ</p>

            <div className="relative mt-12 aspect-3/5 w-[57vw] max-w-64">
              {self.rank === 1 && (
                <LeaderboardCrown className="absolute -top-10 -left-12 z-10 size-12 -rotate-20 text-[#FCA346]" />
              )}
              <div className="relative flex h-full flex-col items-center justify-center gap-6 rounded-3xl px-4 py-4 backdrop-blur-sm">
                <AvatarCircle
                  src={selfAvatar.avatarSrc}
                  name={self.name}
                  bg={selfAvatar.avatarBg}
                  sizeClassName="aspect-square w-[68%]"
                />
                <p className="heading-4 w-full truncate text-center italic">
                  {self.name}
                </p>
                <p className="heading-5">อันดับที่ {self.rank}</p>
              </div>

              <ChalkEffect
                as="div"
                className="pointer-events-none absolute inset-0 rounded-3xl border-6"
                style={{ borderColor: selfAvatar.borderColor }}
              />
            </div>

            <div className="mt-16 text-center">
              <p className="heading-1">{self.totalScore}</p>
              <p className="heading-5">คะแนน</p>
            </div>
          </div>
        </div>
      )}

      <div className={cn("contents", self && "max-md:hidden")}>
        {isCongrat && first ? (
          <div className="no-scrollbar relative z-10 container mx-auto flex flex-1 flex-col items-center overflow-y-auto px-4 pb-10">
            <GamePodium
              title="ขอแสดงความยินดีกับ ..."
              first={first}
              second={second}
              third={third}
              logoSrc={logoSrc}
            />
            {closeRoomButton}
          </div>
        ) : (
          <div className="no-scrollbar relative z-10 container mx-auto flex flex-1 flex-col items-center gap-10 overflow-y-auto px-4 pb-10">
            <LeaderboardList title="สรุปอันดับคะแนน" data={items} />
            {first ? (
              <Button
                size="xl"
                className="px-24 shadow-[0_12px_28px_-8px_rgba(240,114,97,0.65)]"
                onClick={handleIsCongrat}
              >
                ประกาศผู้ชนะ
              </Button>
            ) : (
              closeRoomButton
            )}
          </div>
        )}
      </div>
      <Confetti className="z-20" />
      {role === "host" && clipSlot && (
        <div className="absolute bottom-6 left-6 z-30">{clipSlot}</div>
      )}
    </div>
  );
};

export default GameEndGame;
