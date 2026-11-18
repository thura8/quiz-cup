import * as THREE from "three";

import { isMergeable, mergeMeshesByMaterial } from "../arena-utils";

const prepared = new WeakSet<THREE.Object3D>();

function mergeRigidChildren(parent: THREE.Object3D) {
  const rigid = parent.children.filter(
    (child): child is THREE.Mesh => (child as THREE.Mesh).isMesh && isMergeable(child as THREE.Mesh),
  );
  if (rigid.length < 2) return;
  const merged = mergeMeshesByMaterial(rigid, parent.matrixWorld.clone().invert());
  if (merged.length >= rigid.length) {
    merged.forEach((mesh) => mesh.geometry.dispose());
    return;
  }
  for (const mesh of rigid) {
    parent.remove(mesh);
    mesh.geometry.dispose();
  }
  for (const mesh of merged) parent.add(mesh);
}

export function prepareCharacter<T extends THREE.Object3D>(scene: T): T {
  if (prepared.has(scene)) return scene;
  prepared.add(scene);
  scene.updateMatrixWorld(true);
  const parents: THREE.Object3D[] = [];
  scene.traverse((object) => parents.push(object));
  parents.forEach(mergeRigidChildren);
  return scene;
}
