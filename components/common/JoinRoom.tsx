"use client";

import { ApiError } from "@/lib/errors";
import { isBenignConflict, mapErrorMessage } from "@/lib/rooms/error-messages";

import { ChevronLeft, Globe, UsersRound } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import type { GetEmojiReactions } from "@/hooks/shared/useEmojiReactions";
import { SOUNDS } from "@/lib/sound/sounds";
import BalloonScreenBackground from "../balloon/BalloonScreenBackground";
import { Button } from "../ui/button";
import BackgroundMusic from "./BackgroundMusic";
import FloatingAvatars, { type FloatingAvatarPlayer } from "./FloatingAvatars";
import SoundToggle from "./SoundToggle";

type Props = {
  logoSrc: string;
  backgroundImage?: string;
  roomCode: string;
  qrValue?: string;
  players?: FloatingAvatarPlayer[];
  onClose?: () => void;
  onBack?: () => void;
  onStart?: () => Promise<void>;
  startBlockedReason?: string | null;
  hostToken?: string | null;
  getEmojiReactions?: GetEmojiReactions;
};

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;

const JoinRoom = ({
  logoSrc,
  backgroundImage = "/balloon/bg.png",
  roomCode,
  qrValue,
  players = [],
  onClose,
  onBack,
  onStart,
  startBlockedReason,
  hostToken = null,
  getEmojiReactions,
}: Props) => {
  const [starting, setStarting] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = viewportRef.current;

    if (!element) return;

    const updateScale = () => {
      const { width, height } = element.getBoundingClientRect();

      if (!width || !height) return;

      const widthScale = width / DESIGN_WIDTH;
      const heightScale = height / DESIGN_HEIGHT;

      const nextScale = Math.min(widthScale, heightScale);

      setScale(Math.min(nextScale, 1));
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const blockedReason =
    players.length === 0
      ? "รอผู้เล่นเข้าห้องอย่างน้อย 1 คน"
      : (startBlockedReason ?? null);

  async function handleStart() {
    if (!onStart) return;
    if (blockedReason) {
      toast.warning(blockedReason);
      return;
    }

    setStarting(true);

    try {
      await onStart();
    } catch (err) {
      if (!(err instanceof ApiError && isBenignConflict(err.code))) {
        toast.error(
          mapErrorMessage(err instanceof ApiError ? err.code : "UNKNOWN"),
        );
      }

      setStarting(false);
    }
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden">
      <BackgroundMusic src={SOUNDS.bgm} volume={0.4} stream />
      <BalloonScreenBackground
        image={backgroundImage}
        variant="plain"
        scanlineSize={16}
      />

      <nav className="relative z-20 container mx-auto flex items-center justify-between p-4">
        <Button
          variant="outline"
          className="bg-transparent px-6 text-white!"
          onClick={onBack}
        >
          <ChevronLeft className="size-4" />
          กลับ
        </Button>

        <div className="inline-flex items-center gap-2">
          <SoundToggle size="default" />
          <Button variant="outline" className="bg-transparent px-6 text-white!">
            TH
            <Globe className="size-4" />
          </Button>
        </div>
      </nav>

      <div ref={viewportRef} className="absolute inset-0 z-10 overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="flex shrink-0 flex-col items-center justify-between gap-6 p-8"
            style={{
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <Image
              src={logoSrc}
              alt="โลโก้"
              width={240}
              height={133}
              className="h-auto w-full max-w-60 object-contain"
            />

            <div className="animate-in slide-in-from-bottom-[100vh] fade-in w-full max-w-180 duration-700 ease-out">
              <div className="flex h-92 w-full rotate-[-4.847deg] items-center gap-4 rounded-[24px] bg-[#F7F5EF] px-6 py-4 shadow-lg transition-transform duration-300 hover:rotate-[4.847deg]">
                <div className="flex flex-col justify-center px-6 text-[#1F211F]">
                  <span className="font-display text-[64px]">Room Code</span>

                  <span className="text-[96px] font-black tracking-wider">
                    {roomCode}
                  </span>
                </div>

                <div className="flex h-fit flex-1 flex-col items-center justify-between gap-1 rounded-3xl border-4 border-black px-3 py-4">
                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-white">
                    <QRCode
                      value={qrValue ?? roomCode}
                      style={{
                        height: "auto",
                        maxWidth: "100%",
                        width: "100%",
                      }}
                      viewBox="0 0 256 256"
                    />
                  </div>

                  <span className="font-display shrink-0 text-[24px] whitespace-nowrap text-black">
                    สแกนเพื่อเล่น
                  </span>
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col items-center gap-6">
              <div className="flex items-center gap-3 text-white">
                <UsersRound className="size-9" />

                <span className="text-lg">{players.length}</span>
              </div>

              {onStart && blockedReason && (
                <p className="max-w-sm rounded-xl bg-amber-500/20 px-4 py-2 text-center text-amber-200">
                  {blockedReason}
                </p>
              )}
              {onStart && (
                <Button
                  size="xl"
                  className="max-w-sm min-w-full rounded-full px-10 py-6"
                  disabled={starting || Boolean(blockedReason)}
                  onClick={handleStart}
                >
                  {starting ? "กำลังเริ่มเกม..." : "เริ่มเกม"}
                </Button>
              )}

            </div>
          </div>
        </div>
        <FloatingAvatars
          players={players}
          roomId={roomCode}
          hostToken={hostToken}
          getEmojiReactions={getEmojiReactions}
        />
      </div>
    </div>
  );
};

export default JoinRoom;
