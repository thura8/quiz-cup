"use client";

import * as THREE from "three";

import { STAGE_TIERS, STUDIO_CENTER } from "@/constants/quiz-cup-arena";
import { STUDIO } from "@/constants/quiz-cup-studio";

import { freeze } from "../arena-utils";
import { useBuiltGroup } from "../use-built-group";
import { dotTexture, glow, painted } from "./materials";

const EDGE_RADIUS = 0.08;
const TIER_SIDE_COLORS = ["#6a48d8", "#4b4fc8", "#6a48d8"];
const INLAY_RADII = [1.4, 2.6];

type Tier = (typeof STAGE_TIERS)[number];

function tierSideGeometry(radius: number, top: number) {
  const points: THREE.Vector2[] = [
    new THREE.Vector2(radius - 0.02, 0),
    new THREE.Vector2(radius, 0.02),
    new THREE.Vector2(radius, top - EDGE_RADIUS),
  ];
  for (let k = 1; k <= 6; k++) {
    const angle = (k / 6) * (Math.PI / 2);
    points.push(
      new THREE.Vector2(
        radius - EDGE_RADIUS + Math.cos(angle) * EDGE_RADIUS,
        top - EDGE_RADIUS + Math.sin(angle) * EDGE_RADIUS,
      ),
    );
  }
  return new THREE.LatheGeometry(points, 128);
}

function flatRing(radius: number, tube: number, radialSegments: number, tubularSegments: number) {
  return new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments).rotateX(Math.PI / 2);
}

function tierTopGeometry(index: number, tier: Tier) {
  const innerRadius = index === 0 ? 0 : STAGE_TIERS[index - 1].r - 0.05;
  const outerRadius = tier.r - EDGE_RADIUS + 0.002;
  const geometry =
    index === 0
      ? new THREE.CircleGeometry(outerRadius, 128)
      : new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function addTier(group: THREE.Group, tier: Tier, index: number, lipMaterial: THREE.Material) {
  const side = new THREE.Mesh(tierSideGeometry(tier.r, tier.top), painted(TIER_SIDE_COLORS[index], 0.32, 0.25));
  side.receiveShadow = true;
  group.add(side);

  const lip = new THREE.Mesh(flatRing(tier.r - EDGE_RADIUS * 0.5, 0.024, 8, 200), lipMaterial);
  lip.position.y = tier.top - 0.004;
  group.add(lip);

  const riser = new THREE.Mesh(flatRing(tier.r + 0.003, 0.011, 6, 200), glow(STUDIO.violet, 1.4));
  riser.position.y = tier.top * 0.5;
  group.add(riser);

  const top = new THREE.Mesh(
    tierTopGeometry(index, tier),
    painted("#ffffff", 0.2, 0.45, { map: dotTexture(index === 0 ? 10 : 12) }),
  );
  top.position.y = tier.top;
  top.receiveShadow = true;
  group.add(top);
}

function buildCentralStage() {
  const group = new THREE.Group();
  const lipMaterial = glow(STUDIO.gold, 1.7);
  STAGE_TIERS.forEach((tier, index) => addTier(group, tier, index, lipMaterial));

  for (const radius of INLAY_RADII) {
    const inlay = new THREE.Mesh(flatRing(radius, 0.016, 6, 160), glow(STUDIO.gold, 1.25));
    inlay.position.y = STAGE_TIERS[0].top + 0.004;
    group.add(inlay);
  }

  group.position.set(STUDIO_CENTER.x, 0, STUDIO_CENTER.z);
  group.updateMatrixWorld(true);
  freeze(group);
  return group;
}

export default function CentralStage() {
  const group = useBuiltGroup(buildCentralStage);
  return <primitive object={group} />;
}
