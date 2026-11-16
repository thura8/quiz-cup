/**
 * Contestant podium, per the podium concept sheet ("01 · Contestant Podium" / "03 · Modular
 * details" / "04 · Three.js implementation"):
 *
 *  - high-backed outer casing: chunky, trapezoid front (wider at the top), big rounded
 *    corners, matte purple ("impact-resistant matte finish")
 *  - chunky geometric molding stepping in from the edge, with a vibrant LED line in it
 *  - built-in screen module: dark bezel, glowing border, landscape name display
 *  - recessed blue kick panel at the foot, on a tray base with a gold LED line
 *  - lid with an oversized buzzer: blue at rest, glowing orange when active
 *
 * Separate, named parts so the interactive ones animate / recolour on their own (as the
 * sheet's exploded view). Materials keep the old `ContestantPodium_*` names, so
 * ArenaContestants drives it like the GLB it replaces:
 *   LED_Top        → the buzzer button (status colour)
 *   Screen_Border  → glowing ring round the screen (status colour)
 *   LED_Vertical   → LED line along the kick panel (status colour)
 *   LED_Base       → gold line round the tray base
 *   Screen_Display → the name card
 * Everything else is static and gets merged.
 *
 * Origin: centre of the base, on the stage. +Z faces the camera. Units: metres.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { STUDIO } from "@/constants/quiz-cup-studio";
import { withMattePaint } from "@/lib/three/procedural-textures";

const P = "ContestantPodium_";

// --- Dimensions --------------------------------------------------------------------------

const BASE_H = 0.08; // tray base
const BODY_H = 0.94; // casing silhouette height (bevel adds BEVEL above + below)
const TOP_HALF_W = 0.43;
const BOTTOM_HALF_W = 0.35;
const DEPTH = 0.54; // casing extrusion (bevel adds BEVEL front + back)
const BEVEL = 0.07;
const FRONT_Z = DEPTH / 2 + BEVEL;

/** Name card: landscape, matches drawNameTexture (768 × 480). */
export const PODIUM_CARD = { w: 0.46, h: 0.2875 };
const SCREEN_Y = 0.6; // centre, above the base top

export type PodiumColourway = { led: string };

/** Molding LED colour alternates along the arc (pink / gold, as in the material studies). */
export const PODIUM_COLOURWAYS: PodiumColourway[] = [{ led: "#ff6fd8" }, { led: STUDIO.gold }];

// --- 2D helpers --------------------------------------------------------------------------

type V2 = [number, number];

/** Front silhouette, counter-clockwise: narrow foot, wide top. */
const SILHOUETTE: V2[] = [
  [-BOTTOM_HALF_W, 0],
  [BOTTOM_HALF_W, 0],
  [TOP_HALF_W, BODY_H],
  [-TOP_HALF_W, BODY_H],
];
const CORNER_R = [0.1, 0.1, 0.2, 0.2];

/** Moves every edge of a convex CCW polygon inwards by `d`. */
function inset(poly: V2[], d: number): V2[] {
  const n = poly.length;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy);
    const nx = -dy / len; // inward normal for CCW
    const ny = dx / len;
    return { p: [p[0] + nx * d, p[1] + ny * d] as V2, dir: [dx / len, dy / len] as V2 };
  });
  return lines.map((a, i) => {
    const b = lines[(i + n - 1) % n];
    // Intersect line b (previous edge) with line a (this edge).
    const det = b.dir[0] * a.dir[1] - b.dir[1] * a.dir[0];
    const t = ((a.p[0] - b.p[0]) * a.dir[1] - (a.p[1] - b.p[1]) * a.dir[0]) / det;
    return [b.p[0] + b.dir[0] * t, b.p[1] + b.dir[1] * t] as V2;
  });
}

/** Polygon with each corner rounded by its own radius. */
function roundedPolygon<T extends THREE.Path>(path: T, poly: V2[], radii: number[]): T {
  const n = poly.length;
  const corner = (i: number) => {
    const p = poly[i];
    const prev = poly[(i + n - 1) % n];
    const next = poly[(i + 1) % n];
    const toPrev = [prev[0] - p[0], prev[1] - p[1]];
    const toNext = [next[0] - p[0], next[1] - p[1]];
    const lp = Math.hypot(toPrev[0], toPrev[1]);
    const ln = Math.hypot(toNext[0], toNext[1]);
    const r = Math.max(0.005, Math.min(radii[i], lp / 2, ln / 2));
    return {
      start: [p[0] + (toPrev[0] / lp) * r, p[1] + (toPrev[1] / lp) * r] as V2,
      end: [p[0] + (toNext[0] / ln) * r, p[1] + (toNext[1] / ln) * r] as V2,
      p,
    };
  };
  const cs = poly.map((_, i) => corner(i));
  path.moveTo(...cs[0].end);
  for (let k = 1; k <= n; k++) {
    const c = cs[k % n];
    path.lineTo(...c.start);
    path.quadraticCurveTo(c.p[0], c.p[1], c.end[0], c.end[1]);
  }
  return path;
}

/** The silhouette inset by `d`, corners shrinking with it. */
function silhouette<T extends THREE.Path>(path: T, d: number): T {
  return roundedPolygon(path, inset(SILHOUETTE, d), CORNER_R.map((r) => Math.max(0.02, r - d)));
}

/** A band of the front molding: between insets `a` (outer) and `b` (inner). */
function moldingRing(a: number, b: number) {
  const shape = silhouette(new THREE.Shape(), a);
  shape.holes.push(silhouette(new THREE.Path(), b));
  return shape;
}

function roundedRect<T extends THREE.Path>(path: T, w: number, h: number, r: number): T {
  return roundedPolygon(
    path,
    [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ],
    [r, r, r, r],
  );
}

function rectRing(outer: [number, number, number], inner: [number, number, number]) {
  const shape = roundedRect(new THREE.Shape(), ...outer);
  shape.holes.push(roundedRect(new THREE.Path(), ...inner));
  return shape;
}

function extrude(shape: THREE.Shape, depth: number, bevel: number, segments = 4) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: segments,
    curveSegments: 14,
  });
}

// --- Materials ---------------------------------------------------------------------------

/** Matte shell vs glossy trim, as in the material studies. */
function surface(name: string, color: string, roughness: number, metalness = 0.05) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 1.1 });
  m.name = P + name;
  return m;
}

/** LED: emissive only, not tone-mapped, so it keeps its exact colour (and blooms). */
function led(name: string, color: string, intensity = 1) {
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity });
  m.name = P + name;
  m.toneMapped = false;
  return m;
}

function add(g: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, pos: [number, number, number], name: string) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

// --- Build ---------------------------------------------------------------------------------

export function buildStudioPodium(colours: PodiumColourway = PODIUM_COLOURWAYS[0], variant = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = "ContestantPodium";
  const tag = variant ? `_v${variant}` : "";

  const shell = withMattePaint(surface("Body_NavyMetal", "#5b45c8", 0.62), 4);
  const moldOuter = surface("Trim_MoldOuter", "#9a82ff", 0.24, 0.1); // specular highlight on the outer trim
  const moldInner = withMattePaint(surface("Trim_MoldInner", "#6a4fd8", 0.45), 6, 0.25);
  const face = surface("Panel_Charcoal", "#4a3ab4", 0.5);
  const kick = withMattePaint(surface("Trim_Kick", "#4a55c8", 0.5), 5, 0.3);
  const bezel = surface("Screen_BlackGlass", "#1c1a44", 0.3, 0.3);
  const glass = surface("Trim_Glass", "#070720", 0.08, 0.5);
  const tray = withMattePaint(surface("Channel_Dark", "#3a2f8f", 0.55), 3, 0.3);
  const lid = surface("Top_MatteCharcoal", "#7a60e4", 0.4);
  const pad = surface("Trim_ButtonPad", "#2a2466", 0.35, 0.2);
  const moldLed = led("Trim_LED" + tag, colours.led, 1.4);

  const baseTop = BASE_H;

  // Tray base: wide rounded slab with a gold LED line round it.
  add(g, new RoundedBoxGeometry(BOTTOM_HALF_W * 2 + 0.3, BASE_H, DEPTH + BEVEL * 2 + 0.16, 4, 0.035), tray, [0, BASE_H / 2, 0], "Tray");
  add(g, new RoundedBoxGeometry(BOTTOM_HALF_W * 2 + 0.31, 0.014, DEPTH + BEVEL * 2 + 0.17, 2, 0.007), led("LED_Base", STUDIO.gold), [0, BASE_H * 0.55, 0], "LED_Base");

  // Outer casing: the trapezoid silhouette extruded front-to-back, heavily bevelled.
  const casing = extrude(silhouette(new THREE.Shape(), 0), DEPTH, BEVEL, 6);
  casing.translate(0, BEVEL, -DEPTH / 2);
  add(g, casing, shell, [0, baseTop, 0], "Casing");

  // High back: the rear of the casing rises above the lid.
  // Rises out of the casing's back edge (overlapping it), rather than sitting on the lid.
  add(g, new RoundedBoxGeometry(TOP_HALF_W * 2 + 0.06, 0.3, 0.16, 5, 0.07), shell, [0, baseTop + BODY_H + BEVEL * 2 - 0.05, -DEPTH / 2 + 0.02], "HighBack");

  // Chunky molding on the front: outer lavender band, LED line, inner purple band, recessed face.
  const z = baseTop; // silhouette y = 0 sits on the tray
  const fz = FRONT_Z - 0.012;
  const mold = (shape: THREE.Shape, depth: number, bevel: number, m: THREE.Material, dz: number, name: string) => {
    const geo = extrude(shape, depth, bevel, 3);
    geo.translate(0, BEVEL, 0);
    return add(g, geo, m, [0, z, fz + dz], name);
  };
  mold(moldingRing(-0.04, 0.075), 0.05, 0.025, moldOuter, 0, "MoldOuter");
  mold(moldingRing(0.08, 0.1), 0.04, 0.006, moldLed, 0.03, "MoldLED");
  mold(moldingRing(0.105, 0.145), 0.035, 0.014, moldInner, 0.012, "MoldInner");
  mold(silhouette(new THREE.Shape(), 0.14), 0.01, 0, face, 0, "Face");

  // Screen module: bezel, glowing border (status), glass, name card.
  const sy = baseTop + BEVEL + SCREEN_Y;
  const sz = fz + 0.03;
  const card = PODIUM_CARD;
  const bezelGeo = extrude(rectRing([card.w + 0.1, card.h + 0.1, 0.07], [card.w + 0.02, card.h + 0.02, 0.035]), 0.03, 0.014, 3);
  add(g, bezelGeo, bezel, [0, sy, sz], "Bezel");
  add(g, extrude(rectRing([card.w + 0.025, card.h + 0.025, 0.037], [card.w, card.h, 0.025]), 0.004, 0), led("Screen_Border", STUDIO.blue), [0, sy, sz + 0.03], "Screen_Border");
  add(g, new THREE.PlaneGeometry(card.w + 0.02, card.h + 0.02), glass, [0, sy, sz + 0.012], "ScreenGlass");

  // drawNameTexture follows the glTF UV convention (flipY = false): flip V to match.
  const cardGeo = new THREE.PlaneGeometry(card.w, card.h);
  const uv = cardGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const display = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, roughness: 0.3 });
  display.name = P + "Screen_Display";
  display.toneMapped = false;
  const blank = new THREE.DataTexture(new Uint8Array([30, 22, 90, 255]), 1, 1);
  blank.colorSpace = THREE.SRGBColorSpace;
  blank.needsUpdate = true;
  display.map = blank;
  display.emissiveMap = blank;
  const shown = add(g, cardGeo, display, [0, sy, sz + 0.02], "Screen_Display");
  shown.castShadow = false;

  // Kick panel: recessed blue block at the foot, LED line (status) along its top.
  const kickY = baseTop + BEVEL + 0.26;
  const kickW = (BOTTOM_HALF_W - 0.14) * 2 + 0.06;
  add(g, extrude(roundedRect(new THREE.Shape(), kickW, 0.17, 0.05), 0.025, 0.012, 3), kick, [0, kickY - 0.06, fz + 0.005], "Kick");
  add(g, new RoundedBoxGeometry(kickW - 0.04, 0.014, 0.02, 2, 0.006), led("LED_Vertical", STUDIO.blue), [0, kickY + 0.04, fz + 0.03], "LED_Vertical");

  // Lid + oversized buzzer (status colour): square pad, round button.
  const topY = baseTop + BODY_H + BEVEL * 2;
  // The casing top is the "lid": a slightly lighter inset panel, the square buzzer pad on it.
  add(g, new RoundedBoxGeometry(TOP_HALF_W * 2 - 0.2, 0.016, DEPTH - 0.12, 4, 0.008), lid, [0, topY + 0.002, 0.02], "Lid");
  add(g, new RoundedBoxGeometry(0.32, 0.05, 0.32, 4, 0.03), pad, [0, topY + 0.02, 0.06], "ButtonPad");
  const button = new THREE.CylinderGeometry(0.105, 0.115, 0.05, 32);
  const dome = new THREE.SphereGeometry(0.105, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.32, 1).translate(0, 0.025, 0);
  const buzzer = led("LED_Top", STUDIO.blue, 1.3);
  add(g, button, buzzer, [0, topY + 0.065, 0.06], "LED_Top");
  add(g, dome, buzzer, [0, topY + 0.065, 0.06], "LED_Top_Dome");

  return g;
}

const PODIUM_SCALE = 0.84;
const cache = new Map<number, THREE.Group>();

/** Shared templates (usePodiums clones one per slot); the molding LED alternates pink / gold. */
export function studioPodiumTemplate(slot = 0): THREE.Group {
  const variant = slot % PODIUM_COLOURWAYS.length;
  let t = cache.get(variant);
  if (!t) {
    t = buildStudioPodium(PODIUM_COLOURWAYS[variant], variant);
    // Sized so the player behind still shows from the chest up in the host camera shots.
    t.scale.setScalar(PODIUM_SCALE);
    cache.set(variant, t);
  }
  return t;
}
