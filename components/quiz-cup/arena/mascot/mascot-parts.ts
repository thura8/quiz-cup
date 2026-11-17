import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import type { Vec3 } from "./mascot-spec";

const UP = new THREE.Vector3(0, 1, 0);
const LATHE_SEGMENTS = 40;

export const v3 = (p: Vec3) => new THREE.Vector3(...p);

function alignY(geometry: THREE.BufferGeometry, from: THREE.Vector3, to: THREE.Vector3) {
  const direction = to.clone().sub(from).normalize();
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction));
  geometry.translate(from.x, from.y, from.z);
  return geometry;
}

export function limb(from: Vec3 | THREE.Vector3, to: Vec3 | THREE.Vector3, profile: [number, number][]) {
  const a = Array.isArray(from) ? v3(from) : from;
  const b = Array.isArray(to) ? v3(to) : to;
  const length = a.distanceTo(b);
  const points = profile.map(([radius, t]) => new THREE.Vector2(radius, t * length));
  return alignY(new THREE.LatheGeometry(points, LATHE_SEGMENTS, Math.PI), a, b);
}

export function ellipsoid(center: Vec3 | THREE.Vector3, radii: Vec3, segments = 32) {
  const c = Array.isArray(center) ? v3(center) : center;
  const geometry = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.75));
  geometry.scale(...radii);
  geometry.translate(c.x, c.y, c.z);
  return geometry;
}

export function orientedEllipsoid(center: THREE.Vector3, radii: Vec3, along: THREE.Vector3, segments = 20) {
  const geometry = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.75));
  geometry.scale(...radii);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, along.clone().normalize()));
  geometry.translate(center.x, center.y, center.z);
  return geometry;
}

const EAR_RADII: Vec3 = [0.011, 0.034, 0.022];
const EAR_CUP_DEPTH = 0.8;
const EAR_YAW = THREE.MathUtils.degToRad(20);
const EAR_TILT = THREE.MathUtils.degToRad(12);

export function earGeometry(center: THREE.Vector3, side: 1 | -1, rim: THREE.Color, inner: THREE.Color) {
  const [rx, ry, rz] = EAR_RADII;
  const geometry = new THREE.SphereGeometry(1, 24, 18);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const radial = Math.min(1, position.getY(i) ** 2 + position.getZ(i) ** 2);
    const cup = x * side > 0 ? EAR_CUP_DEPTH * (1 - radial) : 0;
    position.setX(i, (x - cup * x) * rx);
    position.setY(i, position.getY(i) * ry);
    position.setZ(i, position.getZ(i) * rz);
    color.copy(rim).lerp(inner, THREE.MathUtils.smoothstep(cup, 0.15, 0.6));
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.rotateX(-EAR_TILT);
  geometry.rotateY(-side * EAR_YAW);
  geometry.computeVertexNormals();
  geometry.translate(center.x, center.y, center.z);
  return geometry;
}

export function cone(base: THREE.Vector3, tip: THREE.Vector3, radius: number) {
  const height = base.distanceTo(tip);
  const geometry = new THREE.ConeGeometry(radius, height, 12, 1);
  geometry.translate(0, height / 2, 0);
  return alignY(geometry, base, tip);
}

export function shoe(center: Vec3, size: Vec3, yaw: number) {
  const [width, height, length] = size;
  const geometry = new RoundedBoxGeometry(width, height, length, 4, Math.min(width, height) * 0.42);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const toe = THREE.MathUtils.smoothstep(position.getZ(i), 0, length * 0.5);
    if (y > 0) position.setY(i, y * (1 - 0.55 * toe));
  }
  position.needsUpdate = true;
  geometry.rotateY(yaw);
  geometry.translate(...center);
  return geometry;
}

export function outlineOf(geometry: THREE.BufferGeometry, thickness: number) {
  const hull = geometry.clone();
  if (!hull.index) hull.setIndex(Array.from({ length: hull.attributes.position.count }, (_, i) => i));
  const position = hull.attributes.position;
  const normal = hull.attributes.normal;
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(
      i,
      position.getX(i) + normal.getX(i) * thickness,
      position.getY(i) + normal.getY(i) * thickness,
      position.getZ(i) + normal.getZ(i) * thickness,
    );
  }
  const index = hull.index!;
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1);
    index.setX(i + 1, index.getX(i + 2));
    index.setX(i + 2, b);
  }
  index.needsUpdate = true;
  hull.deleteAttribute("uv");
  return hull;
}
