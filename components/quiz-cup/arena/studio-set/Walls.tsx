"use client";

import * as THREE from "three";

import { STUDIO_CENTER, polar } from "@/constants/quiz-cup-arena";
import { STUDIO } from "@/constants/quiz-cup-studio";

import { freeze } from "../arena-utils";
import { useBuiltGroup } from "../use-built-group";
import { DEG, arcTube, pillow, sweepArc } from "./geometry";
import { glow, painted } from "./materials";

const WALL = { radius: 15.6, fromDeg: 128, toDeg: 412, height: 10.6 };
const BAY_CENTER_Y = 4.3;
const BAY_HEIGHT = 2.6;
const CEILING_PANEL_SIZE = 2.6;
const CEILING_PANEL_PITCH = 2.9;

function bayGradientMaterial() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "#5a74ff");
  gradient.addColorStop(0.3, "#2c3cb8");
  gradient.addColorStop(1, "#0c1048");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
  material.color.setScalar(0.42);
  return material;
}

function addBaysAndPilasters(group: THREE.Group) {
  const { radius, fromDeg, toDeg } = WALL;
  const bayCount = Math.round((22 * radius) / 13.8);
  const span = toDeg - fromDeg;

  const bayMaterial = bayGradientMaterial();
  const pilasterMaterial = painted("#4a35b0", 0.3, 0.2);
  const pilasterGlowMaterial = glow(STUDIO.violet, 1.5);

  for (let i = 0; i < bayCount; i++) {
    const deg = fromDeg + ((i + 0.5) / bayCount) * span;
    const [x, , z] = polar(radius - 0.05, deg);
    const width = (span / bayCount) * DEG * radius * 0.82;
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(width, BAY_HEIGHT), bayMaterial);
    bay.position.set(x, BAY_CENTER_Y, z);
    bay.lookAt(STUDIO_CENTER.x, BAY_CENTER_Y, STUDIO_CENTER.z);
    group.add(bay);
  }

  for (let i = 0; i <= bayCount; i++) {
    const deg = fromDeg + (i / bayCount) * span;
    group.add(new THREE.Mesh(sweepArc(radius, deg - 0.9, deg + 0.9, pillow(0.38, 2.6, 5.9), 6), pilasterMaterial));
    const glowStrip = sweepArc(
      radius - 0.385,
      deg - 0.35,
      deg + 0.35,
      [
        [0, 2.75],
        [0.01, 2.75],
        [0.01, 5.75],
        [0, 5.75],
      ],
      3,
    );
    group.add(new THREE.Mesh(glowStrip, pilasterGlowMaterial));
  }
}

function addFasciaBands(group: THREE.Group) {
  const { radius, fromDeg, toDeg } = WALL;
  const band = (inset: number, profile: [number, number][], material: THREE.Material) =>
    group.add(new THREE.Mesh(sweepArc(radius - inset, fromDeg, toDeg, profile, 180), material));
  const trim = (inset: number, y: number, tubeRadius: number, material: THREE.Material) =>
    group.add(new THREE.Mesh(arcTube(radius - inset, fromDeg, toDeg, y, tubeRadius), material));

  band(0, pillow(0.55, 5.95, 6.55), painted("#5b40c8", 0.3, 0.2));
  band(0.02, pillow(0.25, 6.62, 7.02), glow(STUDIO.coral, 1.3));
  band(0, pillow(0.62, 7.08, 8.2), painted("#3a2a9a", 0.32, 0.2));
  trim(0.55, 5.94, 0.03, glow(STUDIO.violet, 1.7));
  trim(0.6, 8.22, 0.035, glow("#ff8fd8", 1.4));
  trim(0.05, 2.55, 0.025, glow(STUDIO.violet, 1.3));
}

function ceilingPanelPositions(radius: number, y: number) {
  const positions: THREE.Vector3[] = [];
  const cells = Math.ceil(radius / CEILING_PANEL_PITCH);
  for (let ix = -cells; ix <= cells; ix++) {
    for (let iz = -cells; iz <= cells; iz++) {
      const x = ix * CEILING_PANEL_PITCH;
      const z = STUDIO_CENTER.z + iz * CEILING_PANEL_PITCH;
      if (Math.hypot(x - STUDIO_CENTER.x, z - STUDIO_CENTER.z) > radius - 1.5) continue;
      positions.push(new THREE.Vector3(x, y, z));
    }
  }
  return positions;
}

function addCeiling(group: THREE.Group) {
  const { radius, height } = WALL;
  const ceiling = new THREE.Group();
  const backing = new THREE.Mesh(
    new THREE.CircleGeometry(radius + 1, 64).rotateX(Math.PI / 2),
    painted("#0b0920", 0.9, 0),
  );
  backing.position.set(STUDIO_CENTER.x, height, STUDIO_CENTER.z);
  ceiling.add(backing);

  const positions = ceilingPanelPositions(radius, height - 0.02);
  const panels = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(CEILING_PANEL_SIZE, CEILING_PANEL_SIZE).rotateX(Math.PI / 2),
    painted("#15123a", 0.8, 0.1),
    positions.length,
  );
  const matrix = new THREE.Matrix4();
  positions.forEach((position, i) => panels.setMatrixAt(i, matrix.makeTranslation(position)));
  panels.instanceMatrix.needsUpdate = true;
  panels.computeBoundingSphere();
  ceiling.add(panels);

  group.add(ceiling);
}

function buildWalls() {
  const group = new THREE.Group();
  const { radius, fromDeg, toDeg, height } = WALL;
  const backWall = sweepArc(
    radius,
    fromDeg,
    toDeg,
    [
      [0, height],
      [0, 0],
    ],
    180,
    { closed: false },
  );
  group.add(new THREE.Mesh(backWall, painted("#120f34", 0.75, 0.1)));

  addBaysAndPilasters(group);
  addFasciaBands(group);
  addCeiling(group);
  freeze(group);
  return group;
}

export default function Walls() {
  const group = useBuiltGroup(buildWalls);
  return <primitive object={group} />;
}
