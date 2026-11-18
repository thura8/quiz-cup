import * as THREE from "three";

import { OUTLINE_PREFIX } from "./build-mascot";

const TONES = [110, 185, 255];
const PAINTED_TONES = [175, 220, 255];
const PAINTED_SUFFIXES = ["_Head", "_Painted", "_Hair"];
const PBR_KEY = "pbrMaterial";

const gradients = new Map<number[], THREE.DataTexture>();

function toonGradient(tones: number[]) {
  let gradient = gradients.get(tones);
  if (gradient) return gradient;
  gradient = new THREE.DataTexture(new Uint8Array(tones), tones.length, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = tones === PAINTED_TONES ? THREE.LinearFilter : THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  gradients.set(tones, gradient);
  return gradient;
}

const toonMaterials = new WeakMap<THREE.MeshStandardMaterial, THREE.MeshToonMaterial>();

function toToon(material: THREE.MeshStandardMaterial) {
  let toon = toonMaterials.get(material);
  if (!toon) {
    toon = createToon(material);
    toonMaterials.set(material, toon);
  }
  return toon;
}

function createToon(material: THREE.MeshStandardMaterial) {
  return new THREE.MeshToonMaterial({
    name: material.name,
    color: material.color,
    map: material.map,
    vertexColors: material.vertexColors,
    gradientMap: toonGradient(PAINTED_SUFFIXES.some((suffix) => material.name.endsWith(suffix)) ? PAINTED_TONES : TONES),
    transparent: material.transparent,
    opacity: material.opacity,
    depthWrite: material.depthWrite,
    side: material.side,
  });
}

export function setToon(root: THREE.Object3D, enabled: boolean) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const pbr = mesh.userData[PBR_KEY] as THREE.MeshStandardMaterial | undefined;
    if (enabled && !pbr && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      mesh.userData[PBR_KEY] = mesh.material;
      mesh.material = toToon(mesh.material as THREE.MeshStandardMaterial);
    } else if (!enabled && pbr) {
      mesh.material = pbr;
      delete mesh.userData[PBR_KEY];
    }
  });
}

export function setOutlines(root: THREE.Object3D, visible: boolean) {
  root.traverse((object) => {
    if (object.name.startsWith(OUTLINE_PREFIX)) object.visible = visible;
  });
}
