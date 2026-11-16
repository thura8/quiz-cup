import * as THREE from "three";

import { PLAYER_PLATFORM, STUDIO_CENTER, polar } from "@/constants/quiz-cup-arena";

export const DEG = Math.PI / 180;

export type Profile = [number, number][];

export function slab(shape: THREE.Shape, height: number, y0 = 0, bevel = 0.04) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 48,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y0 + bevel, 0);
  return geometry;
}

export function outlineTube(points: THREE.Vector2[], y: number, radius: number) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(point.x, y, -point.y)),
    true,
    "centripetal",
  );
  return new THREE.TubeGeometry(curve, Math.max(64, points.length * 2), radius, 6, true);
}

export const toShape = (points: THREE.Vector2[]) => new THREE.Shape(points);

const BAND_SAMPLES = 120;
const CAP_SEGMENTS = 14;

function extendPast(end: THREE.Vector3, previous: THREE.Vector3, distance: number) {
  return end.clone().add(end.clone().sub(previous).setLength(distance));
}

function semicircleCap(center: THREE.Vector3, side: THREE.Vector2, bulge: THREE.Vector2, radius: number) {
  const points: THREE.Vector2[] = [];
  for (let k = 1; k < CAP_SEGMENTS; k++) {
    const angle = (k / CAP_SEGMENTS) * Math.PI;
    const x = center.x + side.x * radius * Math.cos(angle) + bulge.x * radius * Math.sin(angle);
    const z = center.z + side.y * radius * Math.cos(angle) + bulge.y * radius * Math.sin(angle);
    points.push(new THREE.Vector2(x, -z));
  }
  return points;
}

export function pathBandPoints(path: [number, number][], inset = 0): THREE.Vector2[] {
  const { halfWidth, capExtra } = PLAYER_PLATFORM;
  const points = path.map(([x, z]) => new THREE.Vector3(x, 0, z));
  points.unshift(extendPast(points[0], points[1], capExtra));
  points.push(extendPast(points[points.length - 1], points[points.length - 2], capExtra));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const bandHalfWidth = halfWidth - inset;

  const leftEdge: THREE.Vector2[] = [];
  const rightEdge: THREE.Vector2[] = [];
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i <= BAND_SAMPLES; i++) {
    const t = i / BAND_SAMPLES;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    tangents.push(tangent);
    const normalX = -tangent.z;
    const normalZ = tangent.x;
    leftEdge.push(new THREE.Vector2(point.x + normalX * bandHalfWidth, -(point.z + normalZ * bandHalfWidth)));
    rightEdge.push(new THREE.Vector2(point.x - normalX * bandHalfWidth, -(point.z - normalZ * bandHalfWidth)));
  }

  const endTangent = tangents[BAND_SAMPLES];
  const startTangent = tangents[0];
  return [
    ...leftEdge,
    ...semicircleCap(
      curve.getPointAt(1),
      new THREE.Vector2(-endTangent.z, endTangent.x),
      new THREE.Vector2(endTangent.x, endTangent.z),
      bandHalfWidth,
    ),
    ...rightEdge.slice().reverse(),
    ...semicircleCap(
      curve.getPointAt(0),
      new THREE.Vector2(startTangent.z, -startTangent.x),
      new THREE.Vector2(-startTangent.x, -startTangent.z),
      bandHalfWidth,
    ),
  ];
}

function signedArea(profile: Profile) {
  let area = 0;
  for (let j = 0; j < profile.length; j++) {
    const [u0, v0] = profile[j];
    const [u1, v1] = profile[(j + 1) % profile.length];
    area += u0 * v1 - u1 * v0;
  }
  return area;
}

export function sweepArc(
  radius: number,
  fromDeg: number,
  toDeg: number,
  profile: Profile,
  segments = 120,
  { closed = true, caps = closed }: { closed?: boolean; caps?: boolean } = {},
) {
  const profileSize = profile.length;
  const positions: number[] = [];
  const pointAt = (deg: number, inward: number, height: number): [number, number, number] => {
    const angle = deg * DEG;
    return [
      STUDIO_CENTER.x + Math.cos(angle) * (radius - inward),
      height,
      STUDIO_CENTER.z + Math.sin(angle) * (radius - inward),
    ];
  };
  const pushProfileAt = (deg: number) => {
    for (const [inward, height] of profile) positions.push(...pointAt(deg, inward, height));
  };

  for (let i = 0; i <= segments; i++) pushProfileAt(fromDeg + ((toDeg - fromDeg) * i) / segments);

  const flipWinding = closed && signedArea(profile) > 0;
  const indices: number[] = [];
  const edgeCount = closed ? profileSize : profileSize - 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < edgeCount; j++) {
      const a = i * profileSize + j;
      const b = i * profileSize + ((j + 1) % profileSize);
      const c = (i + 1) * profileSize + j;
      const d = (i + 1) * profileSize + ((j + 1) % profileSize);
      if (flipWinding) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }

  if (closed && caps && profileSize >= 3) {
    const triangles = THREE.ShapeUtils.triangulateShape(
      profile.map(([u, v]) => new THREE.Vector2(u, v)),
      [],
    );
    const origin = new THREE.Vector3();
    const edgeA = new THREE.Vector3();
    const edgeB = new THREE.Vector3();
    for (const [deg, sign] of [
      [fromDeg, -1],
      [toDeg, 1],
    ] as const) {
      const angle = deg * DEG;
      const outward = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(sign);
      const base = positions.length / 3;
      pushProfileAt(deg);
      for (const [i0, i1, i2] of triangles) {
        origin.fromArray(positions, (base + i0) * 3);
        edgeA.fromArray(positions, (base + i1) * 3).sub(origin);
        edgeB.fromArray(positions, (base + i2) * 3).sub(origin);
        if (edgeA.cross(edgeB).dot(outward) >= 0) indices.push(base + i0, base + i1, base + i2);
        else indices.push(base + i0, base + i2, base + i1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function pillow(depth: number, y0: number, y1: number, inset = 0): Profile {
  const cornerRadius = Math.min(depth, (y1 - y0) / 2) * 0.9;
  const cornerX = inset + depth - cornerRadius;
  const profile: Profile = [[inset, y0]];
  for (let k = 0; k <= 6; k++) {
    const angle = -Math.PI / 2 + (k / 6) * (Math.PI / 2);
    profile.push([cornerX + Math.cos(angle) * cornerRadius, y0 + cornerRadius + Math.sin(angle) * cornerRadius]);
  }
  for (let k = 0; k <= 6; k++) {
    const angle = (k / 6) * (Math.PI / 2);
    profile.push([cornerX + Math.cos(angle) * cornerRadius, y1 - cornerRadius + Math.sin(angle) * cornerRadius]);
  }
  profile.push([inset, y1]);
  return profile;
}

export function arcTube(radius: number, fromDeg: number, toDeg: number, y: number, tubeRadius: number) {
  const samples = 96;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    const [x, , z] = polar(radius, fromDeg + ((toDeg - fromDeg) * i) / samples);
    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 200, tubeRadius, 6, false);
}
