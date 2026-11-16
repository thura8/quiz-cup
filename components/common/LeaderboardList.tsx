"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { ChalkEffect } from "../ChalkEffect";
import AvatarCircle from "./AvatarCircle";

export type LeaderboardItem = {
  name: string;
  avatar: string;
  avatarBg: string;
  avatarBorder: string;
  score: number;
  subtitle?: string;
};

type Props = {
  title: string;
  data: LeaderboardItem[];
};

export const LeaderboardCrown = ({ className }: { className?: string }) => {
  const filterId = `leaderboard-crown-${useId().replace(/:/g, "")}`;

  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <filter
          id={filterId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.3"
            numOctaves="2"
            seed="42"
          />
          <feDisplacementMap
            in="SourceGraphic"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <path
        d="M8 42 L56 42 L60 16 L44 28 L32 6 L20 28 L4 16 Z M16 54 L48 54"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      />
    </svg>
  );
};

const LeaderboardList = ({ title, data }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startY: 0, startScrollTop: 0 });
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkOverflow = () =>
      setHasOverflow(el.scrollHeight > el.clientHeight);
    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [data]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = {
      dragging: true,
      startY: e.clientY,
      startScrollTop: el.scrollTop,
    };
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !dragRef.current.dragging) return;
    el.scrollTop =
      dragRef.current.startScrollTop - (e.clientY - dragRef.current.startY);
  };

  const stopDragging = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current.dragging = false;
    scrollRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <>
      <div className="relative">
        <p className="heading-3 font-display text-center text-white">{title}</p>
      </div>

      <div className="relative min-h-0 w-full flex-1 px-24">
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          className="no-scrollbar flex h-full w-full min-w-full! cursor-grab touch-pan-y flex-col gap-5 overflow-y-auto overscroll-contain rounded-4xl p-6 px-24 pt-7 select-none active:cursor-grabbing"
        >
          {data.map((item, index) => {
            const isTop = index === 0;

            return (
              <div key={item.name} className="relative w-full shrink-0">
                {isTop && (
                  <LeaderboardCrown className="absolute -top-7 -left-10 z-10 size-11 -rotate-45 text-[#FCA346]" />
                )}
                <ChalkEffect
                  as="div"
                  className="pointer-events-none absolute inset-0 rounded-full border-4"
                  style={{ borderColor: item.avatarBorder }}
                />

                <div className="relative flex items-center justify-between gap-4 rounded-full px-6 py-4">
                  <div className="font-display inline-flex min-w-0 items-center gap-4 text-white sm:gap-6">
                    <AvatarCircle
                      src={item.avatar}
                      name={item.name}
                      bg={item.avatarBg}
                      imageSize={80}
                      draggable={false}
                    />
                    <p className="heading-5 max-w-44 min-w-full truncate text-white italic sm:max-w-64">
                      {item.name}
                    </p>
                  </div>

                  <div className="mr-4 flex shrink-0 items-center justify-center gap-6">
                    {item.subtitle && (
                      <span className="heading-6 text-white/70">
                        {item.subtitle}
                      </span>
                    )}
                    <p className="heading-3 font-display text-white">
                      {item.score}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {hasOverflow && (
          <div className="pointer-events-none absolute inset-x-0 -bottom-10 mx-auto h-40 max-w-6xl bg-linear-to-t from-[#1E1E1E] from-15% to-[#1E1E1E00] blur-xl" />
        )}
      </div>
    </>
  );
};

export default LeaderboardList;
