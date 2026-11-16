import { useEffect, useMemo } from "react";
import * as THREE from "three";

type Disposable = { dispose(): void };

export function disposeMeshResources(root: THREE.Object3D) {
  const disposed = new Set<unknown>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const textures = materials.flatMap((material) => {
      const standard = material as THREE.MeshStandardMaterial;
      return [standard.map, standard.roughnessMap, standard.normalMap];
    });
    for (const resource of [mesh.geometry, ...materials, ...textures]) {
      if (resource && !disposed.has(resource)) {
        disposed.add(resource);
        (resource as Disposable).dispose();
      }
    }
  });
}

export function useDisposable(group: THREE.Object3D) {
  useEffect(() => () => disposeMeshResources(group), [group]);
}

export function useBuiltGroup<T extends THREE.Object3D>(build: () => T) {
  const group = useMemo(() => build(), [build]);
  useDisposable(group);
  return group;
}
