import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type SeatedPose = 0 | 1 | 2;

export const SEATED_POSES: SeatedPose[] = [0, 1, 2];

const ARM_ANGLES: Record<SeatedPose, [left: [number, number], right: [number, number]]> = {
  0: [
    [0.35, 1.2],
    [0.35, 1.2],
  ],
  1: [
    [0.5, 2.3],
    [0.5, 2.3],
  ],
  2: [
    [0.35, 1.2],
    [2.8, 3.0],
  ],
};

function armGeometries(side: number, raise: number, forearm: number) {
  const upper = new THREE.CapsuleGeometry(0.055, 0.22, 2, 8)
    .translate(0, -0.13, 0)
    .rotateX(-raise)
    .translate(side * 0.23, 0.56, 0.02);
  const lower = new THREE.CapsuleGeometry(0.05, 0.2, 2, 8)
    .translate(0, -0.12, 0)
    .rotateX(-forearm)
    .translate(side * 0.23, 0.56 - Math.cos(raise) * 0.26, 0.02 + Math.sin(raise) * 0.26);
  return [upper, lower];
}

export function seatedPersonGeometry(pose: SeatedPose) {
  const torso = new THREE.CapsuleGeometry(0.17, 0.3, 3, 10).translate(0, 0.38, 0);
  const hips = new THREE.SphereGeometry(0.19, 10, 6).scale(1.1, 0.55, 1.3).translate(0, 0.12, 0.04);
  const shoulders = new THREE.SphereGeometry(0.2, 10, 6).scale(1.2, 0.5, 0.8).translate(0, 0.56, 0);
  const leftThigh = new THREE.CapsuleGeometry(0.075, 0.3, 2, 8).rotateX(Math.PI / 2).translate(-0.1, 0.08, 0.22);
  const rightThigh = leftThigh.clone().translate(0.2, 0, 0);

  const [[leftRaise, leftForearm], [rightRaise, rightForearm]] = ARM_ANGLES[pose];
  const bodyParts = [
    torso,
    hips,
    shoulders,
    leftThigh,
    rightThigh,
    ...armGeometries(-1, leftRaise, leftForearm),
    ...armGeometries(1, rightRaise, rightForearm),
  ];

  const head = new THREE.SphereGeometry(0.115, 12, 10).scale(0.92, 1.05, 0.95).translate(0, 0.83, 0.02);
  const hair = new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 0.85, 0.0);
  const body = mergeGeometries(bodyParts.map((part) => part.toNonIndexed()))!;
  bodyParts.forEach((part) => part.dispose());
  return { body, head, hair };
}

export function seatGeometry() {
  return mergeGeometries([
    new THREE.BoxGeometry(0.5, 0.1, 0.46).translate(0, 0.32, 0.02).toNonIndexed(),
    new THREE.BoxGeometry(0.5, 0.5, 0.08).translate(0, 0.58, -0.2).toNonIndexed(),
    new THREE.BoxGeometry(0.06, 0.3, 0.4).translate(-0.27, 0.45, 0).toNonIndexed(),
    new THREE.BoxGeometry(0.06, 0.3, 0.4).translate(0.27, 0.45, 0).toNonIndexed(),
  ])!;
}
