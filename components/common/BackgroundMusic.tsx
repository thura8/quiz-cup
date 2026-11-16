"use client";

import { useLoopSound } from "@/hooks/shared/useSound";

type Props = {
  src: string;
  volume?: number;
  /** Stream instead of decoding into memory — use for long tracks. */
  stream?: boolean;
};

// Renders nothing — just loops an audio track for as long as it's mounted.
const BackgroundMusic = ({ src, volume, stream }: Props) => {
  useLoopSound(src, { volume, stream });
  return null;
};

export default BackgroundMusic;
