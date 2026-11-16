"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

import { bakeStudioEnvironment } from "../BakedStudioProbe";

function uploadAllTextures(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  scene.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!material) return;
    const textures = [material.map, material.lightMap, material.emissiveMap, material.normalMap, material.roughnessMap];
    for (const texture of textures) {
      if (texture) gl.initTexture(texture);
    }
  });
}

export function SceneWarmup({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let alive = true;
    let env: THREE.Texture | null = null;
    (async () => {
      await gl.compileAsync(scene, camera);
      if (!alive) return;
      uploadAllTextures(gl, scene);
      env = bakeStudioEnvironment(gl, scene);
      await gl.compileAsync(scene, camera);
      if (!alive) return;
      gl.shadowMap.needsUpdate = true;
      requestAnimationFrame(() => alive && onReady());
    })();
    return () => {
      alive = false;
      if (env && scene.environment === env) scene.environment = null;
      env?.dispose();
    };
  }, [gl, scene, camera, onReady]);
  return null;
}

export function FrozenShadows({ version }: { version: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, version]);
  return null;
}
