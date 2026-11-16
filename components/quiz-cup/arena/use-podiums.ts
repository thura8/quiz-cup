import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { PODIUM_LED_KEYS, PODIUM_STATUS_COLORS, type PodiumSlot } from "@/constants/quiz-cup-arena";
import { STUDIO_PODIUM_BASE_LED } from "@/constants/quiz-cup-studio";

import { mergeByMaterial, setupLed } from "./arena-utils";
import { studioPodiumTemplate } from "./studio-podium";

const MATERIAL_PREFIX = "ContestantPodium_";
const SCREEN_MATERIAL = `${MATERIAL_PREFIX}Screen_Display`;
export const BASE_LED_MATERIAL = `${MATERIAL_PREFIX}LED_Base`;
const PER_SLOT_MATERIALS = new Set([...PODIUM_LED_KEYS.map((key) => MATERIAL_PREFIX + key), SCREEN_MATERIAL]);

export type SlotHandles = {
  leds: THREE.MeshStandardMaterial[];
  screen: THREE.MeshStandardMaterial;
  placeholder: THREE.Texture | null;
};

function placePodiums(slots: PodiumSlot[]) {
  const assembly = new THREE.Group();
  const roots = slots.map(({ x, y, z, yaw, scale }, i) => {
    const podium = studioPodiumTemplate(i).clone(true);
    podium.position.set(x, y, z);
    podium.rotation.y = yaw;
    podium.scale.setScalar(scale);
    assembly.add(podium);
    return podium;
  });
  return { assembly, roots };
}

function findSlotIndex(mesh: THREE.Mesh, roots: THREE.Group[]) {
  let slot = -1;
  mesh.traverseAncestors((ancestor) => {
    if (slot < 0) slot = roots.indexOf(ancestor as THREE.Group);
  });
  return slot;
}

function freezeChildren(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object !== root) {
      object.updateMatrix();
      object.matrixAutoUpdate = false;
    }
  });
}

function buildPodiums(slots: PodiumSlot[]) {
  const { assembly, roots } = placePodiums(slots);
  const { merged, kept } = mergeByMaterial(assembly, (mesh) =>
    PER_SLOT_MATERIALS.has((mesh.material as THREE.Material).name),
  );

  const perSlot = new THREE.Group();
  const owned: THREE.Material[] = [];
  const handles: SlotHandles[] = roots.map(() => ({ leds: [], screen: null!, placeholder: null }));
  for (const mesh of kept) {
    const slot = findSlotIndex(mesh, roots);
    const material = (mesh.material as THREE.MeshStandardMaterial).clone();
    owned.push(material);
    mesh.material = material;
    if (material.name === SCREEN_MATERIAL) {
      handles[slot].screen = material;
      handles[slot].placeholder = material.map;
    } else {
      const ledColor = material.name === BASE_LED_MATERIAL ? STUDIO_PODIUM_BASE_LED : PODIUM_STATUS_COLORS.idle;
      setupLed(material, ledColor);
      handles[slot].leds.push(material);
    }
    perSlot.attach(mesh);
  }
  freezeChildren(perSlot);
  return { merged, perSlot, handles, owned };
}

export function usePodiums(slots: PodiumSlot[]) {
  const built = useMemo(() => buildPodiums(slots), [slots]);

  useEffect(
    () => () => {
      built.merged.traverse((object) => (object as THREE.Mesh).geometry?.dispose());
      built.owned.forEach((material) => material.dispose());
    },
    [built],
  );

  return built;
}

export const statusLeds = (handles: SlotHandles | undefined) =>
  (handles?.leds ?? []).filter((material) => material.name !== BASE_LED_MATERIAL);
