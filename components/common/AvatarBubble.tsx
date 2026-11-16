"use client";

import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
import Image from "next/image";
import { ChalkEffect } from "../ChalkEffect";
import AvatarBorder from "./AvatarBorder";

type Props = {
  name: string;
  avatarSrc: string;
  avatarBg: string;
  borderColor: string;
  editable?: boolean;
  onEditAvatar?: () => void;
  reactionIconSrc?: string;
  className?: string;
  imageClassName?: string;
};

const AvatarBubble = ({
  name,
  avatarSrc,
  avatarBg,
  borderColor,
  editable = false,
  onEditAvatar,
  reactionIconSrc,
  className,
  imageClassName,
}: Props) => {
  return (
    <div className={cn("relative size-30", className)}>
      <div
        className="absolute inset-[22%] flex items-center justify-center overflow-hidden rounded-full"
        style={{ backdropFilter: "blur(8px)" }}
      >
        <Image
          src={avatarSrc}
          alt={name}
          width={80}
          height={80}
          sizes="80px"
          className={cn("size-full rounded-full object-cover", imageClassName)}
          style={{ backgroundColor: avatarBg }}
        />
      </div>
      <AvatarBorder
        color={borderColor}
        className="pointer-events-none absolute inset-0 size-full"
      />
      {editable && (
        <button
          type="button"
          onClick={onEditAvatar}
          className="pointer-events-auto absolute top-2 right-2"
        >
          <ChalkEffect variant="chalk-soft" className="size-9">
            <Camera className="size-full fill-white text-black" />
          </ChalkEffect>
        </button>
      )}
      {reactionIconSrc && (
        <div className="pointer-events-none absolute -top-8 -right-8">
          <ChalkEffect variant="chalk-soft" className="size-18">
            <Image
              src={reactionIconSrc}
              alt=""
              width={64}
              height={64}
              className="size-full object-contain p-2"
            />
          </ChalkEffect>
        </div>
      )}
    </div>
  );
};

export default AvatarBubble;
