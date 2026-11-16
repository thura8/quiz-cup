"use client";

import { useSoundMuted } from "@/hooks/shared/useSound";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "../ui/button";

type Props = {
  size?: "sm" | "default";
  className?: string;
};

const SoundToggle = ({ size = "sm", className }: Props) => {
  const [muted, setMuted] = useSoundMuted();
  const Icon = muted ? VolumeX : Volume2;

  return (
    <Button
      variant="outline"
      size={size}
      type="button"
      className={cn("bg-transparent px-4 text-white!", className)}
      aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
      aria-pressed={muted}
      onClick={() => setMuted(!muted)}
    >
      <Icon className="size-4" />
    </Button>
  );
};

export default SoundToggle;
