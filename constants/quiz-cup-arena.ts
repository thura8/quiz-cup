import type { QuizCupArenaPhase } from "@/types/quiz-cup";

import { STUDIO_STATUS_COLORS } from "@/constants/quiz-cup-studio";

const DIR = "/quiz-cup/arena";

export const ARENA_MODELS = {
  player: `${DIR}/player01.glb`,
  host: `${DIR}/host.glb`,
} as const;

export const STUDIO_CENTER = { x: 0, z: -5.5 } as const;

export function polar(radius: number, degrees: number, y = 0): [number, number, number] {
  const a = (degrees * Math.PI) / 180;
  return [STUDIO_CENTER.x + Math.cos(a) * radius, y, STUDIO_CENTER.z + Math.sin(a) * radius];
}

export const STAGE_TIERS = [
  { r: 3.6, top: 0.72 },
  { r: 4.2, top: 0.48 },
  { r: 4.8, top: 0.24 },
] as const;

export const PLAYER_ARC = {
  apexZ: -11.2,
  radius: 8,
  first: 5.35,
  spacingMin: 1.35,
  spacingMax: 1.6,
  perSide: 6,
} as const;

export const PLAYER_PLATFORM = { halfWidth: 0.85, top: 0.26, capExtra: 0.45 } as const;

export function arcPoint(side: -1 | 1, s: number): { x: number; z: number } {
  const { radius, apexZ } = PLAYER_ARC;
  const a = s / radius;
  return { x: side * radius * Math.sin(a), z: apexZ + radius * (1 - Math.cos(a)) };
}

export const PLAYER_WING_LENGTH = PLAYER_ARC.spacingMin * (PLAYER_ARC.perSide - 1);

export function playerWingPath(side: -1 | 1, samples = 8): [number, number][] {
  const from = PLAYER_ARC.first;
  return Array.from({ length: samples }, (_, i) => {
    const { x, z } = arcPoint(side, from + (PLAYER_WING_LENGTH * i) / (samples - 1));
    return [x, z];
  });
}

export const QUIZ_CUP_SCREEN = { width: 7.2, height: 4.05, centerY: 3.25, z: -11.0 } as const;

export const FACING_POINT = { x: 0, z: 18 } as const;

export function facingYaw(x: number, z: number) {
  return Math.atan2(FACING_POINT.x - x, FACING_POINT.z - z);
}

const hostSpot: [number, number, number] = [STUDIO_CENTER.x, STAGE_TIERS[0].top, STUDIO_CENTER.z];
export const ARENA_HOST_POSITION: [number, number, number] = hostSpot;
export const ARENA_HOST_YAW = facingYaw(hostSpot[0], hostSpot[2]);

export const ARENA_PLAYER_BEHIND = 0.5;

export const PODIUM_LED_KEYS = ["LED_Top", "LED_Vertical", "Screen_Border", "LED_Base"] as const;

export const PODIUM_STATUS_COLORS = STUDIO_STATUS_COLORS;

export const ARENA_MAX_PLAYERS = 12;

export type PodiumSlot = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
};

export function podiumSlots(count: number): PodiumSlot[] {
  const n = Math.min(Math.max(count, 0), ARENA_MAX_PLAYERS);
  const perSide = Math.ceil(n / 2);
  const { first, spacingMin, spacingMax } = PLAYER_ARC;
  const spacing = perSide > 1 ? Math.max(spacingMin, Math.min(spacingMax, PLAYER_WING_LENGTH / (perSide - 1))) : spacingMax;
  const scale = Math.min(0.95, spacing * 0.7);
  return Array.from({ length: n }, (_, i) => {
    const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
    const { x, z } = arcPoint(side, first + Math.floor(i / 2) * spacing);
    return { x, y: PLAYER_PLATFORM.top, z, yaw: facingYaw(x, z), scale };
  });
}

export type CameraShot = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export const CAMERA_SHOTS: Record<Exclude<QuizCupArenaPhase, "intro">, CameraShot> = {
  question: { position: [0, 3.7, 7.4], target: [0, 2.1, -6.8], fov: 52 },
  reveal: { position: [0, 3.5, 6.6], target: [0, 1.8, -6.6], fov: 56 },
  leaderboard: { position: [0, 7.5, 11.5], target: [0, 1.0, -5.5], fov: 50 },
};

export const CAMERA_INTRO = { radius: 15.5, height: 6.2, seconds: 5.5, fov: 50, target: [0, 2, -5] as [number, number, number] };

export const CAMERA_FOCUS = { distance: 3.2, height: 1.9, lookHeight: 1.35, fov: 32 };

export type ArenaQuality = "high" | "medium" | "low";

export const ARENA_QUALITY: Record<
  ArenaQuality,
  { dpr: number; bloom: boolean; shadows: boolean; beams: boolean; reflections: boolean }
> = {
  high: { dpr: 1.5, bloom: true, shadows: true, beams: true, reflections: true },
  medium: { dpr: 1.25, bloom: true, shadows: true, beams: true, reflections: false },
  low: { dpr: 1, bloom: false, shadows: false, beams: false, reflections: false },
};
