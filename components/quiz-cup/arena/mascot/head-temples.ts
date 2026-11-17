// The traced head texture paints each temple twice: a soft, blurry hair shadow projected from the front
// view, and the real hard-edged sideburn projected from the side view. Together they read like a mask.
// This pass clears the soft strip with skin and grows the real sideburn forward to a clean, tapered point.
//
// Coordinates are canvas pixels of the 1024px head texture (row 0 is the crown, the face is centred on
// x = 511.5) and were tuned against public/concept/host-turnaround.jpeg. Re-tune them if the art changes.

const REFERENCE_SIZE = 1024;
const MARGIN = 24;

const LEFT = 1;
const RIGHT = -1;
type Side = typeof LEFT | typeof RIGHT;

const HAIR_ROWS: [number, number] = [230, 578];
const SKIN_ROWS: [number, number] = [244, 566];
const OUTER_SCAN: Record<Side, [number, number]> = { [LEFT]: [256, 430], [RIGHT]: [766, 590] };
const MIN_SKIN_LUMA = 150;
const MIN_SKIN_WARMTH = 45;
const OUTER_EDGE_LUMA = 140;
const OUTER_EDGE_SMOOTHING = 15;

// Inner edge of the new sideburn on the left side (mirrored for the right), as [row, x].
const HAIR_EDGE: [number, number][] = [
  [230, 398],
  [300, 394],
  [360, 388],
  [400, 371],
  [440, 369],
  [470, 358],
  [500, 351],
  [535, 345],
  [578, 338],
];
const HAIR_EDGE_SMOOTHING = 17;
const TAPER_END_ROW = 572;
const TAPER_SLOPE = 0.85;
const SOURCE_OFFSET = 10;
const HAIR_FALLBACK: Rgb = [28, 27, 32];
const HAIR_RIM: Rgb = [24, 22, 27];
const MAX_SOURCE_LUMA = 110;
const MASK_EDGE: [number, number] = [0.35, 0.65];
const RIM_REACH: [number, number] = [4, 4];

const SKIN_SCALES = [30, 16, 8, 4];
const SKIN_COVERAGE = 0.25;
const SKIN_ERODE = 2;

type Rgb = [number, number, number];

const stripEnd = (side: Side, row: number) =>
  side === LEFT ? (row < 382 ? 394 : row < 470 ? 372 : 378) : row < 386 ? 624 : row < 470 ? 643 : 646;

function interpolate(points: [number, number][], at: number) {
  const next = points.findIndex(([row]) => row >= at);
  if (next <= 0) return points[next === 0 ? 0 : points.length - 1][1];
  const [r0, v0] = points[next - 1];
  const [r1, v1] = points[next];
  return v0 + ((v1 - v0) * (at - r0)) / (r1 - r0);
}

function movingAverage(values: number[], window: number) {
  const half = window >> 1;
  return values.map((_, i) => {
    let sum = 0;
    for (let k = -half; k <= half; k++) sum += values[Math.min(values.length - 1, Math.max(0, i + k))];
    return sum / window;
  });
}

function movingMedian(values: number[], window: number) {
  const half = window >> 1;
  return values.map((_, i) => {
    const near: number[] = [];
    for (let k = -half; k <= half; k++) near.push(values[Math.min(values.length - 1, Math.max(0, i + k))]);
    return near.sort((a, b) => a - b)[half];
  });
}

function boxBlur(source: Float32Array, width: number, height: number, radius: number) {
  let from = Float32Array.from(source);
  let to = new Float32Array(source.length);
  const run = (horizontal: boolean) => {
    const lines = horizontal ? height : width;
    const length = horizontal ? width : height;
    const step = horizontal ? 1 : width;
    for (let line = 0; line < lines; line++) {
      const start = horizontal ? line * width : line;
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += from[start + Math.min(length - 1, Math.max(0, k)) * step];
      for (let i = 0; i < length; i++) {
        to[start + i * step] = sum / (2 * radius + 1);
        sum += from[start + Math.min(length - 1, i + radius + 1) * step];
        sum -= from[start + Math.max(0, i - radius) * step];
      }
    }
    [from, to] = [to, from];
  };
  for (let pass = 0; pass < 3; pass++) {
    run(true);
    run(false);
  }
  return from;
}

type Layer = { x0: number; y0: number; width: number; height: number; rgb: Float32Array };

function cropLayer(data: Uint8ClampedArray, size: number, x0: number, y0: number, width: number, height: number) {
  const rgb = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = ((y0 + y) * size + x0 + x) * 4;
      const to = (y * width + x) * 3;
      rgb[to] = data[from];
      rgb[to + 1] = data[from + 1];
      rgb[to + 2] = data[from + 2];
    }
  }
  return { x0, y0, width, height, rgb } satisfies Layer;
}

const luma = (layer: Layer, x: number, y: number) => {
  const i = ((y - layer.y0) * layer.width + (x - layer.x0)) * 3;
  return (layer.rgb[i] + layer.rgb[i + 1] + layer.rgb[i + 2]) / 3;
};

function outerEdges(layer: Layer, side: Side) {
  const [from, to] = OUTER_SCAN[side];
  const rows: number[] = [];
  for (let y = HAIR_ROWS[0]; y < HAIR_ROWS[1]; y++) {
    let edge = to;
    for (let x = from; side === LEFT ? x < to : x > to; x += side) {
      if (luma(layer, x, y) > OUTER_EDGE_LUMA) {
        edge = x;
        break;
      }
    }
    rows.push(edge);
  }
  return movingMedian(rows, OUTER_EDGE_SMOOTHING);
}

function skinField(layer: Layer, skinless: Uint8Array) {
  const { width, height, rgb } = layer;
  const count = width * height;
  let skin = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = rgb[i * 3];
    const b = rgb[i * 3 + 2];
    const bright = (r + rgb[i * 3 + 1] + b) / 3 > MIN_SKIN_LUMA;
    skin[i] = bright && r - b > MIN_SKIN_WARMTH && !skinless[i] ? 1 : 0;
  }
  const eroded = new Float32Array(count);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let keep = 1;
      for (let dy = -SKIN_ERODE; dy <= SKIN_ERODE && keep; dy++) {
        for (let dx = -SKIN_ERODE; dx <= SKIN_ERODE; dx++) {
          const sx = Math.min(width - 1, Math.max(0, x + dx));
          const sy = Math.min(height - 1, Math.max(0, y + dy));
          if (!skin[sy * width + sx]) {
            keep = 0;
            break;
          }
        }
      }
      eroded[y * width + x] = keep;
    }
  }
  skin = eroded;

  const field = new Float32Array(count * 3);
  SKIN_SCALES.forEach((scale, index) => {
    const coverage = boxBlur(skin, width, height, scale);
    for (let channel = 0; channel < 3; channel++) {
      const weighted = new Float32Array(count);
      for (let i = 0; i < count; i++) weighted[i] = rgb[i * 3 + channel] * skin[i];
      const blurred = boxBlur(weighted, width, height, scale);
      for (let i = 0; i < count; i++) {
        const value = blurred[i] / Math.max(coverage[i], 1e-6);
        const mix = index === 0 ? 1 : Math.min(1, coverage[i] / SKIN_COVERAGE);
        field[i * 3 + channel] = index === 0 ? value : field[i * 3 + channel] * (1 - mix) + value * mix;
      }
    }
  });
  return field;
}

export function reshapeTemples(canvas: HTMLCanvasElement) {
  const size = canvas.width;
  const context = canvas.getContext("2d");
  if (!context || size !== REFERENCE_SIZE || canvas.height !== size) return;

  const x0 = OUTER_SCAN[LEFT][0] - MARGIN;
  const x1 = OUTER_SCAN[RIGHT][0] + MARGIN;
  const y0 = HAIR_ROWS[0] - MARGIN;
  const y1 = HAIR_ROWS[1] + MARGIN;
  const image = context.getImageData(0, 0, size, size);
  const original = cropLayer(image.data, size, x0, y0, x1 - x0, y1 - y0);
  const { width, height } = original;
  const at = (x: number, y: number) => (y - y0) * width + (x - x0);

  const outer = { [LEFT]: outerEdges(original, LEFT), [RIGHT]: outerEdges(original, RIGHT) };

  // 1. Replace the soft front-projected strip with skin sampled from the clean face around it.
  const strip = new Uint8Array(width * height);
  for (const side of [LEFT, RIGHT] as const) {
    for (let y = SKIN_ROWS[0]; y < SKIN_ROWS[1]; y++) {
      const edge = outer[side][y - HAIR_ROWS[0]];
      const end = stripEnd(side, y);
      const [from, to] = side === LEFT ? [edge, end] : [end, edge + 1];
      for (let x = from; x < to; x++) strip[at(x, y)] = 1;
    }
  }
  const field = skinField(original, strip);
  const skinned = Float32Array.from(original.rgb);
  const softStrip = Float32Array.from(strip);
  const softness = boxBlur(softStrip, width, height, 1);
  for (let i = 0; i < width * height; i++) {
    const dark = (original.rgb[i * 3] + original.rgb[i * 3 + 1] + original.rgb[i * 3 + 2]) / 3 < 70;
    const alpha = dark && !strip[i] ? 0 : Math.max(softness[i], strip[i]);
    for (let c = 0; c < 3; c++) skinned[i * 3 + c] = original.rgb[i * 3 + c] * (1 - alpha) + field[i * 3 + c] * alpha;
  }

  // 2. Grow the real sideburn forward, copying hair from behind it so the brush strokes carry on.
  const edges = movingAverage(
    Array.from({ length: HAIR_ROWS[1] - HAIR_ROWS[0] }, (_, i) => interpolate(HAIR_EDGE, HAIR_ROWS[0] + i)),
    HAIR_EDGE_SMOOTHING,
  );
  const hair = new Float32Array(skinned);
  const mask = new Float32Array(width * height);
  const inner = new Uint8Array(width * height);
  for (const side of [LEFT, RIGHT] as const) {
    for (let y = HAIR_ROWS[0]; y < HAIR_ROWS[1]; y++) {
      const row = y - HAIR_ROWS[0];
      const edge = outer[side][row];
      const taper = Math.max(0, TAPER_END_ROW - y) * TAPER_SLOPE;
      const front = side === LEFT ? edges[row] : size - 1 - edges[row];
      const reach = side === LEFT ? Math.min(front, edge + taper) : Math.max(front, edge - taper);
      const [from, to] = (side === LEFT ? [edge, reach] : [reach, edge]).map(Math.round);
      if (to - from < 2) continue;
      const offset = to - from + SOURCE_OFFSET;
      for (let x = from; x <= to; x++) {
        const sx = Math.min(x1 - 1, Math.max(x0, side === LEFT ? x - offset : x + offset));
        const s = at(sx, y) * 3;
        const dim = (original.rgb[s] + original.rgb[s + 1] + original.rgb[s + 2]) / 3 <= MAX_SOURCE_LUMA;
        for (let c = 0; c < 3; c++) hair[at(x, y) * 3 + c] = dim ? original.rgb[s + c] : HAIR_FALLBACK[c];
        mask[at(x, y)] = 1;
      }
      const rim = Math.round(reach);
      for (let x = rim - RIM_REACH[0]; x < rim + RIM_REACH[1]; x++) inner[at(x, y)] = 1;
    }
  }
  const softMask = boxBlur(mask, width, height, 1);
  const [low, span] = [MASK_EDGE[0], MASK_EDGE[1] - MASK_EDGE[0]];
  const solid = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) solid[i] = mask[i] && (!mask[i - 1] || !mask[i + 1] || !mask[i - width] || !mask[i + width]) ? 1 : 0;
  for (let i = 0; i < width * height; i++) {
    const alpha = Math.min(1, Math.max(0, (softMask[i] - low) / span));
    for (let c = 0; c < 3; c++) {
      let value = skinned[i * 3 + c] * (1 - alpha) + hair[i * 3 + c] * alpha;
      if (solid[i] && inner[i]) value = Math.min(value, HAIR_RIM[c]);
      image.data[((y0 + Math.floor(i / width)) * size + x0 + (i % width)) * 4 + c] = value;
    }
  }
  context.putImageData(image, 0, 0);
}
