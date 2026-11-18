"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import { ARENA_MODELS } from "@/constants/quiz-cup-arena";

import { placeHost } from "./arena-utils";
import { HOST } from "./mascot/characters";
import { prepareCharacter } from "./mascot/prepare-character";
import { setToon } from "./mascot/toon";
import { PlayerRig } from "./player-rig";

const HOST_SCALE = 1;
const HOST_RIG_SEED = 7;

function buildHost(scene: THREE.Object3D) {
  const root = cloneSkinned(prepareCharacter(scene));
  root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) object.castShadow = true;
  });
  placeHost(root, HOST_SCALE);
  return { root, rig: new PlayerRig(root, HOST_RIG_SEED, HOST.poses) };
}

function ArenaHost() {
  const { scene } = useGLTF(ARENA_MODELS.host);
  const { root, rig } = useMemo(() => buildHost(scene), [scene]);

  useEffect(() => {
    setToon(root, true);
    return () => setToon(root, false);
  }, [root]);

  useFrame((state, delta) => rig.update(state.clock.elapsedTime, Math.min(delta, 0.1), "idle"));

  return <primitive object={root} />;
}

export default memo(ArenaHost);
