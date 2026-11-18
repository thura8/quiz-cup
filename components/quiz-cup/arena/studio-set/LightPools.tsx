"use client";

import * as THREE from "three";

import { STAGE_TIERS, STUDIO_CENTER } from "@/constants/quiz-cup-arena";
import { STUDIO } from "@/constants/quiz-cup-studio";

import { freeze } from "../arena-utils";
import { STUDIO_FIXTURES } from "../studio-rig";
import { useBuiltGroup } from "../use-built-group";

type Fixture = (typeof STUDIO_FIXTURES)[number];

const STAGE_RADIUS = STAGE_TIERS[0].r - 0.1;
const POOL_SPREAD = { MovingHead: 0.11, Wash: 0.17, Accent: 0.08 } as const;
const DEFAULT_POOL_SPREAD = 0.2;
const MAX_POOL_RADIUS = 3.2;
const STAGE_SURFACE_Y = STAGE_TIERS[0].top + 0.005;
const FLOOR_SURFACE_Y = 0.01;
const POOL_RENDER_ORDER = 2;

function poolTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function additivePoolMaterial(texture: THREE.Texture, color: string, opacity: number) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
}

const isOnStage = (point: THREE.Vector3) =>
  Math.hypot(point.x - STUDIO_CENTER.x, point.z - STUDIO_CENTER.z) < STAGE_RADIUS;

function addFixturePool(
  group: THREE.Group,
  fixture: Fixture,
  plane: THREE.BufferGeometry,
  materials: { floor: THREE.Material; stage: THREE.Material },
) {
  const hit = new THREE.Vector3();
  for (const surfaceY of [STAGE_SURFACE_Y, FLOOR_SURFACE_Y]) {
    const distance = (surfaceY - fixture.position.y) / fixture.direction.y;
    hit.copy(fixture.position).addScaledVector(fixture.direction, distance);
    const landsOnStageSurface = surfaceY > 0.5;
    if (landsOnStageSurface !== isOnStage(hit)) continue;

    const spread = POOL_SPREAD[fixture.kind as keyof typeof POOL_SPREAD] ?? DEFAULT_POOL_SPREAD;
    const radius = Math.min(MAX_POOL_RADIUS, Math.tan(spread) * distance * 1.35 + 0.4);
    const pool = new THREE.Mesh(plane, landsOnStageSurface ? materials.stage : materials.floor);
    pool.position.copy(hit);
    pool.scale.set(radius * 2, 1, radius * 2 * (1 / Math.max(0.35, -fixture.direction.y)));
    pool.rotation.y = Math.atan2(fixture.direction.x, fixture.direction.z);
    group.add(pool);
    return;
  }
}

function buildLightPools() {
  const group = new THREE.Group();
  const texture = poolTexture();
  const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const materials = {
    floor: additivePoolMaterial(texture, STUDIO.gold, 0.15),
    stage: additivePoolMaterial(texture, STUDIO.gold, 0.05),
  };

  for (const fixture of STUDIO_FIXTURES) {
    const aimsTooFlat = fixture.direction.y > -0.15;
    if (aimsTooFlat) continue;
    addFixturePool(group, fixture, plane, materials);
  }

  const halo = new THREE.Mesh(plane, additivePoolMaterial(texture, STUDIO.violet, 0.11));
  halo.position.set(STUDIO_CENTER.x, 0.012, STUDIO_CENTER.z);
  halo.scale.set(13, 1, 13);
  group.add(halo);

  group.traverse((object) => ((object as THREE.Mesh).renderOrder = POOL_RENDER_ORDER));
  freeze(group);
  return group;
}

export default function LightPools() {
  const group = useBuiltGroup(buildLightPools);
  return <primitive object={group} />;
}
