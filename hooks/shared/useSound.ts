"use client";

import { sound } from "@/lib/sound/engine";
import { SOUNDS } from "@/lib/sound/sounds";
import { useEffect, useSyncExternalStore } from "react";

export function useSoundMuted() {
  const muted = useSyncExternalStore(
    sound.subscribe,
    sound.isMuted,
    () => false,
  );
  return [muted, sound.setMuted] as const;
}

function useSoundUnlocked() {
  return useSyncExternalStore(sound.subscribe, sound.isUnlocked, () => false);
}

export function usePreloadSounds(srcs: string[]) {
  const key = srcs.join("|");
  useEffect(() => {
    sound.preload(key.split("|"));
  }, [key]);
}

export function useLoopSound(
  src: string,
  {
    enabled = true,
    volume = 1,
    fadeIn = 0.3,
    fadeOut = 0.3,
    stream = false,
  } = {},
) {
  useEffect(() => {
    if (!enabled) return;
    const handle = stream
      ? sound.stream(src, { volume, fadeIn })
      : sound.loop(src, { volume, fadeIn });
    return () => handle.stop(fadeOut);
  }, [src, enabled, volume, fadeIn, fadeOut, stream]);
}

type CountdownSoundOptions = {
  endsAt: string | number | null | undefined;
  tickFrom?: number;
  tickSrc?: string | null;
  timeUpSrc?: string | null;
  tickVolume?: number;
  timeUpVolume?: number;
  enabled?: boolean;
};

export function useCountdownSound({
  endsAt,
  tickFrom = 5,
  tickSrc = SOUNDS.beep,
  timeUpSrc = SOUNDS.timeUp,
  tickVolume = 0.8,
  timeUpVolume = 1,
  enabled = true,
}: CountdownSoundOptions) {
  const muted = useSoundMuted()[0];
  const unlocked = useSoundUnlocked();
  const endsAtMs =
    endsAt == null
      ? null
      : typeof endsAt === "number"
        ? endsAt
        : new Date(endsAt).getTime();

  useEffect(() => {
    sound.preload([tickSrc, timeUpSrc].filter((s): s is string => !!s));
  }, [tickSrc, timeUpSrc]);

  useEffect(() => {
    if (!enabled || muted || endsAtMs == null || Number.isNaN(endsAtMs)) {
      return;
    }
    const handle = sound.scheduleCountdown({
      endsAt: endsAtMs,
      tickFrom,
      tickSrc: tickSrc ?? undefined,
      timeUpSrc: timeUpSrc ?? undefined,
      tickVolume,
      timeUpVolume,
    });
    return () => handle.stop();
  }, [
    enabled,
    muted,
    unlocked,
    endsAtMs,
    tickFrom,
    tickSrc,
    timeUpSrc,
    tickVolume,
    timeUpVolume,
  ]);
}
