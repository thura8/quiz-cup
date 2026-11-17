import { MASCOT_HEIGHT } from "@/components/quiz-cup/arena/mascot/mascot-spec";

import { keyOutWhite, loadImage } from "../cast/sprite-sheet";

export const VIEW_NAMES = ["front", "right", "left", "back"] as const;
export type ViewName = (typeof VIEW_NAMES)[number];

export const VIEW_YAW: Record<ViewName, number> = {
  front: 0,
  right: -Math.PI / 2,
  left: Math.PI / 2,
  back: Math.PI,
};

export type ArtView = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  feetX: number;
  metersPerPixel: number;
};

export type ConceptArt = {
  canvas: HTMLCanvasElement;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  views: Record<ViewName, ArtView>;
};

const OPAQUE = 128;
const MIN_COLUMN_PIXELS = 3;
const MERGE_GAP = 40;
const MIN_VIEW_WIDTH = 100;
const FEET_FRACTION = 0.06;

function opaque(art: Pick<ConceptArt, "rgba" | "width">, x: number, y: number) {
  return art.rgba[(y * art.width + x) * 4 + 3] >= OPAQUE;
}

function findColumnRuns(art: Pick<ConceptArt, "rgba" | "width" | "height">) {
  const runs: [number, number][] = [];
  let start = -1;
  for (let x = 0; x <= art.width; x++) {
    let count = 0;
    if (x < art.width) for (let y = 0; y < art.height && count < MIN_COLUMN_PIXELS; y++) if (opaque(art, x, y)) count++;
    const filled = count >= MIN_COLUMN_PIXELS;
    if (filled && start < 0) start = x;
    if (!filled && start >= 0) {
      const previous = runs.at(-1);
      if (previous && start - previous[1] < MERGE_GAP) previous[1] = x - 1;
      else runs.push([start, x - 1]);
      start = -1;
    }
  }
  return runs.filter(([a, b]) => b - a > MIN_VIEW_WIDTH);
}

function measureView(art: Pick<ConceptArt, "rgba" | "width" | "height">, left: number, right: number): ArtView {
  let top = art.height;
  let bottom = 0;
  for (let y = 0; y < art.height; y++) {
    for (let x = left; x <= right; x++) {
      if (!opaque(art, x, y)) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      break;
    }
  }
  let sum = 0;
  let count = 0;
  for (let y = Math.round(bottom - (bottom - top) * FEET_FRACTION); y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (!opaque(art, x, y)) continue;
      sum += x;
      count++;
    }
  }
  return {
    left,
    right,
    top,
    bottom,
    feetX: sum / count,
    metersPerPixel: MASCOT_HEIGHT / (bottom - top),
  };
}

export async function loadConceptArt(url: string): Promise<ConceptArt> {
  const { canvas, rgba, width, height } = keyOutWhite(await loadImage(url));
  const base = { rgba, width, height };
  const runs = findColumnRuns(base);
  if (runs.length !== VIEW_NAMES.length) {
    throw new Error(
      `Expected ${VIEW_NAMES.length} views (front, right, left, back) in the turnaround, found ${runs.length}`,
    );
  }
  const views = Object.fromEntries(VIEW_NAMES.map((name, i) => [name, measureView(base, ...runs[i])])) as Record<
    ViewName,
    ArtView
  >;
  return { canvas, rgba, width, height, views };
}

export function toPixel(view: ArtView, lateral: number, y: number): [number, number] {
  return [view.feetX + lateral / view.metersPerPixel, view.bottom - y / view.metersPerPixel];
}

export function toMeters(view: ArtView, px: number, py: number): [number, number] {
  return [(px - view.feetX) * view.metersPerPixel, (view.bottom - py) * view.metersPerPixel];
}

export function silhouetteSpan(art: ConceptArt, view: ArtView, px: number, py: number): [number, number] | null {
  const x = Math.round(px);
  const y = Math.round(py);
  if (y < 0 || y >= art.height || x < view.left || x > view.right || !opaque(art, x, y)) return null;
  let a = x;
  let b = x;
  while (a > view.left && opaque(art, a - 1, y)) a--;
  while (b < view.right && opaque(art, b + 1, y)) b++;
  return [toMeters(view, a, y)[0], toMeters(view, b + 1, y)[0]];
}
