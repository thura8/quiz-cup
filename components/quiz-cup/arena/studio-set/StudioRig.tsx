"use client";

import * as THREE from "three";

import {
  STUDIO_FIXTURES,
  fixtureHousingGeometry,
  fixtureLensGeometry,
  fixtureMatrix,
  trussMatrices,
  trussUnitGeometry,
} from "../studio-rig";
import { useBuiltGroup } from "../use-built-group";
import { neon } from "./materials";

function buildStudioRig() {
  const group = new THREE.Group();

  const trussMaterial = new THREE.MeshStandardMaterial({ color: "#2a2250", roughness: 0.38, metalness: 0.85 });
  const spans = trussMatrices();
  const truss = new THREE.InstancedMesh(trussUnitGeometry(), trussMaterial, spans.length);
  spans.forEach((matrix, i) => truss.setMatrixAt(i, matrix));
  group.add(truss);

  const fixtureMatrices = STUDIO_FIXTURES.map((fixture) => fixtureMatrix(fixture.position, fixture.direction));
  const housingMaterial = new THREE.MeshStandardMaterial({ color: "#151028", roughness: 0.4, metalness: 0.7 });
  const housings = new THREE.InstancedMesh(fixtureHousingGeometry(), housingMaterial, fixtureMatrices.length);
  const lenses = new THREE.InstancedMesh(fixtureLensGeometry(), neon("#ffe2a0", 2.6), fixtureMatrices.length);
  fixtureMatrices.forEach((matrix, i) => {
    housings.setMatrixAt(i, matrix);
    lenses.setMatrixAt(i, matrix);
  });
  group.add(housings, lenses);

  for (const mesh of [truss, housings, lenses]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
  return group;
}

export default function StudioRig() {
  const group = useBuiltGroup(buildStudioRig);
  return <primitive object={group} />;
}
