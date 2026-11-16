"use client";

import { AVATAR_COLORS, SYSTEM_AVATAR_IDS } from "@/constants/avatar";
import { CHAT_ICON } from "@/constants/chat";
import { ApiError } from "@/lib/errors";
import { mapErrorMessage } from "@/lib/rooms/error-messages";
import { Camera, ChevronLeft, Dices, Globe, Loader2 } from "lucide-react";
import Image from "next/image";
import type { SystemAvatarSelection } from "@/types/room";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import AppDrawer from "./AppDrawer";
import AvatarBubble from "./AvatarBubble";
import { type FloatingAvatarPlayer } from "./FloatingAvatars";
import RoughText from "./RoughText";

const SENDABLE_EMOJI_COUNT = 5;

type Props = {
  background: ReactNode;
  logoSrc: string;
  logoAlt?: string;
  playerName?: string;
  avatarSrc?: string;
  avatarBg?: string;
  avatarBorder?: string;
  players?: FloatingAvatarPlayer[];
  onBack?: () => void;
  onUploadAvatar?: (file: File) => Promise<unknown>;
  onSelectSystemAvatar?: (selection: SystemAvatarSelection) => Promise<unknown>;
  onSendEmoji?: (emoji: number) => Promise<void>;
};

const GameWaitingRoom = ({
  background,
  logoSrc,
  logoAlt = "โลโก้",
  playerName = "Avatar",
  avatarSrc = AVATAR_COLORS[0].avatarSrc,
  avatarBg = AVATAR_COLORS[0].avatarBg,
  avatarBorder = AVATAR_COLORS[0].borderColor,
  players = [],
  onBack,
  onUploadAvatar,
  onSelectSystemAvatar,
  onSendEmoji,
}: Props) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingEmoji, setSendingEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendEmoji = async (emoji: number) => {
    if (!onSendEmoji || sendingEmoji) return;
    setSendingEmoji(true);
    try {
      await onSendEmoji(emoji);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "UNKNOWN";
      if (code !== "EMOJI_COOLDOWN") {
        toast.error(mapErrorMessage(code));
      }
    } finally {
      setSendingEmoji(false);
    }
  };

  const handleSelectSystem = async (selection: SystemAvatarSelection) => {
    if (!onSelectSystemAvatar) return;
    setDrawerOpen(false);
    setUploading(true);
    try {
      await onSelectSystemAvatar(selection);
    } catch (err) {
      toast.error(
        mapErrorMessage(err instanceof ApiError ? err.code : "UNKNOWN"),
      );
    } finally {
      setUploading(false);
    }
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setDrawerOpen(false);
    if (!file || !onUploadAvatar) return;
    setUploading(true);
    try {
      await onUploadAvatar(file);
    } catch (err) {
      toast.error(
        mapErrorMessage(err instanceof ApiError ? err.code : "UNKNOWN"),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden">
      {background}
      <nav className="relative z-10 container mx-auto flex items-center justify-between p-4">
        <Button
          variant="outline"
          className="bg-transparent px-4 text-white!"
          onClick={onBack}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent px-4 text-white!"
        >
          <Globe className="size-4" size="sm" />
        </Button>
      </nav>
      <div className="relative z-10 flex h-full flex-1 flex-col items-center justify-between gap-6 p-4 sm:p-8">
        <Image
          src={logoSrc}
          alt={logoAlt}
          width={240}
          height={133}
          className="h-auto w-full max-w-44 object-contain"
        />

        <div className="flex w-full flex-col items-center justify-between gap-4">
          <div className="relative mt-6">
            {uploading && (
              <div
                role="status"
                aria-label="กำลังอัปโหลด"
                className="absolute inset-[22%] z-10 flex items-center justify-center rounded-full bg-black/60"
              >
                <Loader2 className="size-8 animate-spin text-white" />
              </div>
            )}
            <AvatarBubble
              name={playerName}
              avatarSrc={avatarSrc}
              avatarBg={avatarBg}
              borderColor={avatarBorder}
              editable={Boolean(onUploadAvatar) && !uploading}
              onEditAvatar={() => setDrawerOpen(true)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <AppDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              className="rounded-b-none border-none bg-[#272727] backdrop-blur-[2px] [--drawer-inset:0px]"
              title="เปลี่ยนรูปโปรไฟล์"
              closable
            >
              <div className="grid grid-cols-4 justify-items-center gap-4 p-6">
                <button
                  type="button"
                  onClick={handlePickFile}
                  aria-label="ถ่ายรูปหรืออัปโหลด"
                  className="flex size-16 items-center justify-center rounded-full bg-neutral-700 p-4"
                >
                  <Camera className="size-full text-white" />
                </button>
                {onSelectSystemAvatar && (
                  <button
                    type="button"
                    onClick={() => handleSelectSystem({ random: true })}
                    aria-label="สุ่มรูปโปรไฟล์"
                    className="flex size-16 items-center justify-center rounded-full bg-neutral-700 p-4"
                  >
                    <Dices className="size-full text-white" />
                  </button>
                )}
                {SYSTEM_AVATAR_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectSystem({ avatarId: id })}
                    className="size-16 overflow-hidden rounded-full bg-neutral-700"
                  >
                    <Image
                      src={`/avatar/${id}.png`}
                      alt={id}
                      width={64}
                      height={64}
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </AppDrawer>
          </div>
          <RoughText className="heading-5 text-white italic">
            {playerName}
          </RoughText>{" "}
          <div className="grid w-4/5 grid-cols-3 gap-3 rounded-xl border border-transparent p-3 shadow-2xl [background:linear-gradient(#2B2B2BE5,#2B2B2BE5)_padding-box,linear-gradient(0deg,#00000000_0%,#666666_100%)_border-box]">
            {CHAT_ICON.map((item, index) => {
              const emoji = index + 1;
              const sendable = emoji <= SENDABLE_EMOJI_COUNT && onSendEmoji;

              if (!sendable) {
                return (
                  <div
                    key={item.value}
                    className="flex items-center justify-center"
                  >
                    <Image
                      src={item.image}
                      alt={`ICON-${item.value}`}
                      width={80}
                      height={80}
                      className="w-full max-w-17"
                    />
                  </div>
                );
              }

              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={sendingEmoji}
                  onClick={() => handleSendEmoji(emoji)}
                  aria-label={`ส่งอิโมจิ ${item.value}`}
                  className="flex items-center justify-center disabled:opacity-60"
                >
                  <Image
                    src={item.image}
                    alt={`ICON-${item.value}`}
                    width={80}
                    height={80}
                    className="w-full max-w-17"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-content-disabled subtitle pb-12">
          กรุณารอโฮสเริ่มเกม ...
        </p>
      </div>
    </div>
  );
};

export default GameWaitingRoom;
