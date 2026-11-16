import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { STUDIO } from "@/constants/quiz-cup-studio";
import { withMattePaint } from "@/lib/three/procedural-textures";

const W = 1.4;
const D = 0.62;
const PLINTH_H = 0.12;
const BODY_H = 0.7;

function surface(color: string, roughness: number, metalness = 0.05) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 1.1 });
  return roughness >= 0.4 ? withMattePaint(m, 4, 0.3) : m;
}

function led(color: string, gain = 1.5) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain), toneMapped: false });
  m.fog = false;
  return m;
}

function wedgeX(t: number) {
  const foot = 0.12;
  const top = 0.4;
  return foot + (top - foot) * Math.pow(t, 2.2);
}

function wedgeShape(h: number, grow = 0) {
  const s = new THREE.Shape();
  const steps = 16;
  s.moveTo(-(wedgeX(0) + grow), 0);
  for (let i = 1; i <= steps; i++) s.lineTo(-(wedgeX(i / steps) + grow), (i / steps) * h);
  for (let i = steps; i >= 0; i--) s.lineTo(wedgeX(i / steps) + grow, (i / steps) * h);
  s.closePath();
  return s;
}

function sidePanelShape(h: number, side: 1 | -1) {
  const s = new THREE.Shape();
  const steps = 16;
  const edge = W / 2 - 0.08;
  const gap = 0.07;
  s.moveTo(side * edge, 0);
  s.lineTo(side * edge, h);
  for (let i = steps; i >= 0; i--) s.lineTo(side * (wedgeX(i / steps) + gap), (i / steps) * h);
  s.closePath();
  return s;
}

function curveTube(h: number, offset: number, side: 1 | -1, y0: number, z: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    pts.push(new THREE.Vector3(side * (wedgeX(t) + offset), y0 + t * h, z));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.012, 6, false);
}

export function buildHostPodium(): THREE.Group {
  const g = new THREE.Group();
  g.name = "HostPodium";

  const purple = surface("#6a45c8", 0.45);
  const purpleHi = surface("#8460e0", 0.3, 0.1);
  const blue = surface("#4a55c8", 0.45);
  const deep = surface("#2e2f8a", 0.55);
  const topDark = surface("#221f52", 0.35, 0.2);
  const gold = led(STUDIO.gold, 1.6);

  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };

  add(new RoundedBoxGeometry(W + 0.36, PLINTH_H * 0.55, D + 0.34, 4, 0.03), purple, 0, PLINTH_H * 0.275, 0);
  add(new RoundedBoxGeometry(W + 0.2, PLINTH_H * 0.5, D + 0.2, 4, 0.025), purpleHi, 0, PLINTH_H * 0.8, 0);

  const bodyY = PLINTH_H + BODY_H / 2;
  add(new RoundedBoxGeometry(W, BODY_H, D, 5, 0.08), deep, 0, bodyY, 0);

  const front = D / 2;
  const extrudeOpts = { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 3, curveSegments: 8 };
  for (const side of [-1, 1] as const) {
    add(new THREE.ExtrudeGeometry(sidePanelShape(BODY_H - 0.06, side), extrudeOpts), blue, 0, PLINTH_H + 0.03, front - 0.02);
    add(curveTube(BODY_H - 0.06, 0.035, side, PLINTH_H + 0.03, front + 0.04), gold, 0, 0, 0);
  }
  add(new THREE.ExtrudeGeometry(wedgeShape(BODY_H - 0.02), { ...extrudeOpts, depth: 0.06 }), purpleHi, 0, PLINTH_H + 0.01, front - 0.02);

  const t1 = PLINTH_H + BODY_H;
  add(new RoundedBoxGeometry(W + 0.06, 0.012, D + 0.06, 2, 0.006), gold, 0, t1 + 0.006, 0);
  add(new RoundedBoxGeometry(W + 0.1, 0.11, D + 0.1, 4, 0.045), purple, 0, t1 + 0.07, 0);
  add(new RoundedBoxGeometry(W + 0.16, 0.012, D + 0.16, 2, 0.006), gold, 0, t1 + 0.131, 0);
  add(new RoundedBoxGeometry(W + 0.2, 0.09, D + 0.2, 4, 0.04), purpleHi, 0, t1 + 0.185, 0);

  const topY = t1 + 0.26;
  add(new RoundedBoxGeometry(W + 0.38, 0.07, D + 0.38, 5, 0.034), purple, 0, topY, 0.04);
  add(new RoundedBoxGeometry(W + 0.28, 0.012, D + 0.28, 3, 0.006), topDark, 0, topY + 0.036, 0.04);

  add(new RoundedBoxGeometry(0.42, 0.02, 0.26, 3, 0.01), surface("#14123a", 0.3, 0.4), 0, topY + 0.045, 0.02);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#3d6bff").multiplyScalar(0.8), toneMapped: false }),
  );
  screen.position.set(0, topY + 0.056, 0.02);
  g.add(screen);

  const neck = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.55, topY + 0.04, -0.1),
    new THREE.Vector3(0.55, topY + 0.2, -0.12),
    new THREE.Vector3(0.52, topY + 0.32, -0.06),
    new THREE.Vector3(0.48, topY + 0.36, 0.04),
  ]);
  const metal = surface("#1a1830", 0.35, 0.8);
  add(new THREE.TubeGeometry(neck, 24, 0.009, 6, false), metal, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 16), metal, 0.55, topY + 0.05, -0.1);
  const head = add(new THREE.CapsuleGeometry(0.018, 0.05, 4, 10), surface("#0c0b1c", 0.5), 0.47, topY + 0.365, 0.07);
  head.rotation.x = Math.PI / 2.4;

  return g;
}
