/**
 * Bakes the studio's own reflections: a cube camera in the middle of the set renders the
 * finished scene (screen, neon bands, blue bays, warm cones, crowd) and PMREM pre-filters it
 * into `scene.environment`. Every glossy surface (floor, stage, podiums, trims) then reflects
 * the real set instead of the placeholder light panels.
 *
 * Same idea as Aetherwyn's buildEnvironmentLighting (PMREMGenerator → scene.environment),
 * captured from the actual scene instead of a hand-built sky.
 *
 * Called by the arena's warm-up, while the loading cover is still up: swapping the
 * environment map can recompile lit materials, which must not happen during the show.
 */
import * as THREE from "three";

import { STUDIO_CENTER } from "@/constants/quiz-cup-arena";

const PROBE_POSITION = new THREE.Vector3(STUDIO_CENTER.x, 1.6, STUDIO_CENTER.z + 5);

/** Renders the probe and installs it as scene.environment; returns the texture (dispose it on unmount). */
export function bakeStudioEnvironment(gl: THREE.WebGLRenderer, scene: THREE.Scene, intensity = 0.75): THREE.Texture {
  const target = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true });
  const camera = new THREE.CubeCamera(0.1, 60, target);
  camera.position.copy(PROBE_POSITION);
  // Render without the old environment so it doesn't reflect itself.
  scene.environment = null;
  camera.update(gl, scene);
  const pmrem = new THREE.PMREMGenerator(gl);
  const env = pmrem.fromCubemap(target.texture).texture;
  pmrem.dispose();
  target.dispose();
  scene.environment = env;
  scene.environmentIntensity = intensity;
  return env;
}
