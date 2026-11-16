"use client";

import { useLoopSound } from "@/hooks/shared/useSound";

type Props = {
  src: string;
  volume?: number;
  stream?: boolean;
};

const BackgroundMusic = ({ src, volume, stream }: Props) => {
  useLoopSound(src, { volume, stream });
  return null;
};

export default BackgroundMusic;
