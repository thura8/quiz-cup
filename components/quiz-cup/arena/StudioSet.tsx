"use client";

/**
 * The Quiz Cup TV studio set, built from real Three.js geometry (no baked images):
 *
 *  - glossy, wet-look floor (real blurred reflections on the high tier)
 *  - central stage: stepped round tiers, gold lips, dotted "reflective stage pattern"
 *  - curved contestant platform (stage left) and host platform (stage right), each a two-
 *    level slab with a gold edge light and a gold inlay loop
 *  - curved audience barriers, raked audience risers with instanced seats and an instanced,
 *    varied seated crowd (three poses, varied clothing / skin)
 *  - surround walls: blue lit bays between pillowy arch pilasters, purple fascia, the coral
 *    glow band; a dark ceiling over the rig
 *  - the host podium on its mark
 *
 * Layout constants live in constants/quiz-cup-arena.ts (polar about STUDIO_CENTER).
 */

import { MeshReflectorMaterial } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  ARENA_HOST_POSITION,
  ARENA_HOST_YAW,
  HOST_PLATFORM,
  PLAYER_PATH,
  PLAYER_PLATFORM,
  STAGE_TIERS,
  STUDIO_CENTER,
  polar,
} from "@/constants/quiz-cup-arena";
import { STUDIO } from "@/constants/quiz-cup-studio";

import { wetFloorMaps } from "@/lib/three/procedural-textures";

import { freeze } from "./arena-utils";
import { buildHostPodium } from "./studio-host-podium";

export { STAGE_TIERS };

// --- Shared helpers ---------------------------------------------------------------------

const DEG = Math.PI / 180;

function glow(color: string, gain = 1.5) {
  const m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(gain),
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  m.fog = false;
  return m;
}

function painted(color: string, roughness = 0.45, metalness = 0.1, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 1.1, ...extra });
}

function useDisposable(group: THREE.Object3D) {
  useEffect(
    () => () => {
      const seen = new Set<unknown>();
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        const maps = mats.flatMap((x) => {
          const s = x as THREE.MeshStandardMaterial;
          return [s.map, s.roughnessMap, s.normalMap];
        });
        for (const thing of [m.geometry, ...mats, ...maps]) {
          if (thing && !seen.has(thing)) {
            seen.add(thing);
            (thing as { dispose(): void }).dispose();
          }
        }
      });
    },
    [group],
  );
}

/** Dark navy with a fine hex grid of lighter dots: the "reflective stage pattern". */
function dotTexture(repeat: number, base = "#141547") {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(150,140,255,0.2)";
  const step = 16;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      ctx.beginPath();
      ctx.arc(x + ((y / step) % 2 ? step / 2 : 0), y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

/** A shape in the floor plane (x, z) → extrusion upwards from y0 by `height`. */
function slab(shape: THREE.Shape, height: number, y0 = 0, bevel = 0.04) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 48,
  });
  // Shape y = -world z; extrusion depth = world y.
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + bevel, 0);
  return g;
}

/** Points along a closed outline (x, z) as a tube, at height y. */
function outlineTube(points: THREE.Vector2[], y: number, radius: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, y, -p.y)), true, "centripetal");
  return new THREE.TubeGeometry(curve, Math.max(64, points.length * 2), radius, 6, true);
}

// --- Outlines (shape space: x = world x, y = -world z) --------------------------------------

/**
 * Racetrack band following PLAYER_PATH (smoothed), `halfWidth - inset` either side, with
 * round end caps. Shape space: (x, -z).
 */
function pathBandPoints(inset = 0): THREE.Vector2[] {
  const { halfWidth, capExtra } = PLAYER_PLATFORM;
  const pts = PLAYER_PATH.map(([x, z]) => new THREE.Vector3(x, 0, z));
  // Extend the ends a little past the first / last podium.
  const ext = (a: THREE.Vector3, b: THREE.Vector3) => a.clone().add(a.clone().sub(b).setLength(capExtra));
  pts.unshift(ext(pts[0], pts[1]));
  pts.push(ext(pts[pts.length - 1], pts[pts.length - 2]));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const N = 120;
  const w = halfWidth - inset;
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    tangents.push(tan);
    const nx = -tan.z;
    const nz = tan.x;
    left.push(new THREE.Vector2(p.x + nx * w, -(p.z + nz * w)));
    right.push(new THREE.Vector2(p.x - nx * w, -(p.z - nz * w)));
  }
  /** Semicircle round `centre` from side `n` to side `-n`, bulging along `bulge`. */
  const cap = (centre: THREE.Vector3, n: THREE.Vector2, bulge: THREE.Vector2) => {
    const pts: THREE.Vector2[] = [];
    for (let k = 1; k < 14; k++) {
      const a = (k / 14) * Math.PI;
      const x = centre.x + n.x * w * Math.cos(a) + bulge.x * w * Math.sin(a);
      const z = centre.z + n.y * w * Math.cos(a) + bulge.y * w * Math.sin(a);
      pts.push(new THREE.Vector2(x, -z));
    }
    return pts;
  };
  const end = tangents[N];
  const start = tangents[0];
  const out: THREE.Vector2[] = [
    ...left,
    // End cap: from the left side round the front of the band to the right side.
    ...cap(curve.getPointAt(1), new THREE.Vector2(-end.z, end.x), new THREE.Vector2(end.x, end.z)),
    ...right.slice().reverse(),
    // Start cap: from the right side round the back to the left side.
    ...cap(curve.getPointAt(0), new THREE.Vector2(start.z, -start.x), new THREE.Vector2(-start.x, -start.z)),
  ];
  return out;
}

/** Rounded rectangle centred on (cx, cz), rotated by yaw, `inset` in all round. */
function rectShapePoints(cx: number, cz: number, w: number, d: number, r: number, yaw: number, inset = 0): THREE.Vector2[] {
  const hw = w / 2 - inset;
  const hd = d / 2 - inset;
  const rr = Math.max(0.05, r - inset);
  const local: THREE.Vector2[] = [];
  const corner = (x: number, z: number, start: number) => {
    for (let k = 0; k <= 8; k++) {
      const a = start + (k / 8) * (Math.PI / 2);
      local.push(new THREE.Vector2(x + Math.cos(a) * rr, z + Math.sin(a) * rr));
    }
  };
  corner(hw - rr, hd - rr, 0);
  corner(-hw + rr, hd - rr, Math.PI / 2);
  corner(-hw + rr, -hd + rr, Math.PI);
  corner(hw - rr, -hd + rr, Math.PI * 1.5);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  // Local (x, z) → world (x, z) with the platform's yaw, then to shape space (x, -z).
  return local.map((p) => new THREE.Vector2(cx + p.x * c + p.y * s, -(cz - p.x * s + p.y * c)));
}

const toShape = (pts: THREE.Vector2[]) => new THREE.Shape(pts);

// --- Floor -----------------------------------------------------------------------------------

function Floor({ reflections }: { reflections: boolean }) {
  // Wet floor maps baked from tileable noise (lib/three/procedural-textures.ts).
  const maps = useMemo(() => {
    const { normal, roughness } = wetFloorMaps();
    const n = normal.clone();
    const r = roughness.clone();
    for (const t of [n, r]) {
      t.repeat.set(9, 9);
      t.needsUpdate = true;
    }
    return { normal: n, roughness: r };
  }, []);
  useEffect(
    () => () => {
      maps.normal.dispose();
      maps.roughness.dispose();
    },
    [maps],
  );
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[40, 72]} />
      {reflections ? (
        <MeshReflectorMaterial
          resolution={1024}
          blur={[140, 50]}
          mixBlur={0.6}
          mixStrength={9}
          mixContrast={1.15}
          mirror={0.75}
          depthScale={0.25}
          minDepthThreshold={0.6}
          maxDepthThreshold={1.4}
          distortion={0.12}
          distortionMap={maps.roughness}
          color="#0f0d35"
          metalness={0.6}
          roughness={0.4}
          roughnessMap={maps.roughness}
          normalMap={maps.normal}
          normalScale={[0.25, 0.25]}
        />
      ) : (
        <meshStandardMaterial
          color="#0f0d35"
          metalness={0.55}
          roughness={0.3}
          roughnessMap={maps.roughness}
          normalMap={maps.normal}
          normalScale={[0.25, 0.25]}
          envMapIntensity={1.4}
        />
      )}
    </mesh>
  );
}

// --- Central stage ------------------------------------------------------------------------------

const EDGE_R = 0.08;

function tierSide(r: number, top: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(r - 0.02, 0), new THREE.Vector2(r, 0.02), new THREE.Vector2(r, top - EDGE_R)];
  for (let k = 1; k <= 6; k++) {
    const t = (k / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - EDGE_R + Math.cos(t) * EDGE_R, top - EDGE_R + Math.sin(t) * EDGE_R));
  }
  // Ends where the rounded lip meets the top: the top surface itself is the disc / ring
  // below, so nothing else lies in that plane (two coplanar surfaces z-fight).
  return new THREE.LatheGeometry(pts, 128);
}

const TIER_SIDES = ["#6a48d8", "#4b4fc8", "#6a48d8"];

function CentralStage() {
  const group = useMemo(() => {
    const g = new THREE.Group();
    const lip = glow(STUDIO.gold, 1.7);
    STAGE_TIERS.forEach((tier, i) => {
      const side = new THREE.Mesh(tierSide(tier.r, tier.top), painted(TIER_SIDES[i], 0.32, 0.25));
      // Receives the podium / character shadows; casting its own lip shadow onto the tier
      // below only adds stair-stepped shadow-map edges.
      side.receiveShadow = true;
      g.add(side);

      const edge = new THREE.Mesh(new THREE.TorusGeometry(tier.r - EDGE_R * 0.5, 0.024, 8, 200).rotateX(Math.PI / 2), lip);
      edge.position.y = tier.top - 0.004;
      g.add(edge);
      const riser = new THREE.Mesh(new THREE.TorusGeometry(tier.r + 0.003, 0.011, 6, 200).rotateX(Math.PI / 2), glow(STUDIO.violet, 1.4));
      riser.position.y = tier.top * 0.5;
      g.add(riser);

      // Tier top: meets the lip exactly; the lower tiers' rings start under the tier above.
      const innerR = i === 0 ? 0 : STAGE_TIERS[i - 1].r - 0.05;
      const outerR = tier.r - EDGE_R + 0.002;
      const geo = i === 0 ? new THREE.CircleGeometry(outerR, 128) : new THREE.RingGeometry(innerR, outerR, 128, 1);
      geo.rotateX(-Math.PI / 2);
      const top = new THREE.Mesh(geo, painted("#ffffff", 0.2, 0.45, { map: dotTexture(i === 0 ? 10 : 12) }));
      top.position.y = tier.top;
      top.receiveShadow = true;
      g.add(top);
    });

    // Gold rings inlaid in the stage top.
    for (const r of [1.4, 2.6]) {
      const inlay = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 6, 160).rotateX(Math.PI / 2), glow(STUDIO.gold, 1.25));
      inlay.position.y = STAGE_TIERS[0].top + 0.004;
      g.add(inlay);
    }
    g.position.set(STUDIO_CENTER.x, 0, STUDIO_CENTER.z);
    g.updateMatrixWorld(true);
    freeze(g);
    return g;
  }, []);
  useDisposable(group);
  return <primitive object={group} />;
}

// --- Platforms -----------------------------------------------------------------------------------

/** Two-level platform from an outline: purple slab, dark navy top, gold edge light + inlay. */
function platform(outline: (inset: number) => THREE.Vector2[], top: number) {
  const g = new THREE.Group();
  const side = painted("#5d3fd0", 0.35, 0.2);
  const deck = painted("#ffffff", 0.22, 0.4, { map: dotTexture(1.4, "#181a52") });
  // Lower step, a little proud of the deck.
  const low = new THREE.Mesh(slab(toShape(outline(-0.12)), top * 0.45), [deck, painted("#4248c0", 0.35, 0.2)]);
  low.receiveShadow = true;
  g.add(low);
  const main = new THREE.Mesh(slab(toShape(outline(0)), top), [deck, side]);
  main.receiveShadow = true;
  g.add(main);
  // Gold light round the deck edge, gold inlay loop inside it, violet line round the step.
  g.add(new THREE.Mesh(outlineTube(outline(0.07), top + 0.005, 0.022), glow(STUDIO.gold, 1.7)));
  g.add(new THREE.Mesh(outlineTube(outline(0.42), top + 0.004, 0.018), glow(STUDIO.gold, 1.3)));
  g.add(new THREE.Mesh(outlineTube(outline(-0.125), top * 0.45 + 0.004, 0.014), glow(STUDIO.violet, 1.5)));
  return g;
}

function Platforms() {
  const group = useMemo(() => {
    const g = new THREE.Group();
    g.add(platform((inset) => pathBandPoints(inset), PLAYER_PLATFORM.top));

    const h = HOST_PLATFORM;
    const [hx, , hz] = polar(h.radius, h.angle);
    g.add(platform((inset) => rectShapePoints(hx, hz, h.width, h.depth, 0.75, ARENA_HOST_YAW, inset), h.top));
    freeze(g);
    return g;
  }, []);
  useDisposable(group);
  return <primitive object={group} />;
}

// --- Swept geometry round the studio ------------------------------------------------------------

/**
 * A (u = metres in from radius `r`, v = height) profile swept along an arc, `from` < `to`.
 *
 * Faces always point out of the solid whichever way the profile is wound. `closed` joins the
 * last profile point back to the first; `caps` closes both ends of a closed profile so the
 * swept piece doesn't show a hollow end. An open profile (`closed: false`) is a single
 * surface, facing the stage when its points run top to bottom.
 */
function sweepArc(
  r: number,
  from: number,
  to: number,
  profile: [number, number][],
  segments = 120,
  { closed = true, caps = closed }: { closed?: boolean; caps?: boolean } = {},
) {
  const n = profile.length;
  const pos: number[] = [];
  const at = (deg: number, u: number, v: number): [number, number, number] => {
    const a = deg * DEG;
    return [STUDIO_CENTER.x + Math.cos(a) * (r - u), v, STUDIO_CENTER.z + Math.sin(a) * (r - u)];
  };
  for (let i = 0; i <= segments; i++) {
    const deg = from + ((to - from) * i) / segments;
    for (const [u, v] of profile) pos.push(...at(deg, u, v));
  }
  // Shoelace area in (u, v): clockwise profiles (negative) already wind outwards.
  let area = 0;
  for (let j = 0; j < n; j++) {
    const [u0, v0] = profile[j];
    const [u1, v1] = profile[(j + 1) % n];
    area += u0 * v1 - u1 * v0;
  }
  const flip = closed && area > 0;
  const index: number[] = [];
  const edges = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < edges; j++) {
      const a = i * n + j;
      const b = i * n + ((j + 1) % n);
      const c = (i + 1) * n + j;
      const d = (i + 1) * n + ((j + 1) % n);
      if (flip) index.push(a, c, b, b, c, d);
      else index.push(a, b, c, b, d, c);
    }
  }

  if (closed && caps && n >= 3) {
    const tris = THREE.ShapeUtils.triangulateShape(
      profile.map(([u, v]) => new THREE.Vector2(u, v)),
      [],
    );
    const p = new THREE.Vector3();
    const q = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (const [deg, sign] of [
      [from, -1],
      [to, 1],
    ] as const) {
      // Outward along the arc: the tangent at `to`, against it at `from`.
      const a = deg * DEG;
      const out = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(sign);
      const base = pos.length / 3;
      for (const [u, v] of profile) pos.push(...at(deg, u, v));
      for (const [i0, i1, i2] of tris) {
        p.fromArray(pos, (base + i0) * 3);
        q.fromArray(pos, (base + i1) * 3).sub(p);
        s.fromArray(pos, (base + i2) * 3).sub(p);
        if (q.cross(s).dot(out) >= 0) index.push(base + i0, base + i1, base + i2);
        else index.push(base + i0, base + i2, base + i1);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Pillowy band profile: `depth` in from the arc, between heights y0 and y1. */
function pillow(depth: number, y0: number, y1: number, inset = 0): [number, number][] {
  const r = Math.min(depth, (y1 - y0) / 2) * 0.9;
  const out: [number, number][] = [[inset, y0]];
  for (let k = 0; k <= 6; k++) {
    const t = -Math.PI / 2 + (k / 6) * (Math.PI / 2);
    out.push([inset + depth - r + Math.cos(t) * r, y0 + r + Math.sin(t) * r]);
  }
  for (let k = 0; k <= 6; k++) {
    const t = (k / 6) * (Math.PI / 2);
    out.push([inset + depth - r + Math.cos(t) * r, y1 - r + Math.sin(t) * r]);
  }
  out.push([inset, y1]);
  return out;
}

function arcTube(r: number, from: number, to: number, y: number, radius: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 96; i++) {
    const [x, , z] = polar(r, from + ((to - from) * i) / 96);
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, radius, 6, false);
}

// --- Audience ----------------------------------------------------------------------------------------

const AUDIENCE = {
  rows: 5,
  firstRadius: 8.9,
  rowDepth: 0.95,
  rise: 0.42,
  seatSpacing: 0.62,
  blocks: [
    { from: 120, to: 226 }, // stage left (behind the contestant platform)
    { from: -46, to: 62 }, // stage right (behind the host)
  ],
  barrier: 8.05,
};

/** Seated figure, pose 0 = hands in lap, 1 = clapping (forearms up), 2 = one arm raised. */
function personParts(pose: number) {
  const body: THREE.BufferGeometry[] = [];
  const torso = new THREE.CapsuleGeometry(0.17, 0.3, 3, 10).translate(0, 0.38, 0);
  const hips = new THREE.SphereGeometry(0.19, 10, 6).scale(1.1, 0.55, 1.3).translate(0, 0.12, 0.04);
  const shoulders = new THREE.SphereGeometry(0.2, 10, 6).scale(1.2, 0.5, 0.8).translate(0, 0.56, 0);
  const thighL = new THREE.CapsuleGeometry(0.075, 0.3, 2, 8).rotateX(Math.PI / 2).translate(-0.1, 0.08, 0.22);
  const thighR = thighL.clone().translate(0.2, 0, 0);
  body.push(torso, hips, shoulders, thighL, thighR);
  const arm = (side: number, raise: number, fore: number) => {
    const upper = new THREE.CapsuleGeometry(0.055, 0.22, 2, 8).translate(0, -0.13, 0).rotateX(-raise).translate(side * 0.23, 0.56, 0.02);
    const lower = new THREE.CapsuleGeometry(0.05, 0.2, 2, 8)
      .translate(0, -0.12, 0)
      .rotateX(-fore)
      .translate(side * 0.23, 0.56 - Math.cos(raise) * 0.26, 0.02 + Math.sin(raise) * 0.26);
    body.push(upper, lower);
  };
  if (pose === 0) {
    arm(-1, 0.35, 1.2);
    arm(1, 0.35, 1.2);
  } else if (pose === 1) {
    arm(-1, 0.5, 2.3);
    arm(1, 0.5, 2.3);
  } else {
    arm(-1, 0.35, 1.2);
    arm(1, 2.8, 3.0);
  }
  const head = new THREE.SphereGeometry(0.115, 12, 10).scale(0.92, 1.05, 0.95).translate(0, 0.83, 0.02);
  const hair = new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 0.85, 0.0);
  const bodyGeo = mergeGeometries(body.map((b) => b.toNonIndexed()))!;
  body.forEach((b) => b.dispose());
  return { body: bodyGeo, head, hair };
}

const CLOTHES = ["#1e1a40", "#28204e", "#161e40", "#33203f", "#1d2a48", "#3a2236", "#1d2030", "#3d2a20", "#4a3866", "#2b3556"];
const SKIN = ["#8a6050", "#704a3c", "#9a7864", "#5a3a2e", "#8f6a54", "#4a2e24"];
const HAIR = ["#1a1210", "#2b1a12", "#3b2a1a", "#0e0c10", "#5a3a22"];

function Audience() {
  const group = useMemo(() => {
    const g = new THREE.Group();
    const rnd = (() => {
      let seed = 21;
      return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    })();

    // Risers: one stepped block per side, swept along the arc.
    const riserMat = painted("#1c1a4a", 0.6, 0.15);
    const noseMat = glow(STUDIO.violet, 1.25);
    for (const b of AUDIENCE.blocks) {
      for (let k = 0; k < AUDIENCE.rows; k++) {
        const r0 = AUDIENCE.firstRadius + k * AUDIENCE.rowDepth - 0.5;
        const h = (k + 1) * AUDIENCE.rise;
        // Profile measured inwards from the row's back edge (radius r0 + rowDepth).
        g.add(new THREE.Mesh(sweepArc(r0 + AUDIENCE.rowDepth, b.from, b.to, [[0, 0], [0, h], [AUDIENCE.rowDepth, h], [AUDIENCE.rowDepth, 0]], 64), riserMat));
        g.add(new THREE.Mesh(arcTube(r0 + 0.02, b.from, b.to, h + 0.005, 0.012), noseMat));
      }
    }

    // Seats + people.
    type Spot = { x: number; y: number; z: number; yaw: number };
    const seats: Spot[] = [];
    for (const b of AUDIENCE.blocks) {
      for (let k = 0; k < AUDIENCE.rows; k++) {
        const r = AUDIENCE.firstRadius + k * AUDIENCE.rowDepth;
        const y = (k + 1) * AUDIENCE.rise;
        const count = Math.floor((((b.to - b.from) * DEG) * r) / AUDIENCE.seatSpacing);
        for (let i = 0; i < count; i++) {
          const deg = b.from + ((i + 0.5) / count) * (b.to - b.from);
          const [x, , z] = polar(r, deg);
          // Face the stage centre.
          seats.push({ x, y, z, yaw: Math.atan2(STUDIO_CENTER.x - x, STUDIO_CENTER.z - z) });
        }
      }
    }

    const seatGeo = mergeGeometries([
      new THREE.BoxGeometry(0.5, 0.1, 0.46).translate(0, 0.32, 0.02).toNonIndexed(),
      new THREE.BoxGeometry(0.5, 0.5, 0.08).translate(0, 0.58, -0.2).toNonIndexed(),
      new THREE.BoxGeometry(0.06, 0.3, 0.4).translate(-0.27, 0.45, 0).toNonIndexed(),
      new THREE.BoxGeometry(0.06, 0.3, 0.4).translate(0.27, 0.45, 0).toNonIndexed(),
    ])!;
    const seatMesh = new THREE.InstancedMesh(seatGeo, painted("#3a2350", 0.7, 0.05), seats.length);

    const poses = [0, 1, 2].map(personParts);
    const people: { spot: Spot; pose: number }[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc = new THREE.Vector3();
    const p = new THREE.Vector3();
    seats.forEach((spot, i) => {
      q.setFromEuler(e.set(0, spot.yaw, 0));
      seatMesh.setMatrixAt(i, m.compose(p.set(spot.x, spot.y, spot.z), q, sc.set(1, 1, 1)));
      if (rnd() < 0.88) {
        const roll = rnd();
        people.push({ spot, pose: roll < 0.62 ? 0 : roll < 0.9 ? 1 : 2 });
      }
    });
    seatMesh.instanceMatrix.needsUpdate = true;
    seatMesh.receiveShadow = true;
    g.add(seatMesh);

    const color = new THREE.Color();
    for (let pose = 0; pose < 3; pose++) {
      const mine = people.filter((x) => x.pose === pose);
      const bodies = new THREE.InstancedMesh(poses[pose].body, painted("#ffffff", 0.8, 0), mine.length);
      const heads = new THREE.InstancedMesh(poses[pose].head, painted("#ffffff", 0.6, 0), mine.length);
      const hairs = new THREE.InstancedMesh(poses[pose].hair, painted("#ffffff", 0.7, 0), mine.length);
      mine.forEach(({ spot }, i) => {
        e.set((rnd() - 0.5) * 0.12, spot.yaw + (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.08);
        q.setFromEuler(e);
        const k = 0.92 + rnd() * 0.16;
        m.compose(p.set(spot.x, spot.y + 0.3, spot.z + 0), q, sc.set(k, k * (0.94 + rnd() * 0.12), k));
        bodies.setMatrixAt(i, m);
        heads.setMatrixAt(i, m);
        hairs.setMatrixAt(i, m);
        bodies.setColorAt(i, color.set(CLOTHES[Math.floor(rnd() * CLOTHES.length)]));
        heads.setColorAt(i, color.set(SKIN[Math.floor(rnd() * SKIN.length)]));
        hairs.setColorAt(i, color.set(HAIR[Math.floor(rnd() * HAIR.length)]));
      });
      for (const mesh of [bodies, heads, hairs]) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
        g.add(mesh);
      }
    }

    // Curved barrier walls in front of each block: pillowy purple rail, blue lit strip,
    // violet neon top edge.
    for (const b of AUDIENCE.blocks) {
      const r = AUDIENCE.barrier;
      g.add(new THREE.Mesh(sweepArc(r + 0.3, b.from + 1, b.to - 1, pillow(0.3, 0, 1.15)), painted("#5a3cc8", 0.35, 0.2)));
      g.add(new THREE.Mesh(sweepArc(r + 0.01, b.from + 2, b.to - 2, pillow(0.04, 0.42, 0.72)), glow(STUDIO.blue, 0.9)));
      g.add(new THREE.Mesh(arcTube(r - 0.02, b.from + 1.5, b.to - 1.5, 1.13, 0.02), glow(STUDIO.violet, 1.6)));
      g.add(new THREE.Mesh(arcTube(r - 0.02, b.from + 1.5, b.to - 1.5, 0.06, 0.015), glow(STUDIO.gold, 1.3)));
    }

    return g;
  }, []);
  useDisposable(group);
  return <primitive object={group} />;
}

// --- Surround walls + ceiling -------------------------------------------------------------------

const WALL = { r: 13.8, from: 128, to: 412, height: 10.6 };

function Walls() {
  const group = useMemo(() => {
    const g = new THREE.Group();
    const { r, from, to } = WALL;

    // A single surface facing the stage (top-to-bottom profile, not closed: a closed two-point
    // profile is two coincident opposite faces, which z-fight).
    g.add(new THREE.Mesh(sweepArc(r, from, to, [[0, WALL.height], [0, 0]], 180, { closed: false }), painted("#120f34", 0.75, 0.1)));

    // Blue lit bays above the audience, framed by pillowy arch pilasters.
    const bays = 22;
    const span = to - from;
    // Deep blue bays, glowing brighter towards the top (as on the reference walls).
    const bayCanvas = document.createElement("canvas");
    bayCanvas.width = 4;
    bayCanvas.height = 128;
    const bctx = bayCanvas.getContext("2d")!;
    const grad = bctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "#5a74ff");
    grad.addColorStop(0.3, "#2c3cb8");
    grad.addColorStop(1, "#0c1048");
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, 4, 128);
    const bayTex = new THREE.CanvasTexture(bayCanvas);
    bayTex.colorSpace = THREE.SRGBColorSpace;
    const bayMat = new THREE.MeshBasicMaterial({ map: bayTex, toneMapped: false, side: THREE.DoubleSide });
    bayMat.color.setScalar(0.42);
    const pilaster = painted("#4a35b0", 0.3, 0.2);
    const pilasterGlow = glow(STUDIO.violet, 1.5);
    for (let i = 0; i < bays; i++) {
      const deg = from + ((i + 0.5) / bays) * span;
      const [x, , z] = polar(r - 0.05, deg);
      const width = ((span / bays) * DEG * r) * 0.82;
      const bay = new THREE.Mesh(new THREE.PlaneGeometry(width, 2.6), bayMat);
      bay.position.set(x, 4.3, z);
      bay.lookAt(STUDIO_CENTER.x, 4.3, STUDIO_CENTER.z);
      g.add(bay);
    }
    for (let i = 0; i <= bays; i++) {
      const deg = from + (i / bays) * span;
      // Arch pilaster: a short swept slab of the arc, round-topped, with a neon edge.
      g.add(new THREE.Mesh(sweepArc(r, deg - 0.9, deg + 0.9, pillow(0.38, 2.6, 5.9), 6), pilaster));
      g.add(new THREE.Mesh(sweepArc(r - 0.385, deg - 0.35, deg + 0.35, [[0, 2.75], [0.01, 2.75], [0.01, 5.75], [0, 5.75]], 3), pilasterGlow));
    }

    // Stacked bands: purple fascia, coral glow strip, upper fascia, violet neon top.
    g.add(new THREE.Mesh(sweepArc(r, from, to, pillow(0.55, 5.95, 6.55), 180), painted("#5b40c8", 0.3, 0.2)));
    g.add(new THREE.Mesh(sweepArc(r - 0.02, from, to, pillow(0.25, 6.62, 7.02), 180), glow(STUDIO.coral, 1.3)));
    g.add(new THREE.Mesh(sweepArc(r, from, to, pillow(0.62, 7.08, 8.2), 180), painted("#3a2a9a", 0.32, 0.2)));
    g.add(new THREE.Mesh(arcTube(r - 0.55, from, to, 5.94, 0.03), glow(STUDIO.violet, 1.7)));
    g.add(new THREE.Mesh(arcTube(r - 0.6, from, to, 8.22, 0.035), glow("#ff8fd8", 1.4)));
    g.add(new THREE.Mesh(arcTube(r - 0.05, from, to, 2.55, 0.025), glow(STUDIO.violet, 1.3)));

    // Ceiling: dark, with a grid of slightly lighter recessed panels.
    const ceiling = new THREE.Mesh(new THREE.CircleGeometry(r + 1, 64).rotateX(Math.PI / 2), painted("#0b0920", 0.9, 0));
    ceiling.position.set(STUDIO_CENTER.x, WALL.height, STUDIO_CENTER.z);
    g.add(ceiling);
    const panel = new THREE.PlaneGeometry(2.6, 2.6).rotateX(Math.PI / 2);
    const panelMat = painted("#15123a", 0.8, 0.1);
    for (let ix = -4; ix <= 4; ix++) {
      for (let iz = -4; iz <= 3; iz++) {
        const px = ix * 2.9;
        const pz = STUDIO_CENTER.z + iz * 2.9;
        if (Math.hypot(px - STUDIO_CENTER.x, pz - STUDIO_CENTER.z) > r - 1.5) continue;
        const pm = new THREE.Mesh(panel, panelMat);
        pm.position.set(px, WALL.height - 0.02, pz);
        g.add(pm);
      }
    }
    freeze(g);
    return g;
  }, []);
  useDisposable(group);
  return <primitive object={group} />;
}

// --- Host podium ----------------------------------------------------------------------------------

function HostDesk() {
  const group = useMemo(() => {
    const g = buildHostPodium();
    g.position.set(...ARENA_HOST_POSITION);
    g.rotation.y = ARENA_HOST_YAW;
    g.scale.setScalar(0.92);
    g.updateMatrixWorld(true);
    freeze(g);
    return g;
  }, []);
  useDisposable(group);
  return <primitive object={group} />;
}

/** Floor, stage, platforms, audience, walls, ceiling and host podium. */
export default function StudioSet({ reflections }: { reflections: boolean }) {
  return (
    <>
      <Floor reflections={reflections} />
      <CentralStage />
      <Platforms />
      <Audience />
      <Walls />
      <HostDesk />
    </>
  );
}
