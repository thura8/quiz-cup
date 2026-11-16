"use client";

import { ChalkEffect } from "@/components/ChalkEffect";
import AvatarCircle from "@/components/common/AvatarCircle";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  avatarSrc: string;
  avatarBg: string;
  round: number;
  totalRounds: number;
  rank?: number | null;
  score: number;
  className?: string;
};

const QuizCupPlayerBar = ({
  name,
  avatarSrc,
  avatarBg,
  round,
  totalRounds,
  rank,
  score,
  className,
}: Props) => (
  <div className={cn("flex items-center gap-3 text-white", className)}>
    <div className="relative shrink-0 p-1">
      <ChalkEffect
        as="span"
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full border-3"
        style={{ borderColor: avatarBg }}
      />
      <AvatarCircle
        src={avatarSrc}
        name={name}
        bg={avatarBg}
        sizeClassName="size-11"
      />
    </div>
    <div className="min-w-0 flex-1">
      <p className="subtitle truncate">{name}</p>
      <p className="caption flex gap-3 text-neutral-300">
        <span>
          ข้อ {round}/{totalRounds}
        </span>
        {rank != null && <span>อันดับ {rank}</span>}
      </p>
    </div>
    <div className="text-right">
      <p className="font-display heading-5 text-highlight-yellow leading-none">
        {score}
      </p>
      <p className="caption text-neutral-300">คะแนน</p>
    </div>
  </div>
);

export default QuizCupPlayerBar;
