"use client";

import Image from "next/image";
import { ChalkEffect } from "../ChalkEffect";
import AvatarCircle from "./AvatarCircle";
import { LeaderboardCrown, type LeaderboardItem } from "./LeaderboardList";
import RoughText from "./RoughText";

type Rank = 1 | 2 | 3;

type Props = {
  title: string;
  first: LeaderboardItem;
  second?: LeaderboardItem;
  third?: LeaderboardItem;
  logoSrc?: string;
};

const RANK_LABEL: Record<Rank, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

const PodiumCard = ({
  item,
  rank,
  heightClassName,
  avatarSizeClassName,
}: {
  item: LeaderboardItem;
  rank: Rank;
  heightClassName: string;
  avatarSizeClassName: string;
}) => {
  return (
    <div className={`relative w-full max-w-60 self-end p-4 ${heightClassName}`}>
      {rank === 1 && (
        <LeaderboardCrown className="absolute -top-9 -left-4 z-10 size-11 -translate-x-1/2 -rotate-45 text-[#FCA346]" />
      )}
      <ChalkEffect
        as="div"
        className="pointer-events-none absolute inset-0 rounded-3xl border-6"
        style={{ borderColor: item.avatarBorder }}
      />
      <div className="absolute top-3 left-3 z-10 -rotate-16 px-2 py-0.5">
        <RoughText
          className="font-display heading-3"
          style={{
            color:
              rank === 1
                ? "#F7AC22"
                : rank === 2
                  ? "#929391"
                  : "var(--primitive-color-primary-500)",
          }}
        >
          {RANK_LABEL[rank]}
        </RoughText>
      </div>

      <div className="relative flex h-full flex-col items-center justify-center gap-2 space-y-6 px-3 py-4">
        <AvatarCircle
          src={item.avatar}
          name={item.name}
          bg={item.avatarBg}
          sizeClassName={avatarSizeClassName}
          imageSize={96}
          draggable={false}
        />
        <p className="font-display heading-4 w-full truncate text-center text-white italic">
          {item.name}
        </p>
      </div>
    </div>
  );
};

const GamePodium = ({ title, first, second, third, logoSrc }: Props) => {
  return (
    <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-start gap-12 px-4">
      <p className="font-display heading-4 text-center text-white">{title}</p>

      <div className="flex h-full w-full items-center justify-center">
        <div className="relative flex w-full max-w-4xl flex-1 items-center justify-center gap-3">
          {logoSrc && (
            <div className="pointer-events-none absolute -top-24 right-0 rotate-30">
              <Image src={logoSrc} alt="" width={240} height={240} />
            </div>
          )}
          {second && (
            <PodiumCard
              item={second}
              rank={2}
              heightClassName="h-[317px]"
              avatarSizeClassName="size-26"
            />
          )}
          <PodiumCard
            item={first}
            rank={1}
            heightClassName="h-[420px]"
            avatarSizeClassName="size-26"
          />
          {third && (
            <PodiumCard
              item={third}
              rank={3}
              heightClassName="h-[233px]"
              avatarSizeClassName="size-26"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePodium;
