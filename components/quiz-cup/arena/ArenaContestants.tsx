"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import {
  ARENA_HOST_POSITION,
  ARENA_HOST_YAW,
  ARENA_MODELS,
  ARENA_PLAYER_BEHIND,
  PODIUM_LED_KEYS,
  PODIUM_STATUS_COLORS,
  type PodiumSlot,
} from "@/constants/quiz-cup-arena";
import { STUDIO_PODIUM_BASE_LED } from "@/constants/quiz-cup-studio";
import type { QuizCupArenaPlayer } from "@/types/quiz-cup";

import { drawNameTexture, mergeByMaterial, setupLed } from "./arena-utils";
import { PlayerRig } from "./player-rig";
import { studioPodiumTemplate } from "./studio-podium";

/** Head-top label height above the stage: clear of the hair, under the raised hands. */
const TAG_HEIGHT = 2.0;
const tagPoint = new THREE.Vector3();

/** Players are drawn at full size next to a full-size (0.84) podium, smaller with it. */
function characterScale(slot: PodiumSlot) {
  return Math.min(1, slot.scale / 0.84);
}

/** Where the player stands: behind the podium, along the way it faces. */
function playerSpot(slot: PodiumSlot): [number, number, number] {
  const behind = ARENA_PLAYER_BEHIND * characterScale(slot);
  return [slot.x - Math.sin(slot.yaw) * behind, slot.y, slot.z - Math.cos(slot.yaw) * behind];
}

const PREFIX = "ContestantPodium_";
const SCREEN = `${PREFIX}Screen_Display`;
const BASE_LED = `${PREFIX}LED_Base`;
const BASE_LED_COLOR = STUDIO_PODIUM_BASE_LED;
const SLOT_MATERIALS = new Set([...PODIUM_LED_KEYS.map((k) => PREFIX + k), SCREEN]);

type SlotHandles = {
  leds: THREE.MeshStandardMaterial[];
  screen: THREE.MeshStandardMaterial;
  placeholder: THREE.Texture | null;
};

/**
 * Podium bodies for every slot are merged into one mesh per material (a dozen draw calls in
 * total, however many players); only the LED strips and the name screen stay per slot, each
 * with its own material so colours and names never leak between players.
 */
function usePodiums(slots: PodiumSlot[]) {
  const built = useMemo(() => {
    const assembly = new THREE.Group();
    // The studio podiums are built in code (studio-podium.ts) with the old model's material
    // names; two colourways alternate along the arc.
    const roots = slots.map(({ x, y, z, yaw, scale }, i) => {
      const podium = studioPodiumTemplate(i).clone(true);
      podium.position.set(x, y, z);
      podium.rotation.y = yaw;
      podium.scale.setScalar(scale);
      assembly.add(podium);
      return podium;
    });
    const { merged, kept } = mergeByMaterial(assembly, (mesh) =>
      SLOT_MATERIALS.has((mesh.material as THREE.Material).name),
    );

    const perSlot = new THREE.Group();
    const owned: THREE.Material[] = [];
    const handles: SlotHandles[] = roots.map(() => ({ leds: [], screen: null!, placeholder: null }));
    for (const mesh of kept) {
      let slot = -1;
      mesh.traverseAncestors((a) => {
        if (slot < 0) slot = roots.indexOf(a as THREE.Group);
      });
      const material = (mesh.material as THREE.MeshStandardMaterial).clone();
      owned.push(material);
      mesh.material = material;
      if (material.name === SCREEN) {
        handles[slot].screen = material;
        handles[slot].placeholder = material.map;
      } else {
        setupLed(material, material.name === BASE_LED ? BASE_LED_COLOR : PODIUM_STATUS_COLORS.idle);
        handles[slot].leds.push(material);
      }
      perSlot.attach(mesh);
    }
    perSlot.traverse((o) => {
      if (o !== perSlot) {
        o.updateMatrix();
        o.matrixAutoUpdate = false;
      }
    });
    return { merged, perSlot, handles, owned };
  }, [slots]);

  useEffect(
    () => () => {
      built.merged.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      built.owned.forEach((m) => m.dispose());
    },
    [built],
  );

  return built;
}

function usePageFont() {
  return useMemo(() => getComputedStyle(document.body).fontFamily || "system-ui, sans-serif", []);
}

type Props = {
  players: QuizCupArenaPlayer[];
  slots: PodiumSlot[];
  castShadows: boolean;
  /** Called after the podium layout changes, so a frozen shadow map can be redrawn once. */
  onLayout: () => void;
  /** DOM labels (outside the canvas), one per slot, moved over each player's head here. */
  tags?: RefObject<(HTMLElement | null)[]>;
};

function ArenaContestants({ players, slots, castShadows, onLayout, tags }: Props) {
  const { merged, perSlot, handles } = usePodiums(slots);
  const { scene: playerScene } = useGLTF(ARENA_MODELS.player);
  const font = usePageFont();

  const characters = useMemo(
    () =>
      slots.map((slot, i) => {
        // SkeletonUtils keeps each clone's skinned meshes bound to its own bones.
        const root = cloneSkinned(playerScene);
        const [px, py, pz] = playerSpot(slot);
        root.position.set(px, py, pz);
        root.rotation.y = slot.yaw;
        root.scale.setScalar(characterScale(slot));
        root.traverse((o) => {
          o.castShadow = false; // behind the podium; its shadow would only cost a pass
          o.frustumCulled = true;
        });
        return { root, rig: new PlayerRig(root, i + 1) };
      }),
    [playerScene, slots],
  );

  useLayoutEffect(() => {
    merged.traverse((o) => (o.castShadow = castShadows));
    onLayout();
  }, [merged, castShadows, onLayout]);

  // Names: redrawn only when a name changes; fonts must be ready or the canvas falls back.
  const names = players.map((p) => p.name).join("\u0000");
  useEffect(() => {
    let cancelled = false;
    const drawn: THREE.Texture[] = [];
    document.fonts.ready.then(() => {
      if (cancelled) return;
      handles.forEach((h, i) => {
        const name = players[i]?.name.trim();
        const texture = name ? drawNameTexture(name, font) : h.placeholder;
        if (name && texture) drawn.push(texture);
        h.screen.map = texture;
        h.screen.emissiveMap = texture;
        h.screen.needsUpdate = true;
      });
    });
    return () => {
      cancelled = true;
      drawn.forEach((t) => t.dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the joined names
  }, [handles, names, font]);

  // Status -> LED colour. A change flashes the strips for a moment.
  const statusRef = useRef(players.map((p) => p.status));
  const flashAt = useRef<number[]>([]);
  useEffect(() => {
    const now = performance.now() / 1000;
    players.forEach((p, i) => {
      if (statusRef.current[i] !== p.status) flashAt.current[i] = now;
      const leds = handles[i]?.leds ?? [];
      for (const m of leds) {
        if (m.name !== BASE_LED) m.emissive.set(PODIUM_STATUS_COLORS[p.status]);
      }
    });
    statusRef.current = players.map((p) => p.status);
  }, [players, handles]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // Head labels: project each head into the canvas and move its DOM tag there (no extra
    // React roots, unlike drei's <Html>, and no re-render per frame).
    const { width, height } = state.size;
    for (let i = 0; i < slots.length; i++) {
      const el = tags?.current[i];
      if (!el) continue;
      const [px, py, pz] = playerSpot(slots[i]);
      tagPoint.set(px, py + TAG_HEIGHT * characterScale(slots[i]), pz).project(state.camera);
      const visible = tagPoint.z < 1 && Math.abs(tagPoint.x) < 1.1 && Math.abs(tagPoint.y) < 1.1;
      el.style.visibility = visible ? "visible" : "hidden";
      el.style.transform = `translate(${((tagPoint.x + 1) / 2) * width}px, ${((1 - tagPoint.y) / 2) * height}px) translate(-50%, -50%)`;
    }
    const now = performance.now() / 1000;
    const dt = Math.min(delta, 0.1); // a stalled tab must not snap every pose at once
    for (let i = 0; i < characters.length; i++) {
      const status = statusRef.current[i] ?? "idle";
      characters[i].rig.update(t, dt, status);
      const since = now - (flashAt.current[i] ?? -10);
      const flash = since < 1.2 ? 1 + 1.2 * Math.abs(Math.sin(since * Math.PI * 4)) * (1 - since / 1.2) : 1;
      for (const m of handles[i]?.leds ?? []) {
        if (m.name !== BASE_LED) m.emissiveIntensity = flash;
      }
    }
  });

  return (
    <>
      <primitive object={merged} />
      <primitive object={perSlot} />
      {characters.map(({ root }, i) => (
        <primitive key={i} object={root} />
      ))}
    </>
  );
}

export default memo(ArenaContestants);

/** Host outfit: dark navy blazer over a grey shirt, dark trousers (cloned materials only). */
const HOST_OUTFIT: Record<string, string> = {
  M_Player01_Shirt: "#252a5c", // blazer
  M_Player01_Orange: "#3a3f6e", // collar / trims
  M_Player01_Tie: "#8f8fb0", // shirt front
  M_Player01_Crest: "#252a5c",
  M_Player01_Trousers: "#14152b",
  M_Player01_ShoeWhite: "#1b1b24",
};

/**
 * The host: the contestant character re-dressed, standing behind the host podium on the
 * host platform, with a presenter's idle (the rig's "idle" pose, plus the usual life).
 */
function ArenaHostImpl() {
  const { scene } = useGLTF(ARENA_MODELS.player);
  const { root, rig } = useMemo(() => {
    const root = cloneSkinned(scene);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => {
        const c = (mat as THREE.MeshStandardMaterial).clone();
        const colour = HOST_OUTFIT[c.name];
        if (colour) {
          c.color.set(colour);
          c.map = null;
        }
        return c;
      });
      m.material = Array.isArray(m.material) ? mats : mats[0];
      m.castShadow = true;
    });
    const [x, y, z] = ARENA_HOST_POSITION;
    const behind = 0.62;
    root.position.set(x - Math.sin(ARENA_HOST_YAW) * behind, y, z - Math.cos(ARENA_HOST_YAW) * behind);
    root.rotation.y = ARENA_HOST_YAW;
    root.scale.setScalar(1.12);
    return { root, rig: new PlayerRig(root, 7) };
  }, [scene]);

  useEffect(
    () => () =>
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => mat.dispose());
      }),
    [root],
  );

  useFrame((state, delta) => rig.update(state.clock.elapsedTime, Math.min(delta, 0.1), "idle"));

  return <primitive object={root} />;
}

export const ArenaHost = memo(ArenaHostImpl);

export function preloadArenaContestants() {
  useGLTF.preload(ARENA_MODELS.player);
}
