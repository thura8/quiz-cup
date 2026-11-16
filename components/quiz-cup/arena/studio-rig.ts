import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  ARENA_HOST_POSITION,
  PLAYER_ARC,
  PLAYER_PLATFORM,
  QUIZ_CUP_SCREEN,
  STAGE_TIERS,
  STUDIO_CENTER,
  arcPoint,
  polar,
} from "@/constants/quiz-cup-arena";

export type FixtureKind = "Wash" | "MovingHead" | "Accent";

export type Fixture = {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  kind: FixtureKind;
};

export const TRUSS_Y = 8.9;

const X_SPANS = [3.0, -1.6, -6.2, -10.6];
const Z_SPANS = [-8.6, -3.2, 3.2, 8.6];

export const TRUSS_SPANS: [THREE.Vector3, THREE.Vector3][] = [
  ...X_SPANS.map((z) => [new THREE.Vector3(-10.5, TRUSS_Y, z), new THREE.Vector3(10.5, TRUSS_Y, z)] as [THREE.Vector3, THREE.Vector3]),
  ...Z_SPANS.map((x) => [new THREE.Vector3(x, TRUSS_Y - 0.36, -12.4), new THREE.Vector3(x, TRUSS_Y - 0.36, 4.6)] as [THREE.Vector3, THREE.Vector3]),
];

const HANG = 0.32;

function aimed(x: number, z: number, target: [number, number, number], kind: FixtureKind, y = TRUSS_Y - HANG): Fixture {
  const position = new THREE.Vector3(x, y, z);
  return { position, direction: new THREE.Vector3(...target).sub(position).normalize(), kind };
}

const C = STUDIO_CENTER;
const TOP = STAGE_TIERS[0].top;
const wing = (side: -1 | 1, d: number, y = PLAYER_PLATFORM.top + 0.6): [number, number, number] => {
  const { x, z } = arcPoint(side, PLAYER_ARC.first + d);
  return [x, y, z];
};

export const STUDIO_FIXTURES: Fixture[] = [
  aimed(-6.4, -10.6, [-2.6, TOP, -3.6], "MovingHead"),
  aimed(-2.2, -10.6, [-0.9, TOP, -2.6], "Wash"),
  aimed(2.2, -10.6, [0.9, TOP, -2.6], "Wash"),
  aimed(6.4, -10.6, [2.6, TOP, -3.6], "MovingHead"),
  aimed(-7.6, -6.2, wing(-1, 5), "Wash"),
  aimed(-3.6, -6.2, [C.x - 1, TOP, C.z + 0.8], "MovingHead"),
  aimed(0, -6.2, [C.x, TOP, C.z + 1.6], "Wash"),
  aimed(3.6, -6.2, [C.x + 1, TOP, C.z + 0.8], "MovingHead"),
  aimed(7.6, -6.2, wing(1, 5), "Wash"),
  aimed(-8.6, -1.6, wing(-1, 3.2), "Wash"),
  aimed(-4.8, -1.6, wing(-1, 1.1), "MovingHead"),
  aimed(-1.4, -1.6, [ARENA_HOST_POSITION[0] - 0.4, 1.2, ARENA_HOST_POSITION[2]], "Accent"),
  aimed(1.4, -1.6, [ARENA_HOST_POSITION[0] + 0.4, 1.2, ARENA_HOST_POSITION[2]], "Accent"),
  aimed(4.8, -1.6, wing(1, 1.1), "MovingHead"),
  aimed(8.6, -1.6, wing(1, 3.2), "Wash"),
  aimed(-8.6, 3.0, polar(11.6, 160, 2.2), "Wash"),
  aimed(-3.2, 3.0, wing(-1, 4.6), "MovingHead"),
  aimed(3.2, 3.0, wing(1, 4.6), "MovingHead"),
  aimed(8.6, 3.0, polar(11.6, 20, 2.2), "Wash"),
];

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

const SIDE = 0.36;
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

export function fixtureMatrix(position: THREE.Vector3, direction: THREE.Vector3) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
  return new THREE.Matrix4().compose(position, q, new THREE.Vector3(1, 1, 1));
}
