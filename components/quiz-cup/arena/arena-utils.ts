import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { STUDIO_SURFACES } from "@/constants/quiz-cup-studio";

type LitMaterial = THREE.MeshStandardMaterial;

const KEEP_ATTRIBUTES = ["position", "normal", "uv", "uv1", "color"];

/** Float copy of an attribute: meshopt-quantised (normalised int) data can't be transformed in place. */
function toFloat(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const out = new Float32Array(attr.count * attr.itemSize);
  for (let i = 0; i < attr.count; i++) {
    for (let c = 0; c < attr.itemSize; c++) {
      out[i * attr.itemSize + c] = attr.getComponent(i, c);
    }
  }
  return new THREE.BufferAttribute(out, attr.itemSize);
}

function bakedGeometry(mesh: THREE.Mesh, toRoot: THREE.Matrix4) {
  const source = mesh.geometry;
  const geometry = new THREE.BufferGeometry();
  for (const name of KEEP_ATTRIBUTES) {
    const attr = source.getAttribute(name);
    if (attr) geometry.setAttribute(name, toFloat(attr));
  }
  if (source.index) geometry.setIndex(source.index.clone());
  geometry.applyMatrix4(toRoot);
  return geometry;
}

/**
 * Collapses every static mesh under `root` into one mesh per material (world transforms baked
 * in), so a piece with hundreds of nodes costs a handful of draw calls. Skinned / instanced
 * meshes and anything `keep` matches are left out and returned untouched.
 */
export function mergeByMaterial(
  root: THREE.Object3D,
  keep: (mesh: THREE.Mesh) => boolean = () => false,
) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4();
  const rootInverse = root.matrixWorld.clone().invert();
  const groups = new Map<string, { material: THREE.Material; parts: THREE.BufferGeometry[] }>();
  const kept: THREE.Mesh[] = [];

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || keep(mesh)) {
      kept.push(mesh);
      return;
    }
    const material = mesh.material as THREE.Material;
    toRoot.multiplyMatrices(rootInverse, mesh.matrixWorld);
    const geometry = bakedGeometry(mesh, toRoot);
    const key = `${material.uuid}|${Object.keys(geometry.attributes).sort().join(",")}|${geometry.index ? 1 : 0}`;
    const group = groups.get(key) ?? { material, parts: [] };
    group.parts.push(geometry);
    groups.set(key, group);
  });

  const merged = new THREE.Group();
  for (const { material, parts } of groups.values()) {
    const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts);
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = material.name;
    merged.add(mesh);
    if (parts.length > 1) parts.forEach((p) => p.dispose());
  }
  freeze(merged);
  return { merged, kept };
}

/** Children of a static group skip the per-frame local matrix recompute; the root stays
 *  placeable (R3F position props) and world matrices still follow it. */
export function freeze(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o === root) return;
    o.updateMatrix();
    o.matrixAutoUpdate = false;
  });
}

export function eachMaterial(root: THREE.Object3D, fn: (material: LitMaterial) => void) {
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (seen.has(m)) continue;
      seen.add(m);
      fn(m as LitMaterial);
    }
  });
}

/**
 * LED strip look without relying on bloom: emissive only and not tone-mapped, so each strip
 * keeps its exact colour (env reflections + ACES would wash it out to pastel).
 */
export function setupLed(material: LitMaterial, color?: THREE.ColorRepresentation, intensity = 1) {
  material.color.set(0x000000);
  material.envMapIntensity = 0;
  material.toneMapped = false;
  if (color !== undefined) material.emissive.set(color);
  material.emissiveIntensity = intensity;
}

/**
 * Recolours a GLB material for the studio look (constants/quiz-cup-studio.ts), by name.
 * Idempotent, so it is safe on useGLTF's cached (shared) materials. Returns true when the
 * material became an LED strip.
 */
export function applyStudioSurface(material: LitMaterial): boolean {
  const rule = STUDIO_SURFACES.find(([pattern]) => pattern.test(material.name))?.[1];
  if (!rule) return false;
  if (rule.led) {
    setupLed(material, rule.led, rule.ledIntensity ?? 1);
    return true;
  }
  if (rule.color) material.color.set(rule.color);
  if (rule.roughness !== undefined) material.roughness = rule.roughness;
  if (rule.metalness !== undefined) material.metalness = rule.metalness;
  if (rule.envMapIntensity !== undefined) material.envMapIntensity = rule.envMapIntensity;
  if (rule.emissive) {
    material.emissive.set(rule.emissive);
    material.emissiveIntensity = rule.emissiveIntensity ?? 1;
  }
  return false;
}

export const isLedMaterial = (m: THREE.Material) => /LED/.test(m.name);

/**
 * Baked irradiance on UV1. Three's Lambert divides irradiance by PI while Cycles' diffuse light
 * pass does not, hence scale * PI. Env diffuse would light these twice, so it is kept faint.
 */
export function applyLightmap(material: LitMaterial, texture: THREE.Texture, scale: number) {
  material.lightMap = texture;
  material.lightMapIntensity = scale * Math.PI;
  material.envMapIntensity = Math.min(material.envMapIntensity, 0.25);
  material.needsUpdate = true;
}

export function prepareLightmapTexture(texture: THREE.Texture) {
  texture.flipY = false; // glTF UV convention
  texture.channel = 1;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const NAME_W = 768; // landscape: matches the podium screen (PODIUM_CARD, 0.46 × 0.2875)
const NAME_H = 480;

/** Player card for a contestant podium screen, drawn in the page's own font. */
export function drawNameTexture(label: string, fontFamily: string) {
  const canvas = document.createElement("canvas");
  canvas.width = NAME_W;
  canvas.height = NAME_H;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(NAME_W / 2, NAME_H * 0.45, 20, NAME_W / 2, NAME_H / 2, NAME_W * 0.7);
  g.addColorStop(0, "#7a4dff");
  g.addColorStop(0.55, "#3a1f9a");
  g.addColorStop(1, "#120836");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, NAME_W, NAME_H);
  // Faint scan lines, like the screen module on the concept sheet.
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let y = 0; y < NAME_H; y += 6) ctx.fillRect(0, y, NAME_W, 2);

  // Cream-to-gold name with a deep purple edge.
  const text = ctx.createLinearGradient(0, NAME_H / 2 - 110, 0, NAME_H / 2 + 110);
  text.addColorStop(0, "#fff6e0");
  text.addColorStop(1, "#ffc04a");
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#2a0f6b";
  ctx.fillStyle = text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 210;
  do {
    ctx.font = `800 ${size}px ${fontFamily}`;
    size -= 8;
  } while (ctx.measureText(label).width > NAME_W - 110 && size > 40);
  ctx.lineWidth = Math.max(8, size * 0.12);
  ctx.strokeText(label, NAME_W / 2, NAME_H / 2);
  ctx.fillText(label, NAME_W / 2, NAME_H / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false; // glTF UV convention
  texture.anisotropy = 8;
  return texture;
}
