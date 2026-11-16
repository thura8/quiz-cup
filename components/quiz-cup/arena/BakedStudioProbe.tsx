"use client";

/**
 * Bakes the studio's own reflections once: a cube camera in the middle of the set renders the
 * finished scene (screen, neon bands, blue bays, warm cones, crowd) and PMREM pre-filters it
 * into `scene.environment`. Every glossy surface (floor, stage, podiums, trims) then reflects
 * the real set instead of the placeholder light panels.
 *
 * Same idea as Aetherwyn's buildEnvironmentLighting (PMREMGenerator → scene.environment),
 * captured from the actual scene instead of a hand-built sky. One render at load: no per-frame
 * cost.
 */

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

import { STUDIO_CENTER } from "@/constants/quiz-cup-arena";

const PROBE_POSITION = new THREE.Vector3(STUDIO_CENTER.x, 1.6, STUDIO_CENTER.z + 5);

export default function BakedStudioProbe({ ready, intensity = 0.75 }: { ready: boolean; intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    if (!ready) return;
    let env: THREE.Texture | null = null;
    let cancelled = false;
    // One frame after the show is ready, so every material has compiled and textures exist.
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const target = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true });
      const camera = new THREE.CubeCamera(0.1, 60, target);
      camera.position.copy(PROBE_POSITION);
      const previous = scene.environment;
      // Render without the old environment so it doesn't reflect itself.
      scene.environment = null;
      camera.update(gl, scene);
      const pmrem = new THREE.PMREMGenerator(gl);
      env = pmrem.fromCubemap(target.texture).texture;
      pmrem.dispose();
      target.dispose();
      scene.environment = env ?? previous;
      scene.environmentIntensity = intensity;
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (env && scene.environment === env) scene.environment = null;
      env?.dispose();
    };
  }, [ready, gl, scene, intensity]);

  return null;
}
