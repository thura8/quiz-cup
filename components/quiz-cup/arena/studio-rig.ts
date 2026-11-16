/**
 * The studio's lighting rig: a straight box-truss grid over the stage (in place of the old
 * round rig) and the fixtures hung on it. The fixture list also drives the fake volumetric
 * beams (ArenaBeams) and the light pools they leave on the floor (ArenaStudio).
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  ARENA_HOST_POSITION,
  PLAYER_PLATFORM,
  QUIZ_CUP_SCREEN,
  STAGE_TIERS,
  alongPlayerPath,
  STUDIO_CENTER,
  polar,
} from "@/constants/quiz-cup-arena";

export type FixtureKind = "Wash" | "MovingHead" | "Accent";

export type Fixture = {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  kind: FixtureKind;
};

export const TRUSS_Y = 8.9;

const X_SPANS = [3.0, -1.6, -6.2, -10.6]; // z of the cross-stage spans
const Z_SPANS = [-8.6, -3.2, 3.2, 8.6]; // x of the front-to-back spans

/** Straight spans of the grid: [from, to]. */
export const TRUSS_SPANS: [THREE.Vector3, THREE.Vector3][] = [
  ...X_SPANS.map((z) => [new THREE.Vector3(-10.5, TRUSS_Y, z), new THREE.Vector3(10.5, TRUSS_Y, z)] as [THREE.Vector3, THREE.Vector3]),
  ...Z_SPANS.map((x) => [new THREE.Vector3(x, TRUSS_Y - 0.36, -12.4), new THREE.Vector3(x, TRUSS_Y - 0.36, 4.6)] as [THREE.Vector3, THREE.Vector3]),
];

const HANG = 0.32; // fixture hangs under the truss

function aimed(x: number, z: number, target: [number, number, number], kind: FixtureKind, y = TRUSS_Y - HANG): Fixture {
  const position = new THREE.Vector3(x, y, z);
  return { position, direction: new THREE.Vector3(...target).sub(position).normalize(), kind };
}

const C = STUDIO_CENTER;
const TOP = STAGE_TIERS[0].top;
/** A point `d` metres along the contestant row, at podium-top height. */
const players = (d: number, y = PLAYER_PLATFORM.top + 0.6): [number, number, number] => {
  const [{ x, z }] = alongPlayerPath([d]);
  return [x, y, z];
};

/**
 * Where every light points: warm washes converging on the central stage, specials on the
 * contestant platform and the host, accents on the set and the audience. These draw the
 * visible cones (ArenaBeams) and the pools on the floor (ArenaStudio).
 */
export const STUDIO_FIXTURES: Fixture[] = [
  // Rear span: back-light fanning forward over the stage.
  aimed(-6.4, -10.6, [-2.6, TOP, -3.6], "MovingHead"),
  aimed(-2.2, -10.6, [-0.9, TOP, -2.6], "Wash"),
  aimed(2.2, -10.6, [0.9, TOP, -2.6], "Wash"),
  aimed(6.4, -10.6, [2.6, TOP, -3.6], "MovingHead"),
  // Mid span: converging on the stage centre and the platforms.
  aimed(-7.6, -6.2, players(9), "Wash"),
  aimed(-3.6, -6.2, [C.x - 1, TOP, C.z + 0.8], "MovingHead"),
  aimed(0, -6.2, [C.x, TOP, C.z + 1.6], "Wash"),
  aimed(3.6, -6.2, [C.x + 1, TOP, C.z + 0.8], "MovingHead"),
  aimed(7.6, -6.2, polar(9.5, 10, 1.8), "Accent"),
  // Front-of-stage span: players, host, stage front.
  aimed(-8.6, -1.6, players(5.5), "Wash"),
  aimed(-4.8, -1.6, players(2.6), "MovingHead"),
  aimed(-1.4, -1.6, [C.x - 0.6, TOP, C.z + 2.6], "Accent"),
  aimed(1.4, -1.6, [C.x + 0.6, TOP, C.z + 2.6], "Accent"),
  aimed(5.2, -1.6, [ARENA_HOST_POSITION[0], 1.2, ARENA_HOST_POSITION[2]], "MovingHead"),
  aimed(8.6, -1.6, polar(9.5, 40, 1.8), "Accent"),
  // Front span: across the floor and onto the audience.
  aimed(-8.6, 3.0, polar(9.6, 150, 1.8), "Wash"),
  aimed(-3.2, 3.0, players(0.9), "MovingHead"),
  aimed(3.2, 3.0, [C.x + 2.2, 0, C.z + 6.8], "Wash"),
  aimed(8.6, 3.0, polar(9.6, 25, 1.8), "Wash"),
];

/** The row of lamps on the portal over the main screen; they shine down onto the stage. */
export const SCREEN_LAMPS: THREE.Vector3[] = [-2.9, -1.45, 0, 1.45, 2.9].map(
  (x) => new THREE.Vector3(x, QUIZ_CUP_SCREEN.centerY + QUIZ_CUP_SCREEN.height / 2 + 1.0, QUIZ_CUP_SCREEN.z + 0.9),
);

for (const lamp of SCREEN_LAMPS) {
  STUDIO_FIXTURES.push({
    position: lamp.clone(),
    direction: new THREE.Vector3(lamp.x * 0.7, TOP, C.z - 2.2).sub(lamp).normalize(),
    kind: "Accent",
  });
}

// --- Geometry ------------------------------------------------------------------------------

const SIDE = 0.36; // truss cross-section
const CHORD_R = 0.028;
const LACE_R = 0.012;

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, 6, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** One metre of box truss along +X, centred on the origin. */
export function trussUnitGeometry() {
  const h = SIDE / 2;
  const corners: [number, number][] = [
    [h, h],
    [h, -h],
    [-h, -h],
    [-h, h],
  ];
  const parts: THREE.BufferGeometry[] = [];
  for (const [y, z] of corners) {
    parts.push(cylinderBetween(new THREE.Vector3(-0.5, y, z), new THREE.Vector3(0.5, y, z), CHORD_R));
  }
  // Zig-zag lacing on all four faces.
  for (let i = 0; i < 4; i++) {
    const [y1, z1] = corners[i];
    const [y2, z2] = corners[(i + 1) % 4];
    parts.push(cylinderBetween(new THREE.Vector3(-0.5, y1, z1), new THREE.Vector3(0, y2, z2), LACE_R));
    parts.push(cylinderBetween(new THREE.Vector3(0, y2, z2), new THREE.Vector3(0.5, y1, z1), LACE_R));
  }
  const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Matrices placing one truss unit per metre along every span. */
export function trussMatrices(): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const x = new THREE.Vector3(1, 0, 0);
  const one = new THREE.Vector3(1, 1, 1);
  for (const [a, b] of TRUSS_SPANS) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    dir.normalize();
    q.setFromUnitVectors(x, dir);
    const n = Math.round(len);
    for (let i = 0; i < n; i++) {
      const p = a.clone().addScaledVector(dir, (i + 0.5) * (len / n));
      out.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(len / n, 1, 1).multiply(one)));
    }
  }
  return out;
}

/** A spotlight can: housing along -Y (its beam axis), a yoke above. Lens is separate. */
export function fixtureHousingGeometry() {
  const housing = new THREE.CylinderGeometry(0.13, 0.16, 0.34, 14).translate(0, -0.17, 0);
  const back = new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0, 0);
  const yoke = new THREE.TorusGeometry(0.2, 0.022, 6, 16, Math.PI).rotateZ(Math.PI).translate(0, 0.05, 0);
  const stem = new THREE.CylinderGeometry(0.025, 0.025, HANG - 0.1, 6).translate(0, 0.1 + (HANG - 0.1) / 2, 0);
  const merged = mergeGeometries([housing, back, yoke, stem].map((g) => g.toNonIndexed()))!;
  [housing, back, yoke, stem].forEach((g) => g.dispose());
  return merged;
}

export function fixtureLensGeometry() {
  return new THREE.CircleGeometry(0.125, 20).rotateX(Math.PI / 2).translate(0, -0.345, 0);
}

/** Matrix for a can at `position` whose -Y axis points along `direction`. */
export function fixtureMatrix(position: THREE.Vector3, direction: THREE.Vector3) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
  return new THREE.Matrix4().compose(position, q, new THREE.Vector3(1, 1, 1));
}
