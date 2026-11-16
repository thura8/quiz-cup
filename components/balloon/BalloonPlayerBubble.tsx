"use client";

import { cn } from "cn";
import type { CSSProperties } from "react";
import AvatarBubble from "../common/AvatarBubble";
import RoughText from "../common/RoughText";

export type BubbleStatus = "entering" | "visible" | "leaving";

type Props = {
  name: string;
  avatarSrc: string;
  avatarBg: string;
  borderColor: string;
  top: string;
  left: string;
  status: BubbleStatus;
  exitDirection?: "left" | "right";
  floatClassName?: string;
  floatDuration?: string;
  floatDelay?: string;
  editable?: boolean;
  onEditAvatar?: () => void;
  reactionIconSrc?: string;
  onEntered?: () => void;
  onExited?: () => void;
};

const BalloonPlayerBubble = ({
  name,
  avatarSrc,
  avatarBg,
  borderColor,
  top,
  left,
  status,
  exitDirection,
  floatClassName,
  floatDuration = "6s",
  floatDelay = "0s",
  editable = false,
  onEditAvatar,
  reactionIconSrc,
  onEntered,
  onExited,
}: Props) => {
  const animationClass =
    status === "entering"
      ? "animate-in slide-in-from-bottom-[100vh] fade-in duration-10000 ease-out"
      : status === "leaving"
        ? cn(
            "animate-out fade-out duration-10000 ease-in",
            exitDirection === "left"
              ? "slide-out-to-left-[130vw]"
              : "slide-out-to-right-[130vw]",
          )
        : "";

  return (
    <div
      className={cn("absolute", animationClass)}
      style={{ top, left }}
      onAnimationEnd={() => {
        if (status === "entering") onEntered?.();
        if (status === "leaving") onExited?.();
      }}
    >
      <div
        className={cn("flex flex-col items-center", floatClassName)}
        style={
          {
            "--duration": floatDuration,
            animationDelay: floatDelay,
          } as CSSProperties
        }
      >
        <AvatarBubble
          name={name}
          avatarSrc={avatarSrc}
          avatarBg={avatarBg}
          borderColor={borderColor}
          editable={editable}
          onEditAvatar={onEditAvatar}
          reactionIconSrc={reactionIconSrc}
        />
        <RoughText className="font-display line-clamp-1 text-2xl text-white">
          {name}
        </RoughText>
      </div>
    </div>
  );
};

export default BalloonPlayerBubble;
