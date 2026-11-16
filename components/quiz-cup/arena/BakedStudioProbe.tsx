import * as THREE from "three";

import { STUDIO_CENTER } from "@/constants/quiz-cup-arena";

const PROBE_POSITION = new THREE.Vector3(STUDIO_CENTER.x, 1.6, STUDIO_CENTER.z + 5);

export function bakeStudioEnvironment(gl: THREE.WebGLRenderer, scene: THREE.Scene, intensity = 0.75): THREE.Texture {
  const target = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true });
  const camera = new THREE.CubeCamera(0.1, 60, target);
  camera.position.copy(PROBE_POSITION);
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
