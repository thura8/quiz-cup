import * as THREE from "three";

function createTileableNoise(seed: number) {
  const hash = (x: number, y: number, period: number) => {
    x = ((x % period) + period) % period;
    y = ((y % period) + period) % period;
    let n = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const ease = (t: number) => t * t * (3 - 2 * t);

  function value(x: number, y: number, period: number) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = ease(x - xi);
    const yf = ease(y - yi);
    const a = hash(xi, yi, period);
    const b = hash(xi + 1, yi, period);
    const c = hash(xi, yi + 1, period);
    const d = hash(xi + 1, yi + 1, period);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }

  function fbm(u: number, v: number, period: number, octaves: number) {
    let amplitude = 0.5;
    let sum = 0;
    let total = 0;
    let frequency = period;
    for (let i = 0; i < octaves; i++) {
      sum += amplitude * value(u * frequency, v * frequency, frequency);
      total += amplitude;
      frequency *= 2;
      amplitude *= 0.5;
    }
    return sum / total;
  }

  return { value, fbm };
}

function fieldToCanvas(size: number, pixelAt: (index: number) => [number, number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(size, size);
  const data = image.data;
  for (let i = 0; i < size * size; i++) {
    const [red, green, blue] = pixelAt(i);
    data[i * 4] = red;
    data[i * 4 + 1] = green;
    data[i * 4 + 2] = blue;
    data[i * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function heightFieldToNormalCanvas(heights: Float32Array, size: number, strength: number) {
  return fieldToCanvas(size, (i) => {
    const x = i % size;
    const y = (i / size) | 0;
    const left = heights[y * size + ((x - 1 + size) % size)];
    const right = heights[y * size + ((x + 1) % size)];
    const up = heights[((y - 1 + size) % size) * size + x];
    const down = heights[((y + 1) % size) * size + x];
    let nx = (left - right) * strength;
    let ny = (down - up) * strength;
    let nz = 1;
    const length = Math.hypot(nx, ny, nz);
    nx /= length;
    ny /= length;
    nz /= length;
    return [(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255];
  });
}

function toRepeatingTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function grayscale(size: number, field: Float32Array) {
  return fieldToCanvas(size, (i) => {
    const v = Math.max(0, Math.min(1, field[i])) * 255;
    return [v, v, v];
  });
}

export type SurfaceMaps = { normal: THREE.CanvasTexture; roughness: THREE.CanvasTexture };

const cache = new Map<string, SurfaceMaps>();

function cached(key: string, make: () => SurfaceMaps) {
  let maps = cache.get(key);
  if (!maps) {
    maps = make();
    cache.set(key, maps);
  }
  return maps;
}

export function wetFloorMaps(size = 512, seed = 11): SurfaceMaps {
  return cached(`wet:${size}:${seed}`, () => {
    const noise = createTileableNoise(seed);
    const fine = createTileableNoise(seed + 7);
    const heights = new Float32Array(size * size);
    const rough = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const patches = noise.fbm(u, v, 3, 5);
        const i = y * size + x;
        const wet = Math.min(1, Math.max(0, (patches - 0.45) / 0.18));
        rough[i] = 0.95 - wet * 0.65 + (fine.fbm(u, v, 16, 3) - 0.5) * 0.12;
        heights[i] = fine.fbm(u, v, 24, 4) * 0.6 + patches * 0.4;
      }
    }
    return {
      normal: toRepeatingTexture(heightFieldToNormalCanvas(heights, size, 1.4)),
      roughness: toRepeatingTexture(grayscale(size, rough)),
    };
  });
}

export function mattePaintMaps(size = 256, seed = 5): SurfaceMaps {
  return cached(`matte:${size}:${seed}`, () => {
    const noise = createTileableNoise(seed);
    const heights = new Float32Array(size * size);
    const rough = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const i = y * size + x;
        heights[i] = noise.fbm(u, v, 32, 3);
        rough[i] = 0.88 + (noise.fbm(u, v, 6, 3) - 0.5) * 0.25;
      }
    }
    return {
      normal: toRepeatingTexture(heightFieldToNormalCanvas(heights, size, 2.2)),
      roughness: toRepeatingTexture(grayscale(size, rough)),
    };
  });
}

export function withMattePaint<T extends THREE.MeshStandardMaterial>(material: T, repeat = 3, normalScale = 0.35): T {
  const { normal, roughness } = mattePaintMaps();
  const n = normal.clone();
  const r = roughness.clone();
  n.repeat.set(repeat, repeat);
  r.repeat.set(repeat, repeat);
  n.needsUpdate = r.needsUpdate = true;
  material.normalMap = n;
  material.normalScale.set(normalScale, normalScale);
  material.roughnessMap = r;
  return material;
}
