"use client";

import * as THREE from "three";

import { PLAYER_PLATFORM, playerWingPath } from "@/constants/quiz-cup-arena";
import { STUDIO } from "@/constants/quiz-cup-studio";

import { freeze } from "../arena-utils";
import { useBuiltGroup } from "../use-built-group";
import { outlineTube, pathBandPoints, slab, toShape } from "./geometry";
import { dotTexture, glow, painted } from "./materials";

type Outline = (inset: number) => THREE.Vector2[];

function buildPlatform(outline: Outline, top: number) {
  const group = new THREE.Group();
  const lowerTop = top * 0.45;
  const sideMaterial = painted("#5d3fd0", 0.35, 0.2);
  const deckMaterial = painted("#ffffff", 0.22, 0.4, { map: dotTexture(1.4, "#181a52") });

  const lowerLevel = new THREE.Mesh(slab(toShape(outline(-0.12)), lowerTop), [
    deckMaterial,
    painted("#4248c0", 0.35, 0.2),
  ]);
  lowerLevel.receiveShadow = true;
  group.add(lowerLevel);

  const upperLevel = new THREE.Mesh(slab(toShape(outline(0)), top), [deckMaterial, sideMaterial]);
  upperLevel.receiveShadow = true;
  group.add(upperLevel);

  group.add(new THREE.Mesh(outlineTube(outline(0.07), top + 0.005, 0.022), glow(STUDIO.gold, 1.7)));
  group.add(new THREE.Mesh(outlineTube(outline(0.42), top + 0.004, 0.018), glow(STUDIO.gold, 1.3)));
  group.add(new THREE.Mesh(outlineTube(outline(-0.125), lowerTop + 0.004, 0.014), glow(STUDIO.violet, 1.5)));
  return group;
}

function buildPlatforms() {
  const group = new THREE.Group();
  for (const side of [-1, 1] as const) {
    const path = playerWingPath(side);
    group.add(buildPlatform((inset) => pathBandPoints(path, inset), PLAYER_PLATFORM.top));
  }
  freeze(group);
  return group;
}

export default function Platforms() {
  const group = useBuiltGroup(buildPlatforms);
  return <primitive object={group} />;
}
