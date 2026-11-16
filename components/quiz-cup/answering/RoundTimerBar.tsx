import { Timer } from "lucide-react";

import { cn } from "@/lib/utils";

export default function RoundTimerBar({
  progressPercent,
  seconds,
  hurry,
}: {
  progressPercent: number;
  seconds: number;
  hurry: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/15">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200 ease-linear",
            hurry ? "bg-primary" : "bg-highlight-yellow",
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p
        className={cn(
          "body-2 flex min-w-16 items-center justify-end gap-1 font-semibold whitespace-nowrap tabular-nums",
          hurry && "text-primary-300 animate-pulse",
        )}
      >
        <Timer className="size-4" />
        {seconds} วิ
      </p>
    </div>
  );
}
