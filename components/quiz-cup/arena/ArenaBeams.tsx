"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

import { STUDIO_FIXTURES } from "./studio-rig";

const LENGTH = 7.5;
const SPREAD = { MovingHead: 0.11, Wash: 0.17, Accent: 0.08 } as const;
// Studio look: warm gold stage lights, with the odd violet accent.
const WARM = new THREE.Color("#ffc260");
const COOL = new THREE.Color("#a273ff");

// Additive cone with soft edges (view-facing falloff) fading out along its length.
const vertexShader = /* glsl */ `
  varying float vAlong;
  varying float vEdge;
  varying vec3 vColor;
  void main() {
    vAlong = uv.y;
    vColor = instanceColor;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vec3 toCamera = normalize(cameraPosition - world.xyz);
    vEdge = abs(dot(n, toCamera));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const fragmentShader = /* glsl */ `
  uniform float uStrength;
  varying float vAlong;
  varying float vEdge;
  varying vec3 vColor;
  void main() {
    float fade = pow(vAlong, 1.6);
    float soft = pow(vEdge, 2.0);
    gl_FragColor = vec4(vColor * fade * soft * uStrength, 1.0);
    // Same output encoding as the lit materials, with or without the post-processing composer.
    #include <colorspace_fragment>
  }
`;

/**
 * Fake volumetric beams from every studio fixture (studio-rig.ts): one instanced draw call instead of 24 real
 * spotlights (each of which would be paid for on every lit pixel of the arena).
 */
export default function ArenaBeams({ strength }: { strength: number }) {
  const heads = STUDIO_FIXTURES;

  const { mesh, material } = useMemo(() => {
    // Apex at the origin, opening along -Y; uv.y = 1 at the lens, 0 at the far end.
    const geometry = new THREE.ConeGeometry(1, LENGTH, 32, 1, true);
    geometry.translate(0, -LENGTH / 2, 0);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uStrength: { value: strength } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, heads.length);
    // Present before the first compile, so the shader is built with USE_INSTANCING_COLOR.
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(heads.length * 3), 3);
    mesh.frustumCulled = false; // instances span the whole rig
    return { mesh, material };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- strength is driven per frame
  }, [heads]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const down = new THREE.Vector3(0, -1, 0);
    heads.forEach((h, i) => {
      const radius = Math.tan(SPREAD[h.kind as keyof typeof SPREAD] ?? 0.2) * LENGTH;
      q.setFromUnitVectors(down, h.direction);
      s.set(radius, 1, radius);
      m.compose(h.position.clone().addScaledVector(h.direction, 0.3), q, s);
      mesh.setMatrixAt(i, m);
      const warm = h.kind !== "Accent" || i % 2 === 0;
      mesh.setColorAt(i, (warm ? WARM : COOL).clone().multiplyScalar(warm ? 0.17 : 0.12));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return () => {
      mesh.geometry.dispose();
      material.dispose();
    };
  }, [heads, mesh, material]);

  useFrame((_, delta) => {
    const u = material.uniforms.uStrength;
    u.value += (strength - u.value) * (1 - Math.exp(-delta * 3));
  });

  return <primitive object={mesh} />;
}
