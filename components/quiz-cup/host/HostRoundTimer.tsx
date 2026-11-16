"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const TICK_MS = 100;
const URGENT_SECONDS = 5;
const RING_RADIUS = 88;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type Props = {
  /** When answering closes. */
  endsAt: string;
  durationSeconds: number;
  className?: string;
};

/** Seconds-left ring; ticks on its own so nothing else re-renders with it. */
const HostRoundTimer = ({ endsAt, durationSeconds, className }: Props) => {
  const totalMs = durationSeconds * 1000;
  // Start full so server and client render the same frame; the first tick syncs to the clock.
  const [remainingMs, setRemainingMs] = useState(totalMs);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const timer = setInterval(() => setRemainingMs(Math.max(0, end - Date.now())), TICK_MS);
    return () => clearInterval(timer);
  }, [endsAt]);

  const seconds = Math.ceil(remainingMs / 1000);
  const progress = Math.min(1, remainingMs / totalMs);
  const urgent = seconds <= URGENT_SECONDS;

  return (
    <div
      role="timer"
      aria-label={`เหลือเวลา ${seconds} วินาที`}
      className={cn(
        "relative flex size-36 items-center justify-center rounded-full bg-[radial-gradient(circle,#2c1878_0%,#140a3c_70%)] shadow-[0_0_0_3px_#8f5cff,0_0_30px_6px_rgb(143,92,255,0.55)]",
        className,
      )}
    >
      <svg viewBox="0 0 200 200" aria-hidden className="absolute inset-0 size-full -rotate-90">
        <defs>
          <linearGradient id="studio-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff2c4" />
            <stop offset="55%" stopColor="#ffbf47" />
            <stop offset="100%" stopColor="#f0862c" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={RING_RADIUS} fill="none" strokeWidth="12" className="stroke-white/10" />
        <circle
          cx="100"
          cy="100"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
          stroke={urgent ? "#ff4f6d" : "url(#studio-ring)"}
          className="transition-[stroke-dashoffset] duration-100 ease-linear"
          style={{ filter: `drop-shadow(0 0 6px ${urgent ? "#ff4f6d" : "#ffbf47"})` }}
        />
      </svg>
      {/* The last seconds pop in one by one (keyed), in sync with the beeps. */}
      <span
        key={urgent ? seconds : "calm"}
        className={cn(
          "relative text-7xl leading-none",
          urgent
            ? "font-studio animate-countdown-pop font-extrabold text-[#ff6b84] [text-shadow:0_3px_0_#4a0b2a,0_0_18px_rgb(255,79,109,0.7)]"
            : "studio-title",
        )}
      >
        {seconds}
      </span>
    </div>
  );
};

export default HostRoundTimer;
