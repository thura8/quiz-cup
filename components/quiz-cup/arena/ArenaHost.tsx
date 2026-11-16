"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import { ARENA_HOST_POSITION, ARENA_HOST_YAW, ARENA_MODELS } from "@/constants/quiz-cup-arena";

import { PlayerRig } from "./player-rig";

const HOST_OUTFIT: Record<string, string> = {
  M_Player01_Shirt: "#252a5c",
  M_Player01_Orange: "#3a3f6e",
  M_Player01_Tie: "#8f8fb0",
  M_Player01_Crest: "#252a5c",
  M_Player01_Trousers: "#14152b",
  M_Player01_ShoeWhite: "#1b1b24",
};
const HOST_DISTANCE_BEHIND_DESK = 0.62;
const HOST_SCALE = 1.12;
const HOST_RIG_SEED = 7;

const meshMaterials = (mesh: THREE.Mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]);

function dressInHostOutfit(material: THREE.Material) {
  const outfitMaterial = (material as THREE.MeshStandardMaterial).clone();
  const color = HOST_OUTFIT[outfitMaterial.name];
  if (color) {
    outfitMaterial.color.set(color);
    outfitMaterial.map = null;
  }
  return outfitMaterial;
}

function buildHost(scene: THREE.Object3D) {
  const root = cloneSkinned(scene);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = meshMaterials(mesh).map(dressInHostOutfit);
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    mesh.castShadow = true;
  });

  const [x, y, z] = ARENA_HOST_POSITION;
  root.position.set(
    x - Math.sin(ARENA_HOST_YAW) * HOST_DISTANCE_BEHIND_DESK,
    y,
    z - Math.cos(ARENA_HOST_YAW) * HOST_DISTANCE_BEHIND_DESK,
  );
  root.rotation.y = ARENA_HOST_YAW;
  root.scale.setScalar(HOST_SCALE);
  return { root, rig: new PlayerRig(root, HOST_RIG_SEED) };
}

function ArenaHost() {
  const { scene } = useGLTF(ARENA_MODELS.player);
  const { root, rig } = useMemo(() => buildHost(scene), [scene]);

  useEffect(
    () => () =>
      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        meshMaterials(mesh).forEach((material) => material.dispose());
      }),
    [root],
  );

  useFrame((state, delta) => rig.update(state.clock.elapsedTime, Math.min(delta, 0.1), "idle"));

  return <primitive object={root} />;
}

export default memo(ArenaHost);
