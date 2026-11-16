import { CAST_STATES, type CastState, type Frame, SHEET_COLUMNS, SHEET_ROWS, isTopRow } from "./cast-states";

const WHITE_THRESHOLD = 240;
const ENCLOSED_GAP_MIN_PIXELS = 400;
const EDGE_BAND_RADIUS = 2;
const EDGE_ALPHA_SOFTNESS = 70;
const EDGE_ALPHA_MIN = 0.05;
const OPAQUE_ALPHA = 128;
const FEET_SAMPLE_FRACTION = 0.06;
const CROP_SIDE_PADDING = 4;
const CROP_TOP_PADDING = 4;
const CROP_BOTTOM_PADDING = 2;

type Box = { left: number; right: number; top: number; bottom: number };

export function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

export function keyWhiteBackground(image: HTMLImageElement) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, width, height);
  const rgba = imageData.data;

  const white = findWhitePixels(rgba, width * height);
  const background = findBackground(white, width, height);
  const edge = findEdgeBand(background, width, height);
  applyAlpha(rgba, background, edge);

  context.putImageData(imageData, 0, 0);
  return { canvas, frames: measureFrames(rgba, width, height) };
}

function findWhitePixels(rgba: Uint8ClampedArray, pixelCount: number) {
  const white = new Uint8Array(pixelCount);
  for (let p = 0; p < pixelCount; p++) {
    const i = p * 4;
    white[p] =
      rgba[i] > WHITE_THRESHOLD && rgba[i + 1] > WHITE_THRESHOLD && rgba[i + 2] > WHITE_THRESHOLD ? 1 : 0;
  }
  return white;
}

function findBackground(white: Uint8Array, width: number, height: number) {
  const pixelCount = width * height;
  const background = new Uint8Array(pixelCount);
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);

  for (let seed = 0; seed < pixelCount; seed++) {
    if (!white[seed] || visited[seed]) continue;
    let head = 0;
    let tail = 0;
    let touchesBorder = false;
    queue[tail++] = seed;
    visited[seed] = 1;

    const enqueue = (p: number) => {
      if (!white[p] || visited[p]) return;
      visited[p] = 1;
      queue[tail++] = p;
    };

    while (head < tail) {
      const p = queue[head++];
      const x = p % width;
      const y = (p / width) | 0;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
      if (x > 0) enqueue(p - 1);
      if (x < width - 1) enqueue(p + 1);
      if (y > 0) enqueue(p - width);
      if (y < height - 1) enqueue(p + width);
    }

    const regionSize = tail;
    if (touchesBorder || regionSize > ENCLOSED_GAP_MIN_PIXELS) {
      for (let k = 0; k < regionSize; k++) background[queue[k]] = 1;
    }
  }
  return background;
}

function isNearBackground(background: Uint8Array, width: number, height: number, x: number, y: number) {
  for (let dy = -EDGE_BAND_RADIUS; dy <= EDGE_BAND_RADIUS; dy++) {
    for (let dx = -EDGE_BAND_RADIUS; dx <= EDGE_BAND_RADIUS; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && background[ny * width + nx]) return true;
    }
  }
  return false;
}

function findEdgeBand(background: Uint8Array, width: number, height: number) {
  const edge = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!background[p] && isNearBackground(background, width, height, x, y)) edge[p] = 1;
    }
  }
  return edge;
}

function applyAlpha(rgba: Uint8ClampedArray, background: Uint8Array, edge: Uint8Array) {
  for (let p = 0; p < background.length; p++) {
    const i = p * 4;
    if (background[p]) {
      rgba[i + 3] = 0;
      continue;
    }
    if (edge[p]) unmixWhite(rgba, i);
  }
}

function unmixWhite(rgba: Uint8ClampedArray, i: number) {
  const darkestChannel = Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
  const alpha = Math.min(1, Math.max(EDGE_ALPHA_MIN, (255 - darkestChannel) / EDGE_ALPHA_SOFTNESS));
  for (let channel = 0; channel < 3; channel++) {
    const value = (rgba[i + channel] - (1 - alpha) * 255) / alpha;
    rgba[i + channel] = Math.max(0, Math.min(255, value));
  }
  rgba[i + 3] = Math.round(alpha * 255);
}

function isOpaque(rgba: Uint8ClampedArray, width: number, x: number, y: number) {
  return rgba[(y * width + x) * 4 + 3] >= OPAQUE_ALPHA;
}

function measureFigureBox(
  rgba: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Box {
  let minX = x1;
  let maxX = x0;
  let minY = y1;
  let maxY = y0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!isOpaque(rgba, width, x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { left: minX, right: maxX, top: minY, bottom: maxY };
}

function measureFeetCenterX(rgba: Uint8ClampedArray, width: number, figure: Box) {
  let sum = 0;
  let count = 0;
  const firstRow = Math.round(figure.bottom - (figure.bottom - figure.top) * FEET_SAMPLE_FRACTION);
  for (let y = firstRow; y <= figure.bottom; y++) {
    for (let x = figure.left; x <= figure.right; x++) {
      if (isOpaque(rgba, width, x, y)) {
        sum += x;
        count++;
      }
    }
  }
  return count ? sum / count : (figure.left + figure.right) / 2;
}

function measureCropBox(rgba: Uint8ClampedArray, width: number, height: number, column: number, row: number): Box {
  const cellWidth = width / SHEET_COLUMNS;
  const cellHeight = height / SHEET_ROWS;
  const x0 = Math.round(column * cellWidth);
  const y0 = Math.round(row * cellHeight);
  const x1 = Math.round(x0 + cellWidth);
  const y1 = Math.round(y0 + cellHeight);

  const figure = measureFigureBox(rgba, width, x0, y0, x1, y1);
  const feetX = measureFeetCenterX(rgba, width, figure);
  const halfWidth = Math.max(feetX - figure.left, figure.right - feetX) + CROP_SIDE_PADDING;
  return {
    left: feetX - halfWidth,
    right: feetX + halfWidth,
    top: figure.top - CROP_TOP_PADDING,
    bottom: figure.bottom + CROP_BOTTOM_PADDING,
  };
}

function measureFrames(rgba: Uint8ClampedArray, width: number, height: number) {
  const boxes = CAST_STATES.map((state) => {
    const column = Math.round(state.cellOffset[0] * SHEET_COLUMNS);
    const row = isTopRow(state.cellOffset) ? 0 : 1;
    return measureCropBox(rgba, width, height, column, row);
  });

  const idleHeight = boxes[0].bottom - boxes[0].top;
  return Object.fromEntries(
    CAST_STATES.map((state, index) => {
      const box = boxes[index];
      const boxWidth = box.right - box.left;
      const boxHeight = box.bottom - box.top;
      const frame: Frame = {
        offset: [box.left / width, 1 - box.bottom / height],
        repeat: [boxWidth / width, boxHeight / height],
        height: boxHeight / idleHeight,
        aspect: boxWidth / boxHeight,
      };
      return [state.id, frame];
    }),
  ) as Record<CastState, Frame>;
}
