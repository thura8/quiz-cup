"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useState } from "react";
import * as THREE from "three";

import { STUDIO_FIXTURES } from "./studio-rig";

const LENGTH = 7.5;
const SPREAD = { MovingHead: 0.11, Wash: 0.17, Accent: 0.08 } as const;
const WARM = new THREE.Color("#ffc260");
const COOL = new THREE.Color("#a273ff");

const vertexShader = `
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
const fragmentShader = `
  uniform float uStrength;
  varying float vAlong;
  varying float vEdge;
  varying vec3 vColor;
  void main() {
    float fade = pow(clamp(vAlong, 0.0, 1.0), 1.6);
    float soft = pow(clamp(vEdge, 0.0, 1.0), 2.0);
    gl_FragColor = vec4(vColor * fade * soft * uStrength, 1.0);
    #include <colorspace_fragment>
  }
`;

const beamHeads = STUDIO_FIXTURES;

function createBeams(initialStrength: number) {
  const geometry = new THREE.ConeGeometry(1, LENGTH, 32, 1, true);
  geometry.translate(0, -LENGTH / 2, 0);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uStrength: { value: initialStrength } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, beamHeads.length);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(beamHeads.length * 3), 3);
  mesh.frustumCulled = false;
  return { mesh, material };
}

function placeBeams(mesh: THREE.InstancedMesh) {
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  beamHeads.forEach((head, i) => {
    const radius = Math.tan(SPREAD[head.kind as keyof typeof SPREAD] ?? 0.2) * LENGTH;
    rotation.setFromUnitVectors(down, head.direction);
    scale.set(radius, 1, radius);
    matrix.compose(head.position.clone().addScaledVector(head.direction, 0.3), rotation, scale);
    mesh.setMatrixAt(i, matrix);
    const warm = head.kind !== "Accent" || i % 2 === 0;
    mesh.setColorAt(i, (warm ? WARM : COOL).clone().multiplyScalar(warm ? 0.17 : 0.12));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export default function ArenaBeams({ strength }: { strength: number }) {
  const [{ mesh, material }] = useState(() => createBeams(strength));

  useLayoutEffect(() => {
    placeBeams(mesh);
    return () => {
      mesh.geometry.dispose();
      material.dispose();
    };
  }, [mesh, material]);

  useFrame((_, delta) => {
    const uniform = material.uniforms.uStrength;
    uniform.value += (strength - uniform.value) * (1 - Math.exp(-delta * 3));
  });

  return <primitive object={mesh} />;
}
