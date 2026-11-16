"use client";

/**
 * Procedural set pieces for the "studio" look, built in code rather than in Blender so they
 * can be tuned here: the main screen with its layered neon portal, the neon bands along the
 * walls, and the light pools where the spotlights hit the floor.
 *
 * Everything is static: built once in useMemo, matrices frozen, unlit materials for the
 * neon (bloom picks those up), no extra lights.
 */

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { QUIZ_CUP_SCREEN, STAGE_TIERS, STUDIO_CENTER } from "@/constants/quiz-cup-arena";
import { QUIZ_CUP_LOGO } from "@/constants/quiz-cup";
import { STUDIO } from "@/constants/quiz-cup-studio";


import { freeze } from "./arena-utils";
import StudioSet from "./StudioSet";
import {
  STUDIO_FIXTURES,
  fixtureHousingGeometry,
  fixtureLensGeometry,
  fixtureMatrix,
  trussMatrices,
  trussUnitGeometry,
} from "./studio-rig";

// --- Helpers -------------------------------------------------------------------------------

function roundedRect<T extends THREE.Path>(shape: T, w: number, h: number, r: number, bump?: { w: number; h: number }) {
  const x = -w / 2;
  const y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  if (bump) {
    // A raised "marquee" step in the middle of the top edge, as on the reference set.
    const bx = bump.w / 2;
    const br = Math.min(0.45, bump.h);
    shape.lineTo(bx + br, y + h);
    shape.quadraticCurveTo(bx, y + h, bx, y + h + br);
    shape.lineTo(bx, y + h + bump.h - br);
    shape.quadraticCurveTo(bx, y + h + bump.h, bx - br, y + h + bump.h);
    shape.lineTo(-bx + br, y + h + bump.h);
    shape.quadraticCurveTo(-bx, y + h + bump.h, -bx, y + h + bump.h - br);
    shape.lineTo(-bx, y + h + br);
    shape.quadraticCurveTo(-bx, y + h, -bx - br, y + h);
  }
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

type Frame = {
  outer: [number, number, number];
  inner: [number, number, number];
  bump?: { w: number; h: number };
  depth: number;
  z: number;
  color: string;
  /** Neon line traced just inside the outer edge. */
  neon: string;
  neonWidth: number;
  neonGain: number;
};

function ring(f: Pick<Frame, "outer" | "inner" | "bump"> & { innerBump?: Frame["bump"] }): THREE.Shape {
  const shape = roundedRect(new THREE.Shape(), ...f.outer, f.bump);
  shape.holes.push(roundedRect(new THREE.Path(), ...f.inner, f.innerBump));
  return shape;
}

function neonMaterial(color: string, gain: number) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain), toneMapped: false });
  m.fog = false;
  return m;
}

// --- Main screen -----------------------------------------------------------------------------

function drawScreen(logo: HTMLImageElement | ImageBitmap | null) {
  const W = 1600;
  const H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, STUDIO.screenTop);
  bg.addColorStop(1, STUDIO.screenBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Nebula: a few big soft blobs in violet / magenta / blue.
  const blobs: [number, number, number, string][] = [
    [0.22, 0.3, 0.55, "rgba(178,92,255,0.55)"],
    [0.8, 0.25, 0.5, "rgba(76,107,255,0.45)"],
    [0.55, 0.75, 0.6, "rgba(255,95,210,0.25)"],
    [0.1, 0.85, 0.4, "rgba(76,107,255,0.35)"],
  ];
  for (const [x, y, r, c] of blobs) {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Bokeh: deterministic soft dots.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 6 + rnd() * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const hue = rnd() < 0.5 ? "190,150,255" : rnd() < 0.5 ? "255,190,110" : "120,150,255";
    g.addColorStop(0, `rgba(${hue},${0.12 + rnd() * 0.25})`);
    g.addColorStop(1, `rgba(${hue},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizon glow behind the logo.
  const glow = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, W * 0.45);
  glow.addColorStop(0, "rgba(120,170,255,0.55)");
  glow.addColorStop(0.4, "rgba(140,92,255,0.25)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  if (logo) {
    const h = H * 0.78;
    const w = (logo.width / logo.height) * h;
    ctx.shadowColor = "rgba(20,8,60,0.8)";
    ctx.shadowBlur = 40;
    ctx.drawImage(logo, (W - w) / 2, (H - h) / 2 + 10, w, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function MainScreen() {
  const logo = useTexture(QUIZ_CUP_LOGO);
  const { geometry, material } = useMemo(() => {
    const texture = drawScreen(logo.image as HTMLImageElement);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    // Just under 1 so only the brightest gold of the logo blooms.
    material.color.setScalar(0.92);
    material.fog = false;
    return { geometry: new THREE.PlaneGeometry(QUIZ_CUP_SCREEN.width, QUIZ_CUP_SCREEN.height), material };
  }, [logo]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, QUIZ_CUP_SCREEN.centerY, QUIZ_CUP_SCREEN.z]}
    />
  );
}

// --- Layered neon portal around the screen ---------------------------------------------------

function portalFrames(): Frame[] {
  const { width: w, height: h, z } = QUIZ_CUP_SCREEN;
  // Concept "screen border segment": thick, pillowy bands stacked outwards and stepping
  // back, pink → lavender → blue → deep violet, the outer ones running down to the floor
  // (their lower edge is below y = 0, hidden by the floor). Thin neon between layers.
  return [
    { outer: [w + 0.7, h + 0.7, 0.5], inner: [w, h, 0.22], depth: 0.3, z: z - 0.02, color: "#d86fe0", neon: STUDIO.gold, neonWidth: 0.06, neonGain: 1.7 },
    { outer: [w + 2.0, h + 1.9, 0.95], inner: [w + 0.62, h + 0.62, 0.48], depth: 0.34, z: z - 0.25, color: "#8a66ec", neon: "#ffb3f0", neonWidth: 0.05, neonGain: 1.4 },
    { outer: [w + 3.6, h + 3.3, 1.5], inner: [w + 1.9, h + 1.82, 0.92], depth: 0.38, z: z - 0.5, color: "#4f4fd0", neon: STUDIO.violet, neonWidth: 0.05, neonGain: 1.6 },
    { outer: [w + 5.6, h + 4.9, 2.1], inner: [w + 3.5, h + 3.22, 1.45], depth: 0.4, z: z - 0.78, color: "#33297e", neon: STUDIO.gold, neonWidth: 0.055, neonGain: 1.5 },
    { outer: [w + 8.4, h + 6.4, 2.8], inner: [w + 5.5, h + 4.82, 2.05], bump: { w: w * 1.15, h: 0.9 }, depth: 0.42, z: z - 1.08, color: "#241d62", neon: "#ff9a6a", neonWidth: 0.06, neonGain: 1.4 },
  ];
}

function NeonPortal() {
  const group = useMemo(() => {
    const g = new THREE.Group();
    const centerY = QUIZ_CUP_SCREEN.centerY;
    for (const f of portalFrames()) {
      const body = new THREE.Mesh(
        new THREE.ExtrudeGeometry(ring(f), { depth: f.depth, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.12, bevelSegments: 5, curveSegments: 22 }),
        // A little self-glow so each band reads as its own colour, as in the concept, even
        // with the key light behind the camera.
        new THREE.MeshStandardMaterial({ color: f.color, emissive: f.color, emissiveIntensity: 0.32, roughness: 0.28, metalness: 0.2, envMapIntensity: 1.2 }),
      );
      body.position.set(0, centerY, f.z);
      g.add(body);

      // The neon: a thin ring just inside the outer edge, standing proud of the face.
      const [ow, oh, or] = f.outer;
      const inset = 0.09;
      const neon = new THREE.Mesh(
        new THREE.ExtrudeGeometry(
          ring({
            outer: [ow - inset * 2, oh - inset * 2, Math.max(0.05, or - inset)],
            inner: [ow - (inset + f.neonWidth) * 2, oh - (inset + f.neonWidth) * 2, Math.max(0.04, or - inset - f.neonWidth)],
            bump: f.bump && { w: f.bump.w - inset * 2, h: f.bump.h },
            // The outline follows the marquee step instead of filling it.
            innerBump: f.bump && { w: f.bump.w - (inset + f.neonWidth) * 2, h: f.bump.h },
          }),
          { depth: 0.02, bevelEnabled: false, curveSegments: 18 },
        ),
        neonMaterial(f.neon, f.neonGain),
      );
      neon.position.set(0, centerY, f.z + f.depth + 0.125);
      g.add(neon);
    }
    freeze(g);
    return g;
  }, []);

  useEffect(
    () => () =>
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }),
    [group],
  );

  return <primitive object={group} />;
}

// --- Truss grid and fixtures -----------------------------------------------------------------

function StudioRig() {
  const group = useMemo(() => {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: "#2a2250", roughness: 0.38, metalness: 0.85 });

    const unit = trussUnitGeometry();
    const spans = trussMatrices();
    const truss = new THREE.InstancedMesh(unit, metal, spans.length);
    spans.forEach((m, i) => truss.setMatrixAt(i, m));
    g.add(truss);

    const all = STUDIO_FIXTURES.map((f) => fixtureMatrix(f.position, f.direction));
    const housingMat = new THREE.MeshStandardMaterial({ color: "#151028", roughness: 0.4, metalness: 0.7 });
    const housings = new THREE.InstancedMesh(fixtureHousingGeometry(), housingMat, all.length);
    const lenses = new THREE.InstancedMesh(fixtureLensGeometry(), neonMaterial("#ffe2a0", 2.6), all.length);
    all.forEach((m, i) => {
      housings.setMatrixAt(i, m);
      lenses.setMatrixAt(i, m);
    });
    g.add(housings, lenses);
    for (const mesh of [truss, housings, lenses]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    return g;
  }, []);
  useEffect(
    () => () =>
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }),
    [group],
  );
  return <primitive object={group} />;
}

// --- Light pools on the floor / stage ----------------------------------------------------------

function poolTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const STAGE_RADIUS = STAGE_TIERS[0].r - 0.1;
const POOL_SPREAD = { MovingHead: 0.11, Wash: 0.17, Accent: 0.08 } as const;

/**
 * Where each rig beam lands, a soft additive pool: on the stage top inside its radius,
 * otherwise on the floor. Plus a broad violet glow around the stage.
 */
function LightPools() {
  const group = useMemo(() => {
    const g = new THREE.Group();
    const texture = poolTexture();
    const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const made = (color: string, opacity: number) =>
      new THREE.MeshBasicMaterial({
        map: texture,
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      });

    const gold = made(STUDIO.gold, 0.22);
    const goldOnStage = made(STUDIO.gold, 0.05);
    const hit = new THREE.Vector3();
    for (const h of STUDIO_FIXTURES) {
      if (h.direction.y > -0.15) continue; // nearly horizontal: never reaches the floor
      for (const y of [STAGE_TIERS[0].top + 0.005, 0.01]) {
        const t = (y - h.position.y) / h.direction.y;
        hit.copy(h.position).addScaledVector(h.direction, t);
        const onStage = Math.hypot(hit.x - STUDIO_CENTER.x, hit.z - STUDIO_CENTER.z) < STAGE_RADIUS;
        if (y > 0.5 ? !onStage : onStage) continue;
        const spread = POOL_SPREAD[h.kind as keyof typeof POOL_SPREAD] ?? 0.2;
        const r = Math.min(3.2, Math.tan(spread) * t * 1.35 + 0.4);
        const pool = new THREE.Mesh(plane, y > 0.5 ? goldOnStage : gold);
        pool.position.copy(hit);
        pool.scale.set(r * 2, 1, r * 2 * (1 / Math.max(0.35, -h.direction.y)));
        pool.rotation.y = Math.atan2(h.direction.x, h.direction.z);
        g.add(pool);
        break;
      }
    }

    // Violet halo on the floor around the stage.
    const halo = new THREE.Mesh(plane, made(STUDIO.violet, 0.16));
    halo.position.set(STUDIO_CENTER.x, 0.012, STUDIO_CENTER.z);
    halo.scale.set(13, 1, 13);
    g.add(halo);

    g.traverse((o) => ((o as THREE.Mesh).renderOrder = 2));
    freeze(g);
    return g;
  }, []);

  useEffect(
    () => () => {
      const seen = new Set<unknown>();
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        for (const thing of [m.geometry, m.material, (m.material as THREE.MeshBasicMaterial).map]) {
          if (thing && !seen.has(thing)) {
            seen.add(thing);
            (thing as { dispose(): void }).dispose();
          }
        }
      });
    },
    [group],
  );

  return <primitive object={group} />;
}

/** The studio dressing: set (floor, stage, walls, host desk), screen + portal, truss rig, light pools, audience. */
export default function ArenaStudio({ pools = true, reflections = false }: { pools?: boolean; reflections?: boolean }) {
  return (
    <>
      <StudioSet reflections={reflections} />
      <MainScreen />
      <NeonPortal />
      <StudioRig />
      {pools && <LightPools />}
    </>
  );
}

export function preloadArenaStudio() {
  useTexture.preload(QUIZ_CUP_LOGO);
}
