import { POSES, type Pose, type PoseSet } from "../../player-rig";
import type { CharacterSpec } from "../mascot-spec";

const MIC_HOLD: Pose = {
  UpperArmR: [-0.1, 0, -0.05],
  ForearmR: [-2.2, 0, 0.85],
};

const HOST_POSES: PoseSet = {
  ...POSES,
  idle: { ...POSES.idle, ...MIC_HOLD },
  answered: { ...POSES.answered, ...MIC_HOLD },
};

export const HOST: CharacterSpec = {
  id: "host",
  rootName: "HostMascot",
  materialPrefix: "Host",
  art: { turnaround: "/concept/host-turnaround.jpeg", enclosedWhiteIsBackground: true },
  glb: "/quiz-cup/arena/host.glb",
  palette: {
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
  },
  bones: {
    Hips: [0, 0.95, -0.02],
    Spine: [0, 1.0, -0.02],
    Chest: [0, 1.12, -0.02],
    Neck: [0, 1.38, -0.02],
    Head: [0, 1.45, -0.02],
    UpperArmL: [0.185, 1.32, -0.03],
    UpperArmR: [-0.185, 1.32, -0.03],
    ForearmL: [0.232, 1.065, -0.03],
    ForearmR: [-0.232, 1.065, -0.03],
  },
  wrist: { L: [0.262, 0.84, -0.022], R: [-0.262, 0.84, -0.022] },
  jacket: {
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
    ],
    depthRatio: 0.8,
    centerZ: -0.025,
    spineToChest: [1.02, 1.16],
  },
  outfit: {
    strip: { bottom: 0.905, top: 1.39, halfBottom: 0.048, halfTop: 0.075, pattern: true },
    lapel: { start: 1.08, full: 1.3, width: 0.06 },
    belt: { y: [0.875, 0.905], half: 0.062, buckleHalf: 0.014 },
    buttons: [1.0, 0.935],
    flaps: { y: [0.83, 0.848], x: [0.095, 0.165] },
    pocketLines: [
      { y: 0.848, x: [0.095, 0.165] },
      { y: 1.175, x: [0.095, 0.165] },
    ],
    backSeamTop: 1.33,
  },
  collar: {
    profile: [
      [0.072, 1.36],
      [0.067, 1.39],
      [0.075, 1.41],
    ],
    frontGap: 0.55,
    centerZ: -0.02,
    material: "shirt",
  },
  sleeve: {
    upper: [
      [0.066, 0],
      [0.064, 0.2],
      [0.058, 0.6],
      [0.054, 1],
    ],
    forearm: [
      [0.054, 0],
      [0.052, 0.5],
      [0.049, 1],
    ],
    shoulderRadius: 0.062,
    elbowRadius: 0.054,
    cuff: {
      from: -0.008,
      to: 0.022,
      profile: [
        [0.046, 0],
        [0.044, 1],
      ],
      material: "shirt",
    },
  },
  hands: { L: "open", R: "mic" },
  seat: { center: [0, 0.86, -0.025], radii: [0.165, 0.1, 0.12] },
  leg: {
    top: { L: [0.095, 0.93, -0.02], R: [-0.095, 0.93, -0.02] },
    ankle: { L: [0.155, 0.1, -0.01], R: [-0.155, 0.1, -0.01] },
    profile: [
      [0.084, 0],
      [0.085, 0.15],
      [0.078, 0.4],
      [0.068, 0.55],
      [0.066, 0.75],
      [0.062, 1],
    ],
  },
  shoe: { center: { L: [0.172, 0.045, 0.03], R: [-0.172, 0.045, 0.03] }, size: [0.11, 0.09, 0.28], toeOut: 0.12 },
  head: { center: [0, 1.585, -0.025], radii: [0.108, 0.15, 0.118] },
  trace: {
    skinSamples: [
      [-0.06, 1.52],
      [0.06, 1.52],
      [0, 1.64],
    ],
    hairSamples: [
      [-0.03, 1.71],
      [0.03, 1.7],
    ],
    frontHairWins: false,
    clearDrawnEars: false,
    faceSlim: 0.9,
    hairMaxLuma: 95,
    hairMaxWarmth: 18,
  },
  reshapeTemples: true,
  poses: HOST_POSES,
};
