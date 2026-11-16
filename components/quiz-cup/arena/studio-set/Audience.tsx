"use client";

import * as THREE from "three";

import { STUDIO_CENTER, polar } from "@/constants/quiz-cup-arena";
import { STUDIO } from "@/constants/quiz-cup-studio";

import { useBuiltGroup } from "../use-built-group";
import { SEATED_POSES, type SeatedPose, seatGeometry, seatedPersonGeometry } from "./audience-people";
import { DEG, arcTube, pillow, sweepArc } from "./geometry";
import { glow, painted } from "./materials";

const AUDIENCE = {
  rows: 5,
  firstRadius: 10.4,
  rowDepth: 0.95,
  rise: 0.42,
  seatSpacing: 0.62,
  blocks: [
    { from: 120, to: 226 },
    { from: -46, to: 60 },
  ],
  barrier: 9.6,
};

const OCCUPANCY = 0.88;
const CLOTHES = ["#1e1a40", "#28204e", "#161e40", "#33203f", "#1d2a48", "#3a2236", "#1d2030", "#3d2a20", "#4a3866", "#2b3556"];
const SKIN = ["#8a6050", "#704a3c", "#9a7864", "#5a3a2e", "#8f6a54", "#4a2e24"];
const HAIR = ["#1a1210", "#2b1a12", "#3b2a1a", "#0e0c10", "#5a3a22"];

type Block = (typeof AUDIENCE.blocks)[number];
type Seat = { x: number; y: number; z: number; yaw: number };
type Person = { seat: Seat; pose: SeatedPose };
type Random = () => number;

function seededRandom(seed: number): Random {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

const pick = <T,>(items: T[], random: Random) => items[Math.floor(random() * items.length)];

function rowRadius(row: number) {
  return AUDIENCE.firstRadius + row * AUDIENCE.rowDepth;
}

function rowHeight(row: number) {
  return (row + 1) * AUDIENCE.rise;
}

function addRisers(group: THREE.Group) {
  const riserMaterial = painted("#1c1a4a", 0.6, 0.15);
  const noseMaterial = glow(STUDIO.violet, 1.25);
  const { rowDepth } = AUDIENCE;
  for (const block of AUDIENCE.blocks) {
    for (let row = 0; row < AUDIENCE.rows; row++) {
      const innerRadius = rowRadius(row) - 0.5;
      const height = rowHeight(row);
      const step: [number, number][] = [
        [0, 0],
        [0, height],
        [rowDepth, height],
        [rowDepth, 0],
      ];
      group.add(new THREE.Mesh(sweepArc(innerRadius + rowDepth, block.from, block.to, step, 64), riserMaterial));
      group.add(new THREE.Mesh(arcTube(innerRadius + 0.02, block.from, block.to, height + 0.005, 0.012), noseMaterial));
    }
  }
}

function layoutSeats(): Seat[] {
  const seats: Seat[] = [];
  for (const block of AUDIENCE.blocks) {
    for (let row = 0; row < AUDIENCE.rows; row++) {
      const radius = rowRadius(row);
      const y = rowHeight(row);
      const count = Math.floor(((block.to - block.from) * DEG * radius) / AUDIENCE.seatSpacing);
      for (let i = 0; i < count; i++) {
        const deg = block.from + ((i + 0.5) / count) * (block.to - block.from);
        const [x, , z] = polar(radius, deg);
        seats.push({ x, y, z, yaw: Math.atan2(STUDIO_CENTER.x - x, STUDIO_CENTER.z - z) });
      }
    }
  }
  return seats;
}

function choosePose(random: Random): SeatedPose {
  const roll = random();
  return roll < 0.62 ? 0 : roll < 0.9 ? 1 : 2;
}

function addSeatsAndSeatPeople(group: THREE.Group, seats: Seat[], random: Random) {
  const seatMesh = new THREE.InstancedMesh(seatGeometry(), painted("#3a2350", 0.7, 0.05), seats.length);
  const people: Person[] = [];
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const unitScale = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();

  seats.forEach((seat, i) => {
    rotation.setFromEuler(euler.set(0, seat.yaw, 0));
    seatMesh.setMatrixAt(i, matrix.compose(position.set(seat.x, seat.y, seat.z), rotation, unitScale));
    if (random() < OCCUPANCY) people.push({ seat, pose: choosePose(random) });
  });

  seatMesh.instanceMatrix.needsUpdate = true;
  seatMesh.receiveShadow = true;
  group.add(seatMesh);
  return people;
}

function addCrowd(group: THREE.Group, people: Person[], random: Random) {
  const geometries = SEATED_POSES.map(seatedPersonGeometry);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const color = new THREE.Color();

  for (const pose of SEATED_POSES) {
    const posed = people.filter((person) => person.pose === pose);
    const bodies = new THREE.InstancedMesh(geometries[pose].body, painted("#ffffff", 0.8, 0), posed.length);
    const heads = new THREE.InstancedMesh(geometries[pose].head, painted("#ffffff", 0.6, 0), posed.length);
    const hairs = new THREE.InstancedMesh(geometries[pose].hair, painted("#ffffff", 0.7, 0), posed.length);

    posed.forEach(({ seat }, i) => {
      euler.set((random() - 0.5) * 0.12, seat.yaw + (random() - 0.5) * 0.4, (random() - 0.5) * 0.08);
      rotation.setFromEuler(euler);
      const size = 0.92 + random() * 0.16;
      matrix.compose(position.set(seat.x, seat.y + 0.3, seat.z + 0), rotation, scale.set(size, size * (0.94 + random() * 0.12), size));
      bodies.setMatrixAt(i, matrix);
      heads.setMatrixAt(i, matrix);
      hairs.setMatrixAt(i, matrix);
      bodies.setColorAt(i, color.set(pick(CLOTHES, random)));
      heads.setColorAt(i, color.set(pick(SKIN, random)));
      hairs.setColorAt(i, color.set(pick(HAIR, random)));
    });

    for (const mesh of [bodies, heads, hairs]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
  }
}

function addBarrier(group: THREE.Group, block: Block) {
  const radius = AUDIENCE.barrier;
  group.add(new THREE.Mesh(sweepArc(radius + 0.3, block.from + 1, block.to - 1, pillow(0.3, 0, 1.15)), painted("#5a3cc8", 0.35, 0.2)));
  group.add(new THREE.Mesh(sweepArc(radius + 0.01, block.from + 2, block.to - 2, pillow(0.04, 0.42, 0.72)), glow(STUDIO.blue, 0.9)));
  group.add(new THREE.Mesh(arcTube(radius - 0.02, block.from + 1.5, block.to - 1.5, 1.13, 0.02), glow(STUDIO.violet, 1.6)));
  group.add(new THREE.Mesh(arcTube(radius - 0.02, block.from + 1.5, block.to - 1.5, 0.06, 0.015), glow(STUDIO.gold, 1.3)));
}

function buildAudience() {
  const group = new THREE.Group();
  const random = seededRandom(21);

  addRisers(group);
  const people = addSeatsAndSeatPeople(group, layoutSeats(), random);
  addCrowd(group, people, random);
  for (const block of AUDIENCE.blocks) addBarrier(group, block);

  return group;
}

export default function Audience() {
  const group = useBuiltGroup(buildAudience);
  return <primitive object={group} />;
}
