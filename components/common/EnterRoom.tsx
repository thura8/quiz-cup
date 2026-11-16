"use client";

import { AVATAR_COLORS } from "@/constants/avatar";
import { GUEST_NAME_MAX, type SelectedAvatar } from "@/lib/rooms/guest";
import { Camera, CircleQuestionMark, Globe } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import BalloonScreenBackground from "../balloon/BalloonScreenBackground";
import { ChalkEffect } from "../ChalkEffect";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import AppDrawer from "./AppDrawer";
import RoughText from "./RoughText";

type Props = {
  logoSrc: string;
  topLogoSrc?: string;
  backgroundImage: string;
  backgroundGradientDirection?: "0deg" | "180deg";
  roomCode: string;
  defaultName?: string;
  allowUpload?: boolean;
  submitting?: boolean;
  onSubmit?: (name: string, avatar: SelectedAvatar | null) => void;
};

const EnterRoom = ({
  logoSrc,
  topLogoSrc = "/brand/logo.svg",
  backgroundImage,
  backgroundGradientDirection = "180deg",
  roomCode,
  defaultName = "",
  allowUpload = true,
  submitting = false,
  onSubmit,
}: Props) => {
  const [rawText, setRawText] = useState(defaultName);
  const [disabled, setDisabled] = useState(!defaultName.trim());
  const [avatarDrawerOpen, setAvatarDrawerOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatar | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onRawTextChange = (value: string) => {
    setRawText(value);
    setDisabled(!value.trim());
  };

  const handleSelectPreset = (item: (typeof AVATAR_COLORS)[number]) => {
    setSelectedAvatar({
      type: "preset",
      src: item.avatarSrc,
      bg: item.avatarBg,
    });
    setAvatarDrawerOpen(false);
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setSelectedAvatar({ type: "upload", src: URL.createObjectURL(file), file });
    setAvatarDrawerOpen(false);
  };

  return (
    <div className="relative flex h-dvh w-full flex-col items-center overflow-hidden bg-neutral-900">
      <BalloonScreenBackground
        image={backgroundImage}
        variant="compact"
        gradientDirection={backgroundGradientDirection}
      />

      <div
        className="relative z-10 flex h-[90%] w-full flex-col p-4 sm:p-8"
        style={{
          maxWidth: "min(100%, 430px, 65dvh)",
          containerType: "inline-size",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: "2cqi" }}
        >
          <div>
            <Image
              src={topLogoSrc}
              alt="logo"
              width={70}
              height={70}
              loading="eager"
              style={{ width: "18.6cqi", height: "auto" }}
            />
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            style={{ padding: "0 3cqi", height: "10cqi" }}
          >
            <Globe style={{ width: "4.5cqi", height: "4.5cqi" }} />
          </Button>
        </div>

        <div
          className="flex h-full flex-1 flex-col items-center justify-between"
          style={{ gap: "4cqi", padding: "2cqi 0" }}
        >
          <Image
            src={logoSrc}
            alt="โลโก้"
            width={240}
            height={133}
            style={{ width: "100%", maxWidth: "57.6cqi", height: "auto" }}
            className="object-contain"
          />

          <div
            className="flex w-full flex-col items-center justify-between"
            style={{ gap: "4cqi" }}
          >
            <div className="text-center">
              <RoughText
                className="font-display heading-5 block text-white"
                style={{ fontSize: "6cqi", marginBottom: "1cqi" }}
              >
                Room Code
              </RoughText>
              <p
                className="leading-none font-extrabold text-white"
                style={{ fontSize: "12.8cqi" }}
              >
                {roomCode}
              </p>
            </div>

            <Input
              placeholder="กรอกชื่อของคุณ"
              className="placeholder:text-content-disabled w-full rounded-full text-center text-white placeholder:text-center"
              style={{
                padding: "4.26cqi 5.33cqi",
                fontSize: "max(16px, 4.26cqi)",
                height: "auto",
              }}
              value={rawText}
              maxLength={GUEST_NAME_MAX}
              onChange={(e) => onRawTextChange(e.target.value)}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <AppDrawer
              open={avatarDrawerOpen}
              onOpenChange={setAvatarDrawerOpen}
              trigger={
                <div
                  className="relative flex items-center justify-center rounded-full bg-neutral-700"
                  style={{
                    marginTop: "2cqi",
                    width: "34.1cqi",
                    height: "34.1cqi",
                    padding: selectedAvatar ? "0" : "4.26cqi",
                  }}
                >
                  {selectedAvatar ? (
                    <div
                      className="size-full overflow-hidden rounded-full"
                      style={
                        selectedAvatar.type === "preset"
                          ? { backgroundColor: selectedAvatar.bg }
                          : undefined
                      }
                    >
                      {selectedAvatar.type === "preset" ? (
                        <Image
                          src={selectedAvatar.src}
                          alt="Avatar ที่เลือก"
                          width={128}
                          height={128}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Image
                          src={selectedAvatar.src}
                          alt="Avatar ที่เลือก"
                          width={128}
                          height={128}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  ) : (
                    <CircleQuestionMark className="size-full text-neutral-600" />
                  )}
                  <ChalkEffect
                    variant="chalk-soft"
                    className="absolute right-0 bottom-0"
                    style={{ width: "9.6cqi", height: "9.6cqi" }}
                  >
                    <Camera className="size-full fill-white text-black" />
                  </ChalkEffect>
                </div>
              }
              className="rounded-b-none border-none bg-[#272727] backdrop-blur-[2px] [--drawer-inset:0px]"
              title="เลือกรูปภาพ"
              closable
            >
              <div className="grid grid-cols-3 gap-3 p-6">
                {allowUpload && (
                  <button
                    type="button"
                    onClick={handleCameraClick}
                    className="flex aspect-square w-full items-center justify-center rounded-full bg-neutral-700 p-6"
                  >
                    <Camera className="size-full text-white" />
                  </button>
                )}
                {AVATAR_COLORS.map((item, index) => {
                  return (
                    <button
                      type="button"
                      key={index}
                      onClick={() => handleSelectPreset(item)}
                      className="col-span-1 aspect-square w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: item.avatarBg }}
                    >
                      <Image
                        src={item.avatarSrc}
                        alt={`Avatar-${index}`}
                        width={80}
                        height={80}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            </AppDrawer>
          </div>

          <Button
            className="w-full rounded-full"
            disabled={disabled || submitting}
            onClick={() => onSubmit?.(rawText, selectedAvatar)}
            style={{
              height: "auto",
              padding: "4cqi 2cqi",
              fontSize: "max(16px, 4.5cqi)",
            }}
          >
            เข้าห้อง
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnterRoom;
