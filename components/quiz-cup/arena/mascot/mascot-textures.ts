import * as THREE from "three";

import { JACKET, MASCOT_PALETTE as P } from "./mascot-spec";

const JACKET_TEXTURE_SIZE = 1024;
const OPENING_TOP = 1.39;
const LAPEL_START = 1.08;
const LAPEL_FULL = 1.3;
const LAPEL_WIDTH = 0.06;
const BELT_HALF = 0.062;
const BUCKLE_HALF = 0.014;
const BUTTON_RADIUS = 0.009;

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function shirtHalf(y: number, radius: number) {
  const t = THREE.MathUtils.clamp((y - JACKET.beltY[1]) / (OPENING_TOP - JACKET.beltY[1]), 0, 1);
  return Math.min(radius * 0.8, 0.048 + t * 0.027);
}

export function jacketTexture(profile: THREE.Vector2[]) {
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

    const [beltBottom, beltTop] = JACKET.beltY;
    if (y >= beltTop) {
      const half = shirtHalf(y, radius);
      span(-half, half, P.shirt);
      if (row % 7 === 0) {
        context.fillStyle = P.shirtPattern;
        const shift = (row / 7) % 2 ? 0.006 : 0;
        for (let x = -half + 0.004 + shift; x < half - 0.004; x += 0.012) context.fillRect(px(x), row, 2, 2);
      }
      if (y > LAPEL_START) {
        const width = LAPEL_WIDTH * THREE.MathUtils.smoothstep(y, LAPEL_START, LAPEL_FULL);
        span(half, half + width, P.lapel);
        span(-half - width, -half, P.lapel);
        edges(half + width);
      }
      edges(half);
    } else if (y >= beltBottom) {
      span(-BELT_HALF, BELT_HALF, P.belt);
      if (y > beltBottom + 0.004 && y < beltTop - 0.004) span(-BUCKLE_HALF, BUCKLE_HALF, P.buckle);
      edges(BELT_HALF);
    } else {
      const half = BELT_HALF + (beltBottom - y) * 0.35;
      span(-half, half, P.trousers);
      edges(half);
    }

    if (y > 0.83 && y < 0.848) {
      span(0.095, 0.165, P.lapel);
      span(-0.165, -0.095, P.lapel);
    }
    if (Math.abs(y - 0.848) < 0.002 || Math.abs(y - 1.175) < 0.0015) {
      span(0.095, 0.165, P.outline);
      span(-0.165, -0.095, P.outline);
    }
    if (y < 0.752) span(-radius, radius, P.outline);
    if (y < 1.33) {
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
  context.fillStyle = P.outline;
  for (const y of [1.0, 0.935]) {
    const row = rowOf(y);
    const radius = rowRadius[row];
    const x = -shirtHalf(y, radius) - 0.02;
    const u = (0.5 + Math.asin(x / radius) / (Math.PI * 2)) * size;
    context.beginPath();
    context.ellipse(
      u,
      row,
      (BUTTON_RADIUS / (Math.PI * 2 * radius)) * size,
      BUTTON_RADIUS / metersPerRow,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  return toTexture(canvas);
}

export function trouserTexture() {
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
