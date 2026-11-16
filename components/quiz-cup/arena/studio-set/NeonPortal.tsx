"use client";

import * as THREE from "three";

import { QUIZ_CUP_SCREEN } from "@/constants/quiz-cup-arena";
import { STUDIO } from "@/constants/quiz-cup-studio";

import { freeze } from "../arena-utils";
import { useBuiltGroup } from "../use-built-group";
import { neon } from "./materials";

type RoundedRect = [width: number, height: number, cornerRadius: number];
type TopBump = { w: number; h: number };

type PortalFrame = {
  outer: RoundedRect;
  inner: RoundedRect;
  bump?: TopBump;
  depth: number;
  z: number;
  color: string;
  neon: string;
  neonWidth: number;
  neonGain: number;
};

type RingOutline = { outer: RoundedRect; inner: RoundedRect; bump?: TopBump; innerBump?: TopBump };

const NEON_INSET = 0.09;

function traceTopBump<T extends THREE.Path>(path: T, top: number, bump: TopBump) {
  const halfWidth = bump.w / 2;
  const corner = Math.min(0.45, bump.h);
  const bumpTop = top + bump.h;
  path.lineTo(halfWidth + corner, top);
  path.quadraticCurveTo(halfWidth, top, halfWidth, top + corner);
  path.lineTo(halfWidth, bumpTop - corner);
  path.quadraticCurveTo(halfWidth, bumpTop, halfWidth - corner, bumpTop);
  path.lineTo(-halfWidth + corner, bumpTop);
  path.quadraticCurveTo(-halfWidth, bumpTop, -halfWidth, bumpTop - corner);
  path.lineTo(-halfWidth, top + corner);
  path.quadraticCurveTo(-halfWidth, top, -halfWidth - corner, top);
}

function traceRoundedRect<T extends THREE.Path>(
  path: T,
  width: number,
  height: number,
  cornerRadius: number,
  bump?: TopBump,
) {
  const left = -width / 2;
  const bottom = -height / 2;
  const right = left + width;
  const top = bottom + height;
  const radius = Math.min(cornerRadius, width / 2, height / 2);

  path.moveTo(left + radius, bottom);
  path.lineTo(right - radius, bottom);
  path.quadraticCurveTo(right, bottom, right, bottom + radius);
  path.lineTo(right, top - radius);
  path.quadraticCurveTo(right, top, right - radius, top);
  if (bump) traceTopBump(path, top, bump);
  path.lineTo(left + radius, top);
  path.quadraticCurveTo(left, top, left, top - radius);
  path.lineTo(left, bottom + radius);
  path.quadraticCurveTo(left, bottom, left + radius, bottom);
  return path;
}

function ringShape({ outer, inner, bump, innerBump }: RingOutline): THREE.Shape {
  const shape = traceRoundedRect(new THREE.Shape(), ...outer, bump);
  shape.holes.push(traceRoundedRect(new THREE.Path(), ...inner, innerBump));
  return shape;
}

function portalFrames(): PortalFrame[] {
  const { width: w, height: h, z } = QUIZ_CUP_SCREEN;
  return [
    { outer: [w + 0.7, h + 0.7, 0.5], inner: [w, h, 0.22], depth: 0.3, z: z - 0.02, color: "#d86fe0", neon: STUDIO.gold, neonWidth: 0.06, neonGain: 1.7 },
    { outer: [w + 2.0, h + 1.9, 0.95], inner: [w + 0.62, h + 0.62, 0.48], depth: 0.34, z: z - 0.25, color: "#8a66ec", neon: "#ffb3f0", neonWidth: 0.05, neonGain: 1.4 },
    { outer: [w + 3.6, h + 3.3, 1.5], inner: [w + 1.9, h + 1.82, 0.92], depth: 0.38, z: z - 0.5, color: "#4f4fd0", neon: STUDIO.violet, neonWidth: 0.05, neonGain: 1.6 },
    { outer: [w + 5.6, h + 4.9, 2.1], inner: [w + 3.5, h + 3.22, 1.45], depth: 0.4, z: z - 0.78, color: "#33297e", neon: STUDIO.gold, neonWidth: 0.055, neonGain: 1.5 },
    { outer: [w + 8.4, h + 6.4, 2.8], inner: [w + 5.5, h + 4.82, 2.05], bump: { w: w * 1.15, h: 0.9 }, depth: 0.42, z: z - 1.08, color: "#241d62", neon: "#ff9a6a", neonWidth: 0.06, neonGain: 1.4 },
  ];
}

function frameBody(frame: PortalFrame) {
  const geometry = new THREE.ExtrudeGeometry(ringShape(frame), {
    depth: frame.depth,
    bevelEnabled: true,
    bevelSize: 0.1,
    bevelThickness: 0.12,
    bevelSegments: 5,
    curveSegments: 22,
  });
  const material = new THREE.MeshStandardMaterial({
    color: frame.color,
    emissive: frame.color,
    emissiveIntensity: 0.32,
    roughness: 0.28,
    metalness: 0.2,
    envMapIntensity: 1.2,
  });
  return new THREE.Mesh(geometry, material);
}

function frameNeonStrip(frame: PortalFrame) {
  const [outerWidth, outerHeight, outerRadius] = frame.outer;
  const outerInset = NEON_INSET;
  const innerInset = NEON_INSET + frame.neonWidth;
  const outline: RingOutline = {
    outer: [outerWidth - outerInset * 2, outerHeight - outerInset * 2, Math.max(0.05, outerRadius - outerInset)],
    inner: [
      outerWidth - innerInset * 2,
      outerHeight - innerInset * 2,
      Math.max(0.04, outerRadius - NEON_INSET - frame.neonWidth),
    ],
    bump: frame.bump && { w: frame.bump.w - outerInset * 2, h: frame.bump.h },
    innerBump: frame.bump && { w: frame.bump.w - innerInset * 2, h: frame.bump.h },
  };
  const geometry = new THREE.ExtrudeGeometry(ringShape(outline), { depth: 0.02, bevelEnabled: false, curveSegments: 18 });
  return new THREE.Mesh(geometry, neon(frame.neon, frame.neonGain));
}

function buildNeonPortal() {
  const group = new THREE.Group();
  const centerY = QUIZ_CUP_SCREEN.centerY;
  for (const frame of portalFrames()) {
    const body = frameBody(frame);
    body.position.set(0, centerY, frame.z);
    group.add(body);

    const strip = frameNeonStrip(frame);
    strip.position.set(0, centerY, frame.z + frame.depth + 0.125);
    group.add(strip);
  }
  freeze(group);
  return group;
}

export default function NeonPortal() {
  const group = useBuiltGroup(buildNeonPortal);
  return <primitive object={group} />;
}
