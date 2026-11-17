import type { PoseSet } from "../player-rig";

export type Vec3 = [number, number, number];
type Sides<T> = Record<"L" | "R", T>;
type Profile = [number, number][];

export const MASCOT_HEIGHT = 1.75;

export const BONE_PARENTS = {
  Hips: null,
  Spine: "Hips",
  Chest: "Spine",
  Neck: "Chest",
  Head: "Neck",
  UpperArmL: "Chest",
  UpperArmR: "Chest",
  ForearmL: "UpperArmL",
  ForearmR: "UpperArmR",
} as const;

export type MascotBone = keyof typeof BONE_PARENTS;

export type MascotPalette = {
  jacket: string;
  lapel: string;
  shirt: string;
  trousers: string;
  trouserCrease: string;
  shoes: string;
  skin: string;
  hair: string;
  outline: string;
  shirtPattern?: string;
  cuff?: string;
  sole?: string;
  belt?: string;
  buckle?: string;
  mic?: string;
  micGrille?: string;
};

export type HandStyle = "open" | "mic";

export type HeadTraceTuning = {
  skinSamples: [number, number][];
  hairSamples: [number, number][];
  hairMaxLuma: number;
  hairMaxWarmth: number;
  frontHairWins: boolean;
  clearDrawnEars: boolean;
  faceSlim: number;
};

export type OutfitDetails = {
  strip: { bottom: number; top: number; halfBottom: number; halfTop: number; pattern: boolean };
  lapel: { start: number; full: number; width: number };
  belt?: { y: [number, number]; half: number; buckleHalf: number };
  hemBand?: number;
  buttons: number[];
  flaps?: { y: [number, number]; x: [number, number] };
  pocketLines: { y: number; x: [number, number] }[];
  backSeamTop: number;
};

export type CharacterSpec = {
  id: string;
  rootName: string;
  materialPrefix: string;
  art: { turnaround: string; enclosedWhiteIsBackground: boolean };
  glb: string;
  palette: MascotPalette;
  bones: Record<MascotBone, Vec3>;
  wrist: Sides<Vec3>;
  jacket: { profile: Profile; depthRatio: number; centerZ: number; spineToChest: [number, number] };
  outfit: OutfitDetails;
  collar: { profile: Profile; frontGap: number; centerZ: number; material: "shirt" | "jacket" };
  sleeve: {
    upper: Profile;
    forearm: Profile;
    shoulderRadius: number;
    elbowRadius: number;
    cuff: { from: number; to: number; profile: Profile; material: "shirt" | "cuff" };
  };
  hands: Sides<HandStyle>;
  seat: { center: Vec3; radii: Vec3 };
  leg: { top: Sides<Vec3>; ankle: Sides<Vec3>; profile: Profile };
  shoe: { center: Sides<Vec3>; size: Vec3; toeOut: number };
  head: { center: Vec3; radii: Vec3 };
  trace: HeadTraceTuning;
  reshapeTemples: boolean;
  poses: PoseSet;
};
