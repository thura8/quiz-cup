export const SOUNDS = {
  bgm: "/sounds/bgm.m4a",
  beep: "/sounds/beep.mp3",
  timeUp: "/sounds/boxing-ring.mp3",
  ticktock: "/sounds/ticktock.wav",
} as const;

export type SoundName = keyof typeof SOUNDS;
