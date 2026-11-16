"use client";

import type { UseMockQuizCupRoomResult } from "@/hooks/quiz-cup/useMockQuizCupRoom";
import { cn } from "@/lib/utils";
import { Bot, ChevronDown, FastForward, Play, RotateCcw, UserPlus, Wrench } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type Props = {
  role: "host" | "player";
  dev: UseMockQuizCupRoomResult["dev"];
};

function ToolButton({
  onClick,
  children,
  title,
  active,
}: {
  onClick: () => void;
  children: ReactNode;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs whitespace-nowrap hover:bg-white/15",
        active && "bg-white/20",
      )}
    >
      {children}
    </button>
  );
}

export default function MockDevToolbar({ role, dev }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-3 left-3 z-[100] font-sans text-white">
      {open ? (
        <div className="flex flex-col gap-1 rounded-xl border border-white/15 bg-black/80 p-2 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-1 pb-1 text-[11px] text-white/60">
            <span>
              MOCK · {role} · {dev.roomId} · <b className="text-white">{dev.state ?? "…"}</b>
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="ย่อ">
              <ChevronDown className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {dev.state === "LOBBY" && (
              <ToolButton title="Add a bot to the lobby" onClick={dev.addBot}>
                <UserPlus className="size-3.5" /> Bot
              </ToolButton>
            )}
            {role === "player" && dev.state === "LOBBY" && (
              <ToolButton title="Start with default settings (no host on this demo)" onClick={dev.startNow}>
                <Play className="size-3.5" /> Start
              </ToolButton>
            )}
            {dev.state && dev.state !== "LOBBY" && dev.state !== "FINISHED" && (
              <ToolButton title="End the current timer now" onClick={dev.skip}>
                <FastForward className="size-3.5" /> Skip
              </ToolButton>
            )}
            <ToolButton
              title="Bots answer questions"
              active={dev.botsAnswer}
              onClick={() => dev.setBotsAnswer(!dev.botsAnswer)}
            >
              <Bot className="size-3.5" /> Bots {dev.botsAnswer ? "on" : "off"}
            </ToolButton>
            <ToolButton title="New room" onClick={dev.restart}>
              <RotateCcw className="size-3.5" /> Restart
            </ToolButton>
          </div>
          <div className="flex gap-3 px-1 pt-1 text-[11px] text-white/60">
            <Link className="hover:text-white" href={role === "host" ? "/player" : "/host"}>
              → {role === "host" ? "player" : "host"} view
            </Link>
            <Link className="hover:text-white" href="/gallery">
              → gallery
            </Link>
            <Link className="hover:text-white" href="/">
              → home
            </Link>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mock controls"
          className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/70 backdrop-blur hover:bg-black/90"
        >
          <Wrench className="size-4" />
        </button>
      )}
    </div>
  );
}
