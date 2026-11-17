import * as THREE from "three";

import type { HeadProfile, HeadRow, Painter, Rgb } from "@/components/quiz-cup/arena/mascot/head-loft";
import type { HeadTraceTuning } from "@/components/quiz-cup/arena/mascot/mascot-spec";
import { MASCOT_HEIGHT } from "@/components/quiz-cup/arena/mascot/mascot-spec";

import { type ArtView, type ConceptArt, type ViewName, toPixel } from "./concept-art";

const CLOTH_BLUE_MARGIN = 12;
const ROW_STEP = 0.004;
const FACE_CONTOUR = 0.006;
const FACE_WIDTH_BLEND = 0.045;
const FACE_EDGE_SEARCH = 0.035;
const FACE_EDGE_FADE = 0.012;
const HAIR_MIN_WIDTH = 0.01;
const SKIN_TONE_RANGE = 40;
const FACE_WIDTH_FILTER_RADIUS = 4;
const EAR_START_MAX = 0.012;
const SILHOUETTE_SCAN = 0.16;
const SKIN_MIN_RED = 120;
const SKIN_RED_OVER_BLUE = 30;
const NOSE_MIN_DEPTH = 0.004;
const SMOOTH_PASSES = 4;
const NECK_STEP = 0.01;
const JAW_BLEND = 0.012;
const UNDER_JAW_TAPER = 0.03;
const FRONT_HAIR_MIN_NZ = -0.2;
const NAPE_RISE = 0.03;
const NAPE_TAPER = 0.06;
const NAPE_SEARCH = 0.08;
const JAW_SKIN_BAND = 0.06;
const JAW_WINDOW = 0.12;
const EAR_ZONE = { halfHeight: 0.05, halfDepth: 0.035, minSideways: 0.3 };
const FACE_SLIM_IN = 0.03;
const FACE_SLIM_FULL = 0.045;
const BLEND_SHARPNESS = 6;
const FRONT_ONLY_FROM = 0.75;
const SIDES_ONLY_BELOW = 0.45;
const CROWN_FROM = 0.45;
const CROWN_FULL = 0.85;
const CROWN_HAIR_SHARE = 0.85;
const NECK_BLEND = 0.02;
const NAPE_ABOVE_CHIN = 0.035;
const SOLID = 250;
const OPAQUE = 128;

type Extent = [number, number];
type TracedRow = HeadRow & { centerX: number };

const SIDE_WINDOW: Record<ViewName, Extent> = {
  front: [-0.2, 0.2],
  back: [-0.2, 0.2],
  right: [-0.32, 0.2],
  left: [-0.2, 0.32],
};

function isCloth(rgba: Uint8ClampedArray, i: number) {
  const blue = rgba[i + 2];
  return blue > rgba[i] + CLOTH_BLUE_MARGIN && blue > rgba[i + 1] + CLOTH_BLUE_MARGIN;
}

function rowExtent(art: ConceptArt, view: ArtView, y: number, [from, to]: Extent): Extent | null {
  const [, py] = toPixel(view, 0, y);
  const row = Math.round(py);
  if (row < 0 || row >= art.height) return null;
  const x0 = Math.max(view.left, Math.round(toPixel(view, from, y)[0]));
  const x1 = Math.min(view.right, Math.round(toPixel(view, to, y)[0]));
  let min = -1;
  let max = -1;
  for (let x = x0; x <= x1; x++) {
    const i = (row * art.width + x) * 4;
    if (art.rgba[i + 3] < OPAQUE || isCloth(art.rgba, i)) continue;
    if (min < 0) min = x;
    max = x;
  }
  if (min < 0) return null;
  const lateral = (px: number) => (px - view.feetX) * view.metersPerPixel;
  return [lateral(min), lateral(max + 1)];
}

function depthExtent(art: ConceptArt, y: number): Extent | null {
  const right = rowExtent(art, art.views.right, y, SIDE_WINDOW.right);
  const left = rowExtent(art, art.views.left, y, SIDE_WINDOW.left);
  const fromLeft: Extent | null = left && [-left[1], -left[0]];
  if (right && fromLeft) return [(right[0] + fromLeft[0]) / 2, (right[1] + fromLeft[1]) / 2];
  return right ?? fromLeft;
}

function smooth(rows: TracedRow[], key: "halfWidth" | "front" | "back") {
  const values = rows.map((row) => row[key]);
  for (let i = 1; i < rows.length - 1; i++) rows[i][key] = (values[i - 1] + values[i] + values[i + 1]) / 3;
}

function interpolateAcross(
  rows: TracedRow[],
  key: "halfWidth" | "front",
  [from, to]: Extent,
  keep: (row: TracedRow, value: number) => number,
) {
  const below = rows.findLast((row) => row.y < from);
  const above = rows.find((row) => row.y > to);
  if (!below || !above) return;
  for (const row of rows) {
    if (row.y < from || row.y > to) continue;
    const t = (row.y - below.y) / (above.y - below.y);
    row[key] = keep(row, below[key] + (above[key] - below[key]) * t);
  }
}

function pixelAt(art: ConceptArt, view: ArtView, lateral: number, y: number) {
  const [px, py] = toPixel(view, lateral, y);
  const i = (Math.round(py) * art.width + Math.round(px)) * 4;
  return {
    opaque: art.rgba[i + 3] >= OPAQUE,
    skin: art.rgba[i] > SKIN_MIN_RED && art.rgba[i] > art.rgba[i + 2] + SKIN_RED_OVER_BLUE,
  };
}

function faceEdgeFrom(art: ConceptArt, y: number, side: 1 | -1) {
  const view = art.views.front;
  const step = view.metersPerPixel * side;
  let lateral = SILHOUETTE_SCAN * side;
  while (Math.abs(lateral) > 0 && !pixelAt(art, view, lateral, y).opaque) lateral -= step;
  const silhouette = lateral;
  while (Math.abs(silhouette - lateral) < EAR_START_MAX && !pixelAt(art, view, lateral, y).skin) lateral -= step;
  if (pixelAt(art, view, lateral, y).skin) {
    while (Math.abs(lateral) > 0 && pixelAt(art, view, lateral, y).skin) lateral -= step;
  } else {
    lateral = silhouette;
  }
  while (Math.abs(lateral) > 0 && !pixelAt(art, view, lateral, y).skin) lateral -= step;
  return Math.abs(lateral);
}

function drawnFaceHalf(art: ConceptArt, y: number) {
  return Math.min(faceEdgeFrom(art, y, 1), faceEdgeFrom(art, y, -1));
}

function denoise(values: number[]) {
  const window = (list: number[], i: number) =>
    list.slice(Math.max(0, i - FACE_WIDTH_FILTER_RADIUS), i + FACE_WIDTH_FILTER_RADIUS + 1);
  const medians = values.map((_, i) => {
    const sorted = window(values, i).sort((a, b) => a - b);
    return sorted[sorted.length >> 1];
  });
  return medians.map((_, i) => {
    const near = window(medians, i);
    return near.reduce((sum, value) => sum + value, 0) / near.length;
  });
}

function fitFaceWidth(art: ConceptArt, rows: TracedRow[], [from, to]: [number, number]) {
  const band = rows.filter((row) => row.y >= from && row.y <= to);
  if (!band.length) return;
  const faces = denoise(band.map((row) => Math.min(row.halfWidth, drawnFaceHalf(art, row.y) + FACE_CONTOUR)));
  const first = faces[0];
  const last = faces[faces.length - 1];
  band.forEach((row, i) => (row.halfWidth = faces[i]));
  for (const row of rows) {
    if (row.y > from - FACE_WIDTH_BLEND && row.y < from) {
      row.halfWidth = THREE.MathUtils.lerp(
        row.halfWidth,
        first,
        THREE.MathUtils.smoothstep(row.y, from - FACE_WIDTH_BLEND, from),
      );
    } else if (row.y > to && row.y < to + FACE_WIDTH_BLEND) {
      row.halfWidth = THREE.MathUtils.lerp(
        last,
        row.halfWidth,
        THREE.MathUtils.smoothstep(row.y, to, to + FACE_WIDTH_BLEND),
      );
    }
  }
}

function neckRow({ radius, z }: HeadTraceTuning["neck"], y: number): TracedRow {
  return { y, halfWidth: radius, front: z + radius, back: z - radius, centerX: 0 };
}

function taperUnderJaw(rows: TracedRow[], chinY: number) {
  let narrowest = Infinity;
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row.y > chinY + UNDER_JAW_TAPER) continue;
    narrowest = Math.min(narrowest, row.halfWidth);
    row.halfWidth = narrowest;
  }
}

function joinNeck(rows: TracedRow[], chinY: number, napeY: number, neckSize: HeadTraceTuning["neck"]) {
  taperUnderJaw(rows, chinY);
  for (const row of rows) {
    const neck = neckRow(neckSize, row.y);
    if (row.y < chinY) {
      const t = THREE.MathUtils.smoothstep(row.y, chinY - JAW_BLEND, chinY);
      row.halfWidth = THREE.MathUtils.lerp(neck.halfWidth, row.halfWidth, t);
      row.front = THREE.MathUtils.lerp(neck.front, row.front, t);
    }
    if (row.y < napeY + NAPE_RISE) {
      const t = THREE.MathUtils.smoothstep(row.y, napeY, napeY + NAPE_RISE);
      row.back = THREE.MathUtils.lerp(neck.back, row.back, t);
    }
    if (row.y < napeY + NAPE_TAPER) {
      const t = THREE.MathUtils.smoothstep(row.y, napeY, napeY + NAPE_TAPER);
      row.backHalfWidth = THREE.MathUtils.lerp(neck.halfWidth, row.halfWidth, t);
    }
  }
}

function findNape(rows: TracedRow[], chinY: number) {
  const candidates = rows.filter((row) => row.y >= chinY && row.y <= chinY + NAPE_SEARCH);
  return candidates.reduce((nape, row) => (row.back > nape.back ? row : nape), candidates[0]).y;
}

function skinHalf(art: ConceptArt, y: number) {
  const view = art.views.front;
  const outermost = (side: 1 | -1) => {
    let found = 0;
    for (let lateral = 0; lateral <= JAW_WINDOW; lateral += view.metersPerPixel) {
      if (pixelAt(art, view, lateral * side, y).skin) found = lateral;
    }
    return found;
  };
  return Math.min(outermost(1), outermost(-1));
}

function fitJawWidth(art: ConceptArt, rows: TracedRow[], chinY: number) {
  for (const row of rows) {
    if (row.y < chinY || row.y > chinY + JAW_SKIN_BAND) continue;
    const jaw = skinHalf(art, row.y);
    if (jaw > 0) row.halfWidth = Math.min(row.halfWidth, jaw + FACE_CONTOUR);
  }
}

function slimFace(rows: TracedRow[], chinY: number, faceSlim: number, slimTop: number) {
  for (const row of rows) {
    const fromChin = THREE.MathUtils.smoothstep(row.y, chinY, chinY + FACE_SLIM_IN);
    const towardTemples = 1 - THREE.MathUtils.smoothstep(row.y, chinY + FACE_SLIM_FULL, slimTop);
    row.halfWidth *= THREE.MathUtils.lerp(1, faceSlim, fromChin * towardTemples);
  }
}

function halfWidthAt(rows: HeadRow[], y: number) {
  const above = rows.findIndex((row) => row.y >= y);
  if (above <= 0) return rows[Math.max(0, above)].halfWidth;
  const below = rows[above - 1];
  const t = (y - below.y) / (rows[above].y - below.y);
  return THREE.MathUtils.lerp(below.halfWidth, rows[above].halfWidth, t);
}

function findChin(rows: TracedRow[], search: [number, number]) {
  let chinY = search[0];
  let biggestStep = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].y < search[0] || rows[i].y > search[1]) continue;
    const step = rows[i].front - rows[i - 1].front;
    if (step > biggestStep) {
      biggestStep = step;
      chinY = rows[i].y;
    }
  }
  return chinY;
}

export function traceHead(art: ConceptArt, tuning: HeadTraceTuning): HeadProfile {
  const rows: TracedRow[] = [];
  const { bands, neck } = tuning;
  for (let y = bands.headBottom; y < MASCOT_HEIGHT + 0.1; y += ROW_STEP) {
    const width = rowExtent(art, art.views.front, y, SIDE_WINDOW.front);
    const depth = depthExtent(art, y);
    if (!width || !depth) break;
    rows.push({
      y,
      halfWidth: (width[1] - width[0]) / 2,
      centerX: (width[0] + width[1]) / 2,
      back: depth[0],
      front: depth[1],
    });
  }
  if (rows.length < 10) throw new Error("Could not trace the head from the concept art");

  const earRows = rows.filter((row) => row.y >= bands.ear[0] && row.y <= bands.ear[1]);
  const earRow = earRows.reduce((widest, row) => (row.halfWidth > widest.halfWidth ? row : widest), earRows[0]);
  const earY = earRow.y - 0.007;
  const earZ = (earRow.front + earRow.back) / 2 - 0.03;
  fitFaceWidth(art, rows, bands.faceWidth);

  const chinY = findChin(rows, bands.chin);
  const napeY = findNape(rows, chinY);
  fitJawWidth(art, rows, chinY);
  slimFace(rows, chinY, tuning.faceSlim, bands.slimTop);
  for (let pass = 0; pass < SMOOTH_PASSES; pass++)
    (["halfWidth", "front", "back"] as const).forEach((key) => smooth(rows, key));

  joinNeck(rows, chinY, napeY, neck);
  for (let y = rows[0].y - NECK_STEP; y >= neck.bottom; y -= NECK_STEP) rows.unshift(neckRow(neck, y));

  if (bands.flattenFront) interpolateAcross(rows, "front", bands.flattenFront, (row, baseline) => Math.min(row.front, baseline));
  const originalFront = new Map(rows.map((row) => [row, row.front]));
  interpolateAcross(rows, "front", bands.nose, (row, baseline) => Math.min(row.front, baseline));
  let nose: HeadProfile["nose"] = null;
  for (const row of rows) {
    const depth = originalFront.get(row)! - row.front;
    if (depth > NOSE_MIN_DEPTH && depth > (nose ? nose.tip - nose.base : 0)) {
      nose = { y: row.y, base: row.front, tip: originalFront.get(row)! };
    }
  }

  const jaw = rows.filter((row) => row.y >= chinY && row.y < bands.jawCenterLimit);
  const centerX = jaw.reduce((sum, row) => sum + row.centerX, 0) / jaw.length;
  return {
    rows: rows.map(({ y, halfWidth, front, back, backHalfWidth }) => ({ y, halfWidth, front, back, backHalfWidth })),
    centerX,
    nose,
    ear: { y: earY, halfWidth: halfWidthAt(rows, earY), z: earZ },
    chinY,
  };
}

const PROJECTIONS: { view: ViewName; dx: number; dz: number; lateral: (x: number, z: number) => number }[] = [
  { view: "front", dx: 0, dz: 1, lateral: (x) => x },
  { view: "back", dx: 0, dz: -1, lateral: (x) => -x },
  { view: "right", dx: -1, dz: 0, lateral: (_, z) => z },
  { view: "left", dx: 1, dz: 0, lateral: (_, z) => -z },
];

function sample(art: ConceptArt, view: ArtView, lateral: number, y: number): Rgb | null {
  const [px, py] = toPixel(view, lateral, y);
  const x0 = Math.floor(px - 0.5);
  const y0 = Math.floor(py - 0.5);
  const fx = px - 0.5 - x0;
  const fy = py - 0.5 - y0;
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (const [dx, dy, w] of [
    [0, 0, (1 - fx) * (1 - fy)],
    [1, 0, fx * (1 - fy)],
    [0, 1, (1 - fx) * fy],
    [1, 1, fx * fy],
  ]) {
    const x = x0 + dx;
    const yy = y0 + dy;
    if (x < view.left || x > view.right || yy < 0 || yy >= art.height) continue;
    const i = (yy * art.width + x) * 4;
    if (art.rgba[i + 3] < SOLID || isCloth(art.rgba, i)) continue;
    const weight = w;
    r += art.rgba[i] * weight;
    g += art.rgba[i + 1] * weight;
    b += art.rgba[i + 2] * weight;
    total += weight;
  }
  return total > 0.5 ? [r / total, g / total, b / total] : null;
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

function averageColor(art: ConceptArt, points: [number, number][]): Rgb {
  const colors = points.map(([x, y]) => sample(art, art.views.front, x, y)).filter((c): c is Rgb => !!c);
  return colors.reduce<Rgb>(
    (sum, c) => [sum[0] + c[0] / colors.length, sum[1] + c[1] / colors.length, sum[2] + c[2] / colors.length],
    [0, 0, 0],
  );
}

function sideColor(art: ConceptArt, point: { x: number; y: number; z: number }, nx: number, nz: number): Rgb | null {
  let sum: Rgb = [0, 0, 0];
  let total = 0;
  for (const { view, dx, dz, lateral } of PROJECTIONS) {
    if (view === "front") continue;
    const weight = Math.max(0, nx * dx + nz * dz) ** BLEND_SHARPNESS;
    if (weight < 1e-3) continue;
    const color = sample(art, art.views[view], lateral(point.x, point.z), point.y);
    if (!color) continue;
    sum = [sum[0] + color[0] * weight, sum[1] + color[1] * weight, sum[2] + color[2] * weight];
    total += weight;
  }
  return total > 1e-4 ? [sum[0] / total, sum[1] / total, sum[2] / total] : null;
}

type HairTest = (color: Rgb) => boolean;

function hairTest({ hairMinLuma = 0, hairMaxLuma, hairMaxWarmth, hairMaxChroma = 255 }: HeadTraceTuning): HairTest {
  return ([r, g, b]) => {
    const luma = 0.3 * r + 0.59 * g + 0.11 * b;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    return luma >= hairMinLuma && luma < hairMaxLuma && r - b < hairMaxWarmth && chroma <= hairMaxChroma;
  };
}

type FaceEdge = { y: number; halfWidth: number; left: number; right: number };

function lerpAt(edges: FaceEdge[], y: number, key: "halfWidth" | "left" | "right") {
  const hi = edges.findIndex((edge) => edge.y >= y);
  if (hi <= 0) return edges[hi === 0 ? 0 : edges.length - 1][key];
  const lo = edges[hi - 1];
  const t = (y - lo.y) / (edges[hi].y - lo.y);
  return lo[key] + (edges[hi][key] - lo[key]) * t;
}

function isSkinTone(color: Rgb | null, skin: Rgb): color is Rgb {
  return !!color && Math.hypot(color[0] - skin[0], color[1] - skin[1], color[2] - skin[2]) < SKIN_TONE_RANGE;
}

function drawnFaceEdge(art: ConceptArt, head: HeadProfile, skin: Rgb, row: HeadRow, side: 1 | -1) {
  const view = art.views.front;
  const at = (lateral: number) => sample(art, view, head.centerX + side * lateral, row.y);
  let lateral = Math.max(0, row.halfWidth - FACE_EDGE_SEARCH);
  while (lateral < row.halfWidth && !isSkinTone(at(lateral), skin)) lateral += view.metersPerPixel;
  while (lateral < row.halfWidth && isSkinTone(at(lateral), skin)) lateral += view.metersPerPixel;
  return lateral;
}

function faceEdges(art: ConceptArt, head: HeadProfile, skin: Rgb): FaceEdge[] {
  const left = denoise(head.rows.map((row) => drawnFaceEdge(art, head, skin, row, -1)));
  const right = denoise(head.rows.map((row) => drawnFaceEdge(art, head, skin, row, 1)));
  return head.rows.map((row, i) => ({ y: row.y, halfWidth: row.halfWidth, left: left[i], right: right[i] }));
}

function frontColor(
  art: ConceptArt,
  head: HeadProfile | null,
  edges: FaceEdge[] | null,
  skin: Rgb,
  point: { x: number; y: number },
  isHair: HairTest,
) {
  const view = art.views.front;
  const color = sample(art, view, point.x, point.y);
  if (!head || !edges || !color || !isOnHead(head, edges, point)) return color;
  const edge = lerpAt(edges, point.y, point.x > head.centerX ? "right" : "left");
  const fade = THREE.MathUtils.smoothstep(Math.abs(point.x - head.centerX), edge - FACE_EDGE_FADE, edge);
  if (fade === 0 || isHairAt(art, view, point.x, point.y, isHair)) return color;
  return mix(color, skin, fade);
}

function isHairAt(art: ConceptArt, view: ArtView, lateral: number, y: number, isHair: HairTest) {
  const step = view.metersPerPixel;
  const hairAt = (at: number) => {
    const color = sample(art, view, at, y);
    return !!color && isHair(color);
  };
  if (!hairAt(lateral)) return false;
  let width = step;
  for (let at = lateral + step; width < HAIR_MIN_WIDTH && hairAt(at); at += step) width += step;
  for (let at = lateral - step; width < HAIR_MIN_WIDTH && hairAt(at); at -= step) width += step;
  return width >= HAIR_MIN_WIDTH;
}

function inEarZone(head: HeadProfile, point: { y: number; z: number }, nx: number) {
  if (Math.abs(nx) < EAR_ZONE.minSideways) return false;
  const dy = (point.y - head.ear.y) / EAR_ZONE.halfHeight;
  const dz = (point.z - head.ear.z) / EAR_ZONE.halfDepth;
  return dy * dy + dz * dz < 1;
}

function isOnHead(head: HeadProfile, edges: FaceEdge[], point: { x: number; y: number }) {
  return Math.abs(point.x - head.centerX) <= lerpAt(edges, point.y, "halfWidth") + 1e-4;
}

export function createPainter(art: ConceptArt, head: HeadProfile | null, tuning: HeadTraceTuning): Painter {
  const skin = averageColor(art, tuning.skinSamples);
  const hair = averageColor(art, tuning.hairSamples);
  const isHair = hairTest(tuning);
  const edges = head && faceEdges(art, head, skin);
  return (point, normal) => {
    const length = Math.hypot(normal.x, normal.z);
    const nx = length > 1e-3 ? normal.x / length : 0;
    const nz = length > 1e-3 ? normal.z / length : 0;
    const frontShare = THREE.MathUtils.smoothstep(nz, SIDES_ONLY_BELOW, FRONT_ONLY_FROM);
    const fromFront = frontShare > 0 ? frontColor(art, head, edges, skin, point, isHair) : null;
    let fromSides = frontShare < 1 ? sideColor(art, point, nx, nz) : null;
    if (
      tuning.frontHairWins &&
      fromSides &&
      !isHair(fromSides) &&
      nz > FRONT_HAIR_MIN_NZ &&
      isHairAt(art, art.views.front, point.x, point.y, isHair)
    ) {
      fromSides = sample(art, art.views.front, point.x, point.y) ?? hair;
    } else if (tuning.clearDrawnEars && head && fromSides && !isHair(fromSides) && inEarZone(head, point, nx)) {
      fromSides = skin;
    } else if (fromSides && !isHair(fromSides)) {
      if (nz > 0) fromSides = skin;
      else if (head && edges && isOnHead(head, edges, point) && !isSkinTone(fromSides, skin)) fromSides = skin;
    }
    let color: Rgb | null = fromFront && fromSides ? mix(fromSides, fromFront, frontShare) : (fromFront ?? fromSides);

    const crown = THREE.MathUtils.smoothstep(normal.y, CROWN_FROM, CROWN_FULL) * CROWN_HAIR_SHARE;
    if (crown > 0) color = mix(color ?? hair, hair, crown);

    if (head) {
      const neckTop = head.chinY + (nz < 0 ? NAPE_ABOVE_CHIN : 0);
      const neck = 1 - THREE.MathUtils.smoothstep(point.y, neckTop - NECK_BLEND, neckTop + NECK_BLEND);
      if (neck > 0) color = mix(color ?? skin, skin, neck);
    }
    return color;
  };
}
