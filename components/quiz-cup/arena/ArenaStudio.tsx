"use client";

import StudioSet from "./StudioSet";
import LightPools from "./studio-set/LightPools";
import MainScreen, { preloadMainScreen } from "./studio-set/MainScreen";
import NeonPortal from "./studio-set/NeonPortal";
import StudioRig from "./studio-set/StudioRig";

type ArenaStudioProps = { pools?: boolean; reflections?: boolean };

export default function ArenaStudio({ pools = true, reflections = false }: ArenaStudioProps) {
  return (
    <>
      <StudioSet reflections={reflections} />
      <MainScreen />
      <NeonPortal />
      <StudioRig />
      {pools && <LightPools />}
    </>
  );
}

export function preloadArenaStudio() {
  preloadMainScreen();
}
