import * as THREE from "three";

import type { HeadRow } from "./head-loft";

const SEGMENTS_ACROSS = 48;
const NORMAL_STEP = 1e-3;
const TIP_ROUNDING = 0.25;
const TOP_TUCK = 0.06;
const TOP_TUCK_FROM = 0.7;

export class HairDrape {
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly c = new THREE.Vector3();
  private readonly d = new THREE.Vector3();

  constructor(
    readonly rows: HeadRow[],
    readonly centerX: number,
  ) {}

  point(u: number, v: number, target: THREE.Vector3) {
    const last = this.rows.length - 1;
    const f = THREE.MathUtils.clamp(v, 0, 1) * last;
    const i = Math.min(Math.floor(f), last - 1);
    const t = f - i;
    const r0 = this.rows[i];
    const r1 = this.rows[i + 1];
    const lerp = (a: number, b: number) => a + (b - a) * t;
    const angle = (THREE.MathUtils.clamp(u, 0, 1) * 2 - 1) * (Math.PI / 2);
    const tip = 1 - TIP_ROUNDING * (1 - THREE.MathUtils.smoothstep(v, 0, 0.12));
    const tuck = 1 - TOP_TUCK * THREE.MathUtils.smoothstep(v, TOP_TUCK_FROM, 1);
    const halfWidth = lerp(r0.halfWidth, r1.halfWidth) * tip * tuck;
    const front = lerp(r0.front, r1.front);
    const middle = (lerp(r0.front, r1.front) + lerp(r0.back, r1.back)) / 2;
    const back = middle + (lerp(r0.back, r1.back) - middle) * tuck;
    return target.set(
      this.centerX + halfWidth * Math.sin(angle),
      lerp(r0.y, r1.y),
      front + (back - front) * Math.cos(angle),
    );
  }

  normal(u: number, v: number, target: THREE.Vector3) {
    const dv = 0.5 / (this.rows.length - 1);
    const alongU = this.point(u + NORMAL_STEP, v, this.a).sub(this.point(u - NORMAL_STEP, v, this.b));
    const alongV = this.point(u, v + dv, this.c).sub(this.point(u, v - dv, this.d));
    target.crossVectors(alongU, alongV);
    if (target.lengthSq() < 1e-14) return target.set(0, 0, -1);
    target.normalize();
    const p = this.point(u, v, this.a);
    const row = this.rows[Math.round(THREE.MathUtils.clamp(v, 0, 1) * (this.rows.length - 1))];
    const inside = this.b.set(this.centerX, p.y, (row.front + row.back) / 2);
    if (target.dot(p.sub(inside)) < 0) target.negate();
    return target;
  }

  geometry() {
    const rows = this.rows.length;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      for (let i = 0; i <= SEGMENTS_ACROSS; i++) {
        const u = i / SEGMENTS_ACROSS;
        positions.push(...this.point(u, v, p).toArray());
        normals.push(...this.normal(u, v, n).toArray());
        uvs.push(u, v);
      }
    }
    const stride = SEGMENTS_ACROSS + 1;
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < SEGMENTS_ACROSS; i++) {
        const a = j * stride + i;
        indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
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
