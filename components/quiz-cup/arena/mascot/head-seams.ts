/**
 * Softens the hard rectangular edges the front/side texture projections leave
 * at the temples and along the sides of the beard. Everything is blurred
 * inside two feathered bands per side, so hair fades into skin instead of
 * stopping on a straight line. Only runs on the 1024px head bake.
 */
const SIZE = 1024;
const CENTER = 511.5;

interface Zone {
  rows: [number, number];
  /** distance from the face centre line, in pixels */
  reach: [number, number];
  radius: number;
}

const ZONES: Zone[] = [
  { rows: [140, 330], reach: [120, 275], radius: 13 },
  { rows: [585, 725], reach: [130, 270], radius: 8 },
];
const FEATHER = 14;
const PASSES = 3;

function blur(src: Float32Array, w: number, h: number, radius: number) {
  const a = Float32Array.from(src);
  const b = new Float32Array(a.length);
  for (let pass = 0; pass < PASSES; pass++) {
    for (let y = 0; y < h; y++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let x = -radius; x <= radius; x++) sum += a[(y * w + Math.min(w - 1, Math.max(0, x))) * 4 + c];
        for (let x = 0; x < w; x++) {
          b[(y * w + x) * 4 + c] = sum / (2 * radius + 1);
          sum += a[(y * w + Math.min(w - 1, x + radius + 1)) * 4 + c] - a[(y * w + Math.max(0, x - radius)) * 4 + c];
        }
      }
    }
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let y = -radius; y <= radius; y++) sum += b[(Math.min(h - 1, Math.max(0, y)) * w + x) * 4 + c];
        for (let y = 0; y < h; y++) {
          a[(y * w + x) * 4 + c] = sum / (2 * radius + 1);
          sum += b[(Math.min(h - 1, y + radius + 1) * w + x) * 4 + c] - b[(Math.max(0, y - radius) * w + x) * 4 + c];
        }
      }
    }
  }
  return a;
}

const ramp = (v: number, from: number, to: number) => Math.min(1, Math.max(0, (v - from) / (to - from)));

/**
 * The side projection leaves a strip of bare skin in the hair just above each
 * temple. Paint it with the hair from beside it (row by row) so the fade
 * reaches the hairline unbroken.
 */
const GAP = { rows: [150, 285] as const, from: 288, to: 346, sample: [262, 280] as const, feather: 10 };
function fillTempleGaps(data: Uint8ClampedArray) {
  for (const sign of [-1, 1]) {
    const px = (x: number) => Math.round(sign < 0 ? x : 2 * CENTER - x);
    for (let y = GAP.rows[0]; y < GAP.rows[1]; y++) {
      const hair = [0, 0, 0];
      for (let x = GAP.sample[0]; x <= GAP.sample[1]; x++)
        for (let c = 0; c < 3; c++) hair[c] += data[(y * SIZE + px(x)) * 4 + c] / (GAP.sample[1] - GAP.sample[0] + 1);
      const vertical = Math.min(ramp(y - GAP.rows[0], 0, GAP.feather), ramp(GAP.rows[1] - y, 0, 45));
      for (let x = GAP.from - GAP.feather; x < GAP.to + GAP.feather; x++) {
        const k = Math.min(vertical, ramp(x - GAP.from, -GAP.feather, 0) , ramp(GAP.to - x, -GAP.feather, 0));
        if (k <= 0) continue;
        const i = (y * SIZE + px(x)) * 4;
        for (let c = 0; c < 3; c++) data[i + c] += (hair[c] - data[i + c]) * k;
      }
    }
  }
}

export function softenSeams(canvas: HTMLCanvasElement) {
  if (canvas.width !== SIZE || canvas.height !== SIZE) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  fillTempleGaps(image.data);
  const source = Float32Array.from(image.data);
  for (const zone of ZONES) {
    const blurred = blur(source, SIZE, SIZE, zone.radius);
    for (let y = zone.rows[0]; y < zone.rows[1]; y++) {
      const vertical = Math.min(ramp(y - zone.rows[0], 0, FEATHER), ramp(zone.rows[1] - y, 0, FEATHER));
      for (let x = 0; x < SIZE; x++) {
        const reach = Math.abs(x - CENTER);
        const side = Math.min(ramp(reach, zone.reach[0], zone.reach[0] + FEATHER), ramp(zone.reach[1] - reach, 0, FEATHER));
        const k = Math.min(vertical, side);
        if (k <= 0) continue;
        const i = (y * SIZE + x) * 4;
        for (let c = 0; c < 3; c++) image.data[i + c] = source[i + c] + (blurred[i + c] - source[i + c]) * k;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}
