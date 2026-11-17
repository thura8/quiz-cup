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
  trim?: string;
  trouserCuff?: string;
  metal?: string;
  belt?: string;
  buckle?: string;
  mic?: string;
  micGrille?: string;
};

export type HandStyle = "open" | "mic";

export type GlassesSpec = {
  lensX: number;
  lensY: number;
  radius: number;
  rim: number;
  standoff: number;
  bridgeY: number;
  templeY: number;
  sideTempleY: number;
  sideLensZ: [number, number];
  sideLensY: [number, number];
  color: string;
  lens?: string;
};

export type HeadTraceTuning = {
  skinSamples: [number, number][];
  hairSamples: [number, number][];
  hairMaxLuma: number;
  hairMaxWarmth: number;
  frontHairWins: boolean;
  frontHairMinNz?: number;
  fadeFaceEdge?: boolean;
  clearDrawnEars: boolean;
  faceSlim: number;
  /** Rounds the cranium: pulls the back of the skull in and the forehead back above `from` (metres). */
  roundHead?: { from: number; backScale: number; foreheadIn: number };
  fitJaw?: boolean;
  drape?: { top: number; bottom: number; excludeBelow: number; maxFront?: number };
  hairMinLuma?: number;
  hairMinWarmth?: number;
  hairMaxChroma?: number;
  bands: {
    headBottom: number;
    chin: [number, number];
    ear: [number, number];
    faceWidth: [number, number];
    nose: [number, number];
    jawCenterLimit: number;
    slimTop: number;
    flattenFront?: [number, number];
  };
  neck: { radius: number; z: number; bottom: number };
};

export type OutfitDetails = {
  strip?: { bottom: number; top: number; halfBottom: number; halfTop: number; pattern: boolean };
  lapel?: { start: number; full: number; width: number };
  belt?: { y: [number, number]; half: number; buckleHalf: number };
  hemBand?: number;
  buttons: number[];
  shirtButtons?: number[];
  drawstrings?: { x: number; top: number; bottom: number; spread: number };
  zipper?: boolean;
  ribbed?: boolean;
  flaps?: { y: [number, number]; x: [number, number] };
  pocketLines: { y: number; x: [number, number]; rise?: number }[];
  backSeamTop?: number;
  logo?: { text: string; y: number; height: number; color: string; outline?: string };
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
  collar?: { profile: Profile; frontGap: number; centerZ: number; material: "shirt" | "jacket" };
  hood?: {
    rim: { center: Vec3; radiusX: number; radiusZ: number; drop: number; sweep: number; tube: number };
    shell: { top: number; height: number; halfWidth: number; thickness: number; restOn: number };
  };
  sleeve: {
    upper: Profile;
    forearm: Profile;
    shoulderRadius: number;
    elbowRadius: number;
    folds?: boolean;
    short?: { end: number; hemRadius: number; skin: Profile };
    cuff: { from: number; to: number; profile: Profile; material: "shirt" | "cuff" };
  };
  hands: Sides<HandStyle>;
  seat: { center: Vec3; radii: Vec3 };
  leg: {
    top: Sides<Vec3>;
    ankle: Sides<Vec3>;
    profile: Profile;
    rolledCuff?: { from: number; radius: number };
    bareAnkle?: { length: number; radius: number };
  };
  shoe: { center: Sides<Vec3>; size: Vec3; toeOut: number; toeCap?: boolean };
  beltBand?: { y: [number, number]; radius: number; depthRatio: number; centerZ: number; buckle: [number, number] };
  head: { center: Vec3; radii: Vec3 };
  neck: { from: Vec3; to: Vec3; radius: number };
  trace: HeadTraceTuning;
  reshapeTemples: boolean;
  hideEars?: boolean;
  /** Soften hard hair/skin edges left on the head texture at the temples and beard sides. */
  softenSeams?: boolean;
  noseStyle?: { minDepth: number; frontOnly: boolean; width?: number; height?: number; yOffset?: number; hidden?: boolean; wedge?: boolean };
  glasses?: GlassesSpec;
  poses: PoseSet;
  stageScale?: number;
};
