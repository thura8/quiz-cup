import { POSES, type Pose, type PoseSet } from "../player-rig";

export type Vec3 = [number, number, number];

export const MASCOT_HEIGHT = 1.75;

export const MASCOT_PALETTE = {
  jacket: "#2b2d58",
  lapel: "#34376a",
  shirt: "#6a4a8f",
  shirtPattern: "#8462b0",
  trousers: "#2c3852",
  trouserCrease: "#222c42",
  belt: "#1f1f26",
  buckle: "#8a8fa0",
  shoes: "#23252f",
  skin: "#efac87",
  hair: "#1f2024",
  mic: "#1c1c21",
  micGrille: "#34343c",
  outline: "#101024",
} as const;

export const MASCOT_BONES = {
  Hips: [0, 0.95, -0.02],
  Spine: [0, 1.0, -0.02],
  Chest: [0, 1.12, -0.02],
  Neck: [0, 1.38, -0.02],
  Head: [0, 1.45, -0.02],
  UpperArmL: [0.185, 1.32, -0.03],
  UpperArmR: [-0.185, 1.32, -0.03],
  ForearmL: [0.232, 1.065, -0.03],
  ForearmR: [-0.232, 1.065, -0.03],
} as const satisfies Record<string, Vec3>;

export type MascotBone = keyof typeof MASCOT_BONES;

export const BONE_PARENTS: Record<MascotBone, MascotBone | null> = {
  Hips: null,
  Spine: "Hips",
  Chest: "Spine",
  Neck: "Chest",
  Head: "Neck",
  UpperArmL: "Chest",
  UpperArmR: "Chest",
  ForearmL: "UpperArmL",
  ForearmR: "UpperArmR",
};

export const WRIST = {
  L: [0.262, 0.84, -0.022],
  R: [-0.262, 0.84, -0.022],
} as const satisfies Record<string, Vec3>;

export const JACKET = {
  profile: [
    [0.178, 0.745],
    [0.19, 0.785],
    [0.19, 0.83],
    [0.18, 0.9],
    [0.168, 1.0],
    [0.172, 1.1],
    [0.185, 1.2],
    [0.195, 1.28],
    [0.19, 1.33],
    [0.16, 1.365],
    [0.105, 1.385],
    [0.07, 1.392],
  ] as [number, number][],
  depthRatio: 0.8,
  centerZ: -0.025,
  spineToChest: [1.02, 1.16] as [number, number],
  beltY: [0.875, 0.905] as [number, number],
};

export const COLLAR = {
  profile: [
    [0.072, 1.36],
    [0.067, 1.39],
    [0.075, 1.41],
  ] as [number, number][],
  frontGap: 0.55,
  centerZ: -0.02,
};

export const HEAD = {
  center: [0, 1.585, -0.025] as Vec3,
  radii: [0.108, 0.15, 0.118] as Vec3,
};

export const LEG = {
  top: { L: [0.095, 0.93, -0.02], R: [-0.095, 0.93, -0.02] } as Record<"L" | "R", Vec3>,
  ankle: { L: [0.155, 0.1, -0.01], R: [-0.155, 0.1, -0.01] } as Record<"L" | "R", Vec3>,
  profile: [
    [0.084, 0],
    [0.085, 0.15],
    [0.078, 0.4],
    [0.068, 0.55],
    [0.066, 0.75],
    [0.062, 1],
  ] as [number, number][],
};

export const SHOE = {
  center: { L: [0.172, 0.045, 0.03], R: [-0.172, 0.045, 0.03] } as Record<"L" | "R", Vec3>,
  size: [0.11, 0.09, 0.28] as Vec3,
  toeOut: 0.12,
};

const MIC_HOLD: Pose = {
  UpperArmR: [-0.1, 0, -0.05],
  ForearmR: [-2.2, 0, 0.85],
};

export const HOST_POSES: PoseSet = {
  ...POSES,
  idle: { ...POSES.idle, ...MIC_HOLD },
  answered: { ...POSES.answered, ...MIC_HOLD },
};
