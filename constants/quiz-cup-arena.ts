import type { QuizCupArenaPhase } from "@/types/quiz-cup";

import { STUDIO_STATUS_COLORS } from "@/constants/quiz-cup-studio";

/**
 * Layout of the Quiz Cup TV studio (Three.js metres, y up, the audience/camera side is +Z).
 *
 *            screen + layered frames (back)
 *                 central stage
 *   player platform ↙          ↘ host platform
 *   (stage left, curved)        (stage right)
 *        audience  ·  glossy floor  ·  audience
 *                    main camera
 *
 * Everything that is laid out around the stage is placed in polar coordinates about
 * STUDIO_CENTER: angle 90° points at the camera, 270° at the screen.
 */

const DIR = "/quiz-cup/arena";

export const ARENA_MODELS = {
  /** The rigged character, used for the contestants and (re-dressed) for the host. */
  player: `${DIR}/player01.glb`,
} as const;

/** Centre of the central stage; the polar origin for the whole set. */
export const STUDIO_CENTER = { x: 0, z: -5.5 } as const;

export function polar(radius: number, degrees: number, y = 0): [number, number, number] {
  const a = (degrees * Math.PI) / 180;
  return [STUDIO_CENTER.x + Math.cos(a) * radius, y, STUDIO_CENTER.z + Math.sin(a) * radius];
}

/** Central stage tiers, top to bottom: radius, height of the tier top. */
export const STAGE_TIERS = [
  { r: 3.6, top: 0.72 },
  { r: 4.2, top: 0.48 },
  { r: 4.8, top: 0.24 },
] as const;

/**
 * The contestant platform, stage left: a curved racetrack slab following PLAYER_PATH. The
 * first podiums stand side by side across the front (as in the concept art); a longer row
 * curves back towards the screen.
 */
export const PLAYER_PATH: [number, number][] = [
  [-1.9, -0.4],
  [-4.0, -0.75],
  [-5.9, -1.75],
  [-6.85, -3.9],
  [-6.6, -6.6],
  [-5.8, -9.0],
];
export const PLAYER_PLATFORM = { halfWidth: 0.95, top: 0.26, capExtra: 0.75 } as const;

/** Evenly spaced points (and the path direction) along PLAYER_PATH, by arc length. */
export function alongPlayerPath(distances: number[]): { x: number; z: number }[] {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < PLAYER_PATH.length; i++) {
    const [ax, az] = PLAYER_PATH[i - 1];
    const [bx, bz] = PLAYER_PATH[i];
    const l = Math.hypot(bx - ax, bz - az);
    seg.push(l);
    total += l;
  }
  return distances.map((d0) => {
    let d = Math.min(Math.max(d0, 0), total);
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) {
        const t = Math.min(1, d / seg[i]);
        const [ax, az] = PLAYER_PATH[i];
        const [bx, bz] = PLAYER_PATH[i + 1];
        return { x: ax + (bx - ax) * t, z: az + (bz - az) * t };
      }
      d -= seg[i];
    }
    const [x, z] = PLAYER_PATH[PLAYER_PATH.length - 1];
    return { x, z };
  });
}

export function playerPathLength() {
  let total = 0;
  for (let i = 1; i < PLAYER_PATH.length; i++) {
    total += Math.hypot(PLAYER_PATH[i][0] - PLAYER_PATH[i - 1][0], PLAYER_PATH[i][1] - PLAYER_PATH[i - 1][1]);
  }
  return total;
}

/** Host platform and the host's mark, stage right. */
export const HOST_PLATFORM = { radius: 6.1, angle: 48, width: 3.2, depth: 2.4, top: 0.24 } as const;

/** Main LED screen (behind the central stage), framed by the layered portal. */
export const QUIZ_CUP_SCREEN = { width: 7.2, height: 4.05, centerY: 3.25, z: -11.0 } as const;

/** Where the contestants and the host face: between the stage front and the main camera. */
export const FACING_POINT = { x: 0.6, z: 5.5 } as const;

export function facingYaw(x: number, z: number) {
  return Math.atan2(FACING_POINT.x - x, FACING_POINT.z - z);
}

const hostSpot = polar(HOST_PLATFORM.radius, HOST_PLATFORM.angle, HOST_PLATFORM.top);
/** Host podium position (on the host platform) and the way it faces. */
export const ARENA_HOST_POSITION: [number, number, number] = hostSpot;
export const ARENA_HOST_YAW = facingYaw(hostSpot[0], hostSpot[2]);

/** Player origin sits behind its podium's back face. */
export const ARENA_PLAYER_BEHIND = 0.5;

/** Podium materials recoloured per player status (see studio-podium.ts). */
export const PODIUM_LED_KEYS = ["LED_Top", "LED_Vertical", "Screen_Border", "LED_Base"] as const;

/** Podium LED colour per player status. */
export const PODIUM_STATUS_COLORS = STUDIO_STATUS_COLORS;

export const ARENA_MAX_PLAYERS = 12;

export type PodiumSlot = {
  x: number;
  /** Height of the platform top the podium stands on. */
  y: number;
  z: number;
  /** Rotation about Y so the podium faces FACING_POINT. */
  yaw: number;
  /** Podium (and player) scale: smaller as the row fills up. */
  scale: number;
};

const SLOT_SPACING_MAX = 1.42;
const SLOT_SPACING_MIN = 0.9;
const SLOT_START = 0.35;

/** Podium positions for n players along the contestant platform (see PLAYER_PATH). */
export function podiumSlots(count: number): PodiumSlot[] {
  const n = Math.min(Math.max(count, 0), ARENA_MAX_PLAYERS);
  const usable = playerPathLength() - SLOT_START * 2;
  const spacing = n > 1 ? Math.max(SLOT_SPACING_MIN, Math.min(SLOT_SPACING_MAX, usable / (n - 1))) : 0;
  const scale = Math.min(1.02, spacing > 0 ? spacing * 0.72 : 1.02);
  return alongPlayerPath(Array.from({ length: n }, (_, i) => SLOT_START + i * spacing)).map(({ x, z }) => ({
    x,
    y: PLAYER_PLATFORM.top,
    z,
    yaw: facingYaw(x, z),
    scale,
  }));
}

export type CameraShot = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

/**
 * One shot per game phase (ArenaCamera eases between them):
 *  - question: the concept's primary view: screen centre, players left, host right, floor
 *    in the foreground, rig overhead
 *  - reveal: in on the player platform, every podium and head tag in frame
 *  - leaderboard: the wide, high "birds-eye" view
 */
export const CAMERA_SHOTS: Record<Exclude<QuizCupArenaPhase, "intro">, CameraShot> = {
  question: { position: [1.6, 2.9, 10.8], target: [-0.5, 2.55, -4.6], fov: 50 },
  reveal: { position: [1.8, 2.7, 6.4], target: [-3.9, 1.5, -3.2], fov: 50 },
  leaderboard: { position: [0, 8.6, 14.2], target: [0, 1.3, -4.8], fov: 50 },
};

/** Intro: a slow orbit round the studio that settles into the question shot. */
export const CAMERA_INTRO = { radius: 15.5, height: 6.2, seconds: 5.5, fov: 50, target: [0, 2, -5] as [number, number, number] };

/** Close-up on one player: in front of their podium, looking at the head. */
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
