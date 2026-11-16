"use client";

import { useProgress } from "@react-three/drei";

import { STUDIO } from "@/constants/quiz-cup-studio";
import { cn } from "@/lib/utils";

export default function LoadingCover({ ready }: { ready: boolean }) {
  const { progress } = useProgress();
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-700",
        ready ? "opacity-0" : "opacity-100",
      )}
      style={{ background: STUDIO.backdrop }}
    >
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
          style={{ width: `${ready ? 100 : Math.min(progress, 99)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-white/60">
        {progress < 100 ? "กำลังโหลดเวที…" : "เตรียมเวที…"}
      </span>
    </div>
  );
}
