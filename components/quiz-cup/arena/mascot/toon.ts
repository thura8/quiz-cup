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

const HUE_KEY = "outfitHue";
const OUTFIT_SUFFIXES = ["_Jacket", "_Sleeve", "_SleeveFolds", "_Cuff", "_Collar", "_Hood"];

function withHueShift<T extends THREE.Material>(material: T, hue: number): T {
  material.userData[HUE_KEY] = hue;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOutfitHue = { value: hue };
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform float uOutfitHue;\nvoid main() {")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          const vec3 k = vec3(0.57735);
          float c = cos(uOutfitHue);
          vec3 v = diffuseColor.rgb;
          diffuseColor.rgb = max(v * c + cross(k, v) * sin(uOutfitHue) + k * dot(k, v) * (1.0 - c), 0.0);
        }`,
      );
  };
  material.customProgramCacheKey = () => HUE_KEY;
  return material;
}

const outfitVariants = new WeakMap<THREE.Material, Map<number, THREE.Material>>();

function outfitVariant(material: THREE.Material, hue: number) {
  let byHue = outfitVariants.get(material);
  if (!byHue) outfitVariants.set(material, (byHue = new Map()));
  let variant = byHue.get(hue);
  if (!variant) byHue.set(hue, (variant = withHueShift(material.clone(), hue)));
  return variant;
}

/** Rotates the hue of a character's jacket/top materials (not trousers), keeping texture detail. */
export function tintOutfit(root: THREE.Object3D, hue: number) {
  if (!hue) return;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const material = mesh.material;
    if (!mesh.isMesh || Array.isArray(material)) return;
    if (OUTFIT_SUFFIXES.some((suffix) => material.name.endsWith(suffix))) mesh.material = outfitVariant(material, hue);
  });
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
  const toon = new THREE.MeshToonMaterial({
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
  const hue = material.userData[HUE_KEY] as number | undefined;
  return hue ? withHueShift(toon, hue) : toon;
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
