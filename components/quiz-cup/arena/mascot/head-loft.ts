import * as THREE from "three";

import type { CharacterSpec, MascotPalette } from "./mascot-spec";

export type HeadRow = { y: number; halfWidth: number; front: number; back: number; backHalfWidth?: number };

export type HeadProfile = {
  rows: HeadRow[];
  centerX: number;
  nose: { y: number; base: number; tip: number } | null;
  ear: { y: number; halfWidth: number; z: number };
  chinY: number;
};

export type Rgb = [number, number, number];
export type Painter = (point: THREE.Vector3, normal: THREE.Vector3) => Rgb | null;

const BACK_EXPONENT = 2.4;
const FACE_EXPONENT = 1.5;
const FACE_TOP_BELOW_CROWN = 0.1;
const FACE_TO_HAIR_BLEND = 0.04;
const SEGMENTS_AROUND = 96;
const NORMAL_STEP = 1e-3;
const FALLBACK_ROWS = 48;

const superellipse = (s: number, exponent: number) => Math.sign(s) * Math.abs(s) ** (2 / exponent);

export class HeadLoft {
  readonly rings: HeadRow[];
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly c = new THREE.Vector3();
  private readonly d = new THREE.Vector3();

  constructor(readonly profile: HeadProfile) {
    const collapse = (row: HeadRow): HeadRow => {
      const middle = (row.front + row.back) / 2;
      return { y: row.y, halfWidth: 0, front: middle, back: middle };
    };
    const { rows } = profile;
    this.rings = [collapse(rows[0]), ...rows, collapse(rows[rows.length - 1])];
  }

  point(u: number, v: number, target: THREE.Vector3) {
    const last = this.rings.length - 1;
    const f = THREE.MathUtils.clamp(v, 0, 1) * last;
    const i = Math.min(Math.floor(f), last - 1);
    const t = f - i;
    const r0 = this.rings[i];
    const r1 = this.rings[i + 1];
    const lerp = (a: number, b: number) => a + (b - a) * t;
    const front = lerp(r0.front, r1.front);
    const back = lerp(r0.back, r1.back);
    const middle = (front + back) / 2;
    const theta = Math.PI * 2 * u + Math.PI;
    const cos = Math.cos(theta);
    const y = lerp(r0.y, r1.y);
    const exponent = cos >= 0 ? this.frontExponent(y) : BACK_EXPONENT;
    const halfWidth = lerp(r0.halfWidth, r1.halfWidth);
    const backHalfWidth = lerp(r0.backHalfWidth ?? r0.halfWidth, r1.backHalfWidth ?? r1.halfWidth);
    const width =
      cos >= 0 ? halfWidth : THREE.MathUtils.lerp(halfWidth, backHalfWidth, THREE.MathUtils.smoothstep(-cos, 0, 1));
    return target.set(
      this.profile.centerX + width * superellipse(Math.sin(theta), exponent),
      y,
      middle + (cos >= 0 ? front - middle : middle - back) * superellipse(cos, exponent),
    );
  }

  private frontExponent(y: number) {
    const faceTop = this.rings[this.rings.length - 1].y - FACE_TOP_BELOW_CROWN;
    const t = THREE.MathUtils.smoothstep(y, faceTop, faceTop + FACE_TO_HAIR_BLEND);
    return FACE_EXPONENT + (BACK_EXPONENT - FACE_EXPONENT) * t;
  }

  normal(u: number, v: number, target: THREE.Vector3) {
    const dv = 0.5 / (this.rings.length - 1);
    const alongU = this.point(u + NORMAL_STEP, v, this.a).sub(this.point(u - NORMAL_STEP, v, this.b));
    const alongV = this.point(u, v + dv, this.c).sub(this.point(u, v - dv, this.d));
    target.crossVectors(alongU, alongV);
    if (target.lengthSq() < 1e-14) return target.set(0, v < 0.5 ? -1 : 1, 0);
    target.normalize();
    const p = this.point(u, v, this.a);
    const middle = this.point(0.5, v, this.b)
      .add(this.point(0, v, this.c))
      .multiplyScalar(0.5);
    if (target.dot(p.sub(middle)) < 0) target.negate();
    return target;
  }

  geometry() {
    const rings = this.rings.length;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let j = 0; j < rings; j++) {
      const v = j / (rings - 1);
      for (let i = 0; i <= SEGMENTS_AROUND; i++) {
        const u = i / SEGMENTS_AROUND;
        positions.push(...this.point(u, v, p).toArray());
        normals.push(...this.normal(u, v, n).toArray());
        uvs.push(u, v);
      }
    }
    const stride = SEGMENTS_AROUND + 1;
    for (let j = 0; j < rings - 1; j++) {
      for (let i = 0; i < SEGMENTS_AROUND; i++) {
        const a = j * stride + i;
        const b = a + 1;
        const up = a + stride;
        indices.push(a, b, up, b + stride, up, b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
  }
}

export function defaultHeadProfile(head: CharacterSpec["head"]): HeadProfile {
  const [cx, cy, cz] = head.center;
  const [rx, ry, rz] = head.radii;
  const rows = Array.from({ length: FALLBACK_ROWS }, (_, i) => {
    const s = -0.98 + (1.96 * i) / (FALLBACK_ROWS - 1);
    const k = Math.sqrt(1 - s * s);
    return { y: cy + s * ry, halfWidth: rx * k, front: cz + rz * k, back: cz - rz * k };
  });
  return {
    rows,
    centerX: cx,
    nose: { y: cy - 0.05, base: cz + rz - 0.01, tip: cz + rz + 0.012 },
    ear: { y: cy - 0.012, halfWidth: rx, z: cz - 0.005 },
    chinY: cy - ry * 0.9,
  };
}

const toRgb = (hex: string): Rgb => {
  const color = new THREE.Color(hex);
  return [color.r * 255, color.g * 255, color.b * 255];
};

export function fallbackPaint(profile: HeadProfile, palette: MascotPalette): Painter {
  const top = profile.rows[profile.rows.length - 1].y;
  const hair = toRgb(palette.hair);
  const skin = toRgb(palette.skin);
  return (point) => {
    const hairline = top - 0.07 + Math.max(0, -point.z) * 1.2;
    return point.y > hairline ? hair : skin;
  };
}

export function bakeHeadTexture(loft: HeadLoft, paint: Painter, fallback: Painter, size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(size, size);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let row = 0; row < size; row++) {
    const v = 1 - (row + 0.5) / size;
    for (let column = 0; column < size; column++) {
      const u = (column + 0.5) / size;
      loft.point(u, v, p);
      loft.normal(u, v, n);
      const [r, g, b] = paint(p, n) ?? fallback(p, n)!;
      const i = (row * size + column) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function paintVertexColors(geometry: THREE.BufferGeometry, paint: Painter, fallback: Painter) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const colors = new Float32Array(position.count * 3);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    n.fromBufferAttribute(normal, i);
    const [r, g, b] = paint(p, n) ?? fallback(p, n)!;
    color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}
