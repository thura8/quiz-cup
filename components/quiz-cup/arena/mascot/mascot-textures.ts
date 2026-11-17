import * as THREE from "three";

import type { CharacterSpec, OutfitDetails } from "./mascot-spec";

const JACKET_TEXTURE_SIZE = 1024;
const BUTTON_RADIUS = 0.009;
const SHIRT_BUTTON_RADIUS = 0.006;
const ZIPPER_TAPE = 0.006;
const POCKET_HALF = 0.0018;
const RIB_PITCH = 0.011;
const RIB_WIDTH = 0.0025;
const HEM_OUTLINE = 0.007;
const UNDER_STRIP_WIDENING = 0.35;

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function shirtHalf({ strip }: OutfitDetails, y: number, radius: number) {
  const t = THREE.MathUtils.clamp((y - strip.bottom) / (strip.top - strip.bottom), 0, 1);
  return Math.min(radius * 0.8, THREE.MathUtils.lerp(strip.halfBottom, strip.halfTop, t));
}

export function jacketTexture(spec: CharacterSpec, profile: THREE.Vector2[]) {
  const P = spec.palette;
  const outfit = spec.outfit;
  const { strip, lapel, belt, flaps } = outfit;
  const hemOutlineBelow = spec.jacket.profile[0][1] + HEM_OUTLINE;
  const underStripFrom = belt ? belt.y[0] : strip.bottom;
  const size = JACKET_TEXTURE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.fillStyle = P.jacket;
  context.fillRect(0, 0, size, size);

  const last = profile.length - 1;
  const rowY = new Float32Array(size);
  const rowRadius = new Float32Array(size);
  for (let row = 0; row < size; row++) {
    const f = (1 - (row + 0.5) / size) * last;
    const i = Math.min(Math.floor(f), last - 1);
    const t = f - i;
    rowY[row] = THREE.MathUtils.lerp(profile[i].y, profile[i + 1].y, t);
    rowRadius[row] = THREE.MathUtils.lerp(profile[i].x, profile[i + 1].x, t);
  }

  for (let row = 0; row < size; row++) {
    const y = rowY[row];
    const radius = rowRadius[row];
    const px = (x: number) => (0.5 + Math.asin(THREE.MathUtils.clamp(x / radius, -1, 1)) / (Math.PI * 2)) * size;
    const span = (x0: number, x1: number, color: string) => {
      context.fillStyle = color;
      context.fillRect(px(x0), row, Math.max(1, px(x1) - px(x0)), 1);
    };
    const edges = (half: number, color: string = P.outline) => {
      context.fillStyle = color;
      context.fillRect(px(-half) - 2, row, 3, 1);
      context.fillRect(px(half) - 1, row, 3, 1);
    };

    const zipperTape = (half: number) => {
      if (!outfit.zipper) return;
      span(half, half + ZIPPER_TAPE, P.lapel);
      span(-half - ZIPPER_TAPE, -half, P.lapel);
      if (row % 3 === 0) {
        span(half + 0.001, half + 0.0035, P.metal ?? P.trim ?? P.shirt);
        span(-half - 0.0035, -half - 0.001, P.metal ?? P.trim ?? P.shirt);
      }
    };

    if (outfit.hemBand && y < outfit.hemBand) {
      span(-radius, radius, P.cuff ?? P.jacket);
      if (outfit.ribbed) for (let x = -radius; x < radius; x += RIB_PITCH) span(x, x + RIB_WIDTH, P.lapel);
    }
    if (y >= (belt ? belt.y[1] : strip.bottom)) {
      const half = shirtHalf(outfit, y, radius);
      span(-half, half, P.shirt);
      if (strip.pattern && P.shirtPattern && row % 7 === 0) {
        context.fillStyle = P.shirtPattern;
        const shift = (row / 7) % 2 ? 0.006 : 0;
        for (let x = -half + 0.004 + shift; x < half - 0.004; x += 0.012) context.fillRect(px(x), row, 2, 2);
      }
      if (y > lapel.start) {
        const width = lapel.width * THREE.MathUtils.smoothstep(y, lapel.start, lapel.full);
        span(half, half + width, P.lapel);
        span(-half - width, -half, P.lapel);
        edges(half + width);
      }
      zipperTape(half);
      edges(half);
    } else if (belt && y >= belt.y[0]) {
      span(-belt.half, belt.half, P.belt ?? P.outline);
      if (y > belt.y[0] + 0.004 && y < belt.y[1] - 0.004) span(-belt.buckleHalf, belt.buckleHalf, P.buckle ?? P.shirt);
      edges(belt.half);
    } else {
      const half = (belt ? belt.half : strip.halfBottom) + (underStripFrom - y) * UNDER_STRIP_WIDENING;
      span(-half, half, P.trousers);
      zipperTape(half);
      edges(half);
    }

    if (flaps && y > flaps.y[0] && y < flaps.y[1]) {
      span(flaps.x[0], flaps.x[1], P.lapel);
      span(-flaps.x[1], -flaps.x[0], P.lapel);
    }
    for (const line of outfit.pocketLines) {
      if (line.rise) {
        const t = (y - line.y) / line.rise;
        if (t < 0 || t > 1) continue;
        const x = THREE.MathUtils.lerp(line.x[0], line.x[1], t);
        span(x - POCKET_HALF, x + POCKET_HALF, P.outline);
        span(-x - POCKET_HALF, -x + POCKET_HALF, P.outline);
      } else if (Math.abs(y - line.y) < 0.0018) {
        span(line.x[0], line.x[1], P.outline);
        span(-line.x[1], -line.x[0], P.outline);
      }
    }
    if (outfit.hemBand && Math.abs(y - outfit.hemBand) < 0.0015) span(-radius, radius, P.outline);
    if (y < hemOutlineBelow) span(-radius, radius, P.outline);
    if (outfit.backSeamTop && y < outfit.backSeamTop) {
      context.fillStyle = P.outline;
      context.fillRect(0, row, 2, 1);
      context.fillRect(size - 2, row, 2, 1);
    }
  }

  const rowOf = (y: number) => {
    let best = 0;
    for (let row = 1; row < size; row++) if (Math.abs(rowY[row] - y) < Math.abs(rowY[best] - y)) best = row;
    return best;
  };
  const metersPerRow = Math.abs(rowY[rowOf(1.0)] - rowY[rowOf(1.0) + 1]);
  const dot = (x: number, y: number, dotRadius: number, color: string) => {
    const row = rowOf(y);
    const radius = rowRadius[row];
    const u = (0.5 + Math.asin(x / radius) / (Math.PI * 2)) * size;
    context.fillStyle = color;
    context.beginPath();
    context.ellipse(u, row, (dotRadius / (Math.PI * 2 * radius)) * size, dotRadius / metersPerRow, 0, 0, Math.PI * 2);
    context.fill();
  };
  for (const y of outfit.buttons) dot(-shirtHalf(outfit, y, rowRadius[rowOf(y)]) - 0.02, y, BUTTON_RADIUS, P.outline);
  for (const y of outfit.shirtButtons ?? []) dot(0, y, SHIRT_BUTTON_RADIUS, P.shirtPattern ?? P.outline);

  return toTexture(canvas);
}

export function ribTexture(base: string, rib: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 16;
  const context = canvas.getContext("2d")!;
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = rib;
  for (let x = 0; x < canvas.width; x += 8) context.fillRect(x, 0, 2, canvas.height);
  return toTexture(canvas);
}

export function foldTexture(base: string, fold: string) {
  const width = 256;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = fold;
  context.lineCap = "round";
  const arc = (v: number, sag: number, from: number, to: number, lineWidth: number) => {
    const y = (1 - v) * height;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(from * width, y);
    context.quadraticCurveTo(((from + to) / 2) * width, y + sag * height, to * width, y);
    context.stroke();
  };
  for (const side of [0, 0.5]) {
    arc(0.9, 0.025, side + 0.12, side + 0.38, 5);
    arc(0.8, 0.02, side + 0.06, side + 0.3, 4);
    arc(0.68, 0.015, side + 0.18, side + 0.42, 3);
    arc(0.12, -0.02, side + 0.1, side + 0.34, 4);
  }
  return toTexture(canvas);
}

export function trouserTexture({ palette: P }: CharacterSpec) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.fillStyle = P.trousers;
  context.fillRect(0, 0, size, size);
  context.fillStyle = P.trouserCrease;
  context.fillRect(size * 0.5 - 1, 0, 2, size);
  context.globalAlpha = 0.5;
  context.fillRect(size * 0.25 - 1, 0, 2, size);
  context.fillRect(size * 0.75 - 1, 0, 2, size);
  return toTexture(canvas);
}
