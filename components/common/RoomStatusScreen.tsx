"use client";

import { cn } from "@/lib/utils";
import { DoorClosed, DoorOpen, Globe, WifiOff } from "lucide-react";
import Image from "next/image";
import { useState, type FormEvent, type ReactNode } from "react";
import { ChalkEffect } from "../ChalkEffect";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import RoughText from "./RoughText";

type Props = {
  background: ReactNode;
  variant: "room-not-found" | "disconnected";
  defaultCode?: string;

  errorMessage?: string | null;
  submitting?: boolean;
  onSubmitCode?: (code: string) => void;
  onLeave?: () => void;
  onLanguageToggle?: () => void;
};

const COPY = {
  "room-not-found": {
    Icon: DoorClosed,
    title: "ไม่พบห้อง",
    description:
      "กรุณาแสกน QR Code บนหน้าจอโฮสต์\nหรือกรอกหมายเลขห้องใหม่อีกครั้ง",
  },
  disconnected: {
    Icon: WifiOff,
    title: "ขาดการเชื่อมต่อ",
    description: "กรุณาตรวจสอบสัญญาณอินเทอร์เน็ต\nและรีเฟรชหน้านี้อีกครั้ง",
  },
} as const;

const RoomStatusScreen = ({
  background,
  variant,
  defaultCode = "",
  errorMessage = null,
  submitting = false,
  onSubmitCode,
  onLeave,
  onLanguageToggle,
}: Props) => {
  const [code, setCode] = useState(defaultCode);
  const [showError, setShowError] = useState(Boolean(errorMessage));
  const [prevErrorMessage, setPrevErrorMessage] = useState(errorMessage);

  if (errorMessage !== prevErrorMessage) {
    setPrevErrorMessage(errorMessage);
    setShowError(Boolean(errorMessage));
  }

  const { Icon, title, description } = COPY[variant];
  const trimmedCode = code.trim();
  const invalid = showError && Boolean(errorMessage);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedCode || submitting) return;
    onSubmitCode?.(trimmedCode.toUpperCase());
  };

  return (
    <div className="relative flex h-dvh w-full flex-col items-center overflow-hidden bg-neutral-900">
      {background}

      <div
        className="relative z-10 flex h-full w-full flex-col p-4"
        style={{ maxWidth: "min(100%, 430px)" }}
      >
        <nav className="flex items-center justify-between">
          <Image
            src="/brand/logo.svg"
            alt="dd-join-joy-logo"
            width={120}
            height={120}
            loading="eager"
            className="h-auto w-full max-w-14"
          />
          <div className="inline-flex items-center gap-2">
            {onLeave && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="border-red-500 bg-transparent px-4 text-red-500!"
                aria-label="ออกจากเกม"
                onClick={onLeave}
              >
                <DoorOpen className="size-4 text-red-500" strokeWidth={3} />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="bg-transparent px-4 text-white!"
              aria-label="เปลี่ยนภาษา"
              onClick={onLanguageToggle}
            >
              <Globe className="size-4" />
            </Button>
          </div>
        </nav>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col items-center pb-11"
        >
          <div
            className={cn(
              "flex w-full flex-1 flex-col items-center text-center",
              variant === "disconnected"
                ? "justify-center pt-10"
                : "pt-[22dvh]",
            )}
          >
            <ChalkEffect variant="chalk-soft" className="mb-10 text-white">
              <Icon className="size-20" strokeWidth={2.25} aria-hidden />
            </ChalkEffect>
            <RoughText className="font-display heading-3 mb-2 block text-white">
              {title}
            </RoughText>
            <p className="subtitle text-content-disabled whitespace-pre-line">
              {description}
            </p>

            {variant === "room-not-found" && (
              <div className="mt-15 w-full">
                <Input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setShowError(false);
                  }}
                  placeholder="กรอกหมายเลขห้อง เช่น K1234"
                  autoComplete="off"
                  enterKeyHint="go"
                  className={cn(
                    "body-1 w-full py-3 text-center uppercase placeholder:normal-case",
                    invalid && "border-red-500",
                  )}
                />
                {invalid && (
                  <p
                    id="room-code-error"
                    role="alert"
                    className="caption mt-1.5 text-center text-red-500"
                  >
                    {errorMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {variant === "room-not-found" && (
            <Button
              type="submit"
              className="h-13 w-full font-semibold disabled:bg-neutral-400 disabled:text-white"
              disabled={!trimmedCode || submitting}
            >
              <span className="subtitle">
                {submitting ? "กำลังค้นหา..." : "ยืนยัน"}
              </span>
            </Button>
          )}
        </form>
      </div>
    </div>
  );
};

export default RoomStatusScreen;
