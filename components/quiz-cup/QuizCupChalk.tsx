"use client";

import { ChalkEffect } from "@/components/ChalkEffect";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A hand-drawn chalk outline laid over its positioned parent. */
export function ChalkFrame({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <ChalkEffect
      as="span"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 border-2",
        active ? "border-primary border-3" : "border-white/60",
        className,
      )}
    />
  );
}

export function ChalkIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <ChalkEffect as="span" variant="icon" className="inline-flex shrink-0">
      <Icon className={cn("size-6", className)} />
    </ChalkEffect>
  );
}

/** A dimmed, chalk-outlined panel — the base surface of every Quiz Cup screen. */
export function Board({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative rounded-4xl bg-black/45 p-4 backdrop-blur-sm sm:p-6",
        className,
      )}
    >
      <ChalkFrame className="rounded-4xl border-4 border-white/80" />
      <div className="relative">{children}</div>
    </section>
  );
}

/** Three rising bars, the first `filled` lit in chalk yellow. */
export function DifficultyBars({ filled }: { filled: number }) {
  return (
    <span aria-hidden className="flex h-4 items-end gap-0.5">
      {[0.4, 0.7, 1].map((height, index) => (
        <span
          key={height}
          className={cn(
            "w-1.5 rounded-sm",
            index < filled ? "bg-highlight-yellow" : "bg-white/25",
          )}
          style={{ height: `${height * 100}%` }}
        />
      ))}
    </span>
  );
}

export const CHOICE_LETTERS = ["A", "B", "C", "D"];

/** Each choice keeps its own chalk colour on every screen. */
export const CHOICE_COLORS = [
  {
    ring: "border-highlight-blue bg-highlight-blue/15",
    text: "text-highlight-blue",
  },
  {
    ring: "border-highlight-pink bg-highlight-pink/15",
    text: "text-highlight-pink",
  },
  {
    ring: "border-highlight-green bg-highlight-green/15",
    text: "text-highlight-green",
  },
  {
    ring: "border-highlight-yellow bg-highlight-yellow/15",
    text: "text-highlight-yellow",
  },
];

/** The chalk-circled A–D letter in front of a choice. */
export function ChoiceBadge({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center",
        className,
      )}
    >
      <ChalkEffect
        as="span"
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full border-3",
          CHOICE_COLORS[index].ring,
        )}
      />
      <span
        className={cn(
          "font-display subtitle relative",
          CHOICE_COLORS[index].text,
        )}
      >
        {CHOICE_LETTERS[index]}
      </span>
    </span>
  );
}
