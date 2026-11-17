"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import {
  ARENA_MODELS,
  ARENA_PLAYER_BEHIND,
  PODIUM_STATUS_COLORS,
  type PodiumSlot,
} from "@/constants/quiz-cup-arena";
import type { QuizCupArenaPlayer } from "@/types/quiz-cup";

import { drawNameTexture } from "./arena-utils";
import { PlayerRig } from "./player-rig";
import { type SlotHandles, statusLeds, usePodiums } from "./use-podiums";

export { default as ArenaHost } from "./ArenaHost";

const TAG_HEIGHT = 2.0;
const NAME_SEPARATOR = "\u0000";
const FLASH_DURATION = 0.7;
const MAX_FRAME_DELTA = 0.1;
const tagPoint = new THREE.Vector3();

const nowInSeconds = () => performance.now() / 1000;

function characterScale(slot: PodiumSlot) {
  return Math.min(1, slot.scale / 0.84);
}

function playerSpot(slot: PodiumSlot): [number, number, number] {
  const behind = ARENA_PLAYER_BEHIND * characterScale(slot);
  return [slot.x - Math.sin(slot.yaw) * behind, slot.y, slot.z - Math.cos(slot.yaw) * behind];
}

function flashIntensity(secondsSinceChange: number) {
  return secondsSinceChange < FLASH_DURATION
    ? 1 + 0.5 * Math.sin((secondsSinceChange / FLASH_DURATION) * Math.PI)
    : 1;
}

function positionTag(element: HTMLElement, slot: PodiumSlot, camera: THREE.Camera, width: number, height: number) {
  const [x, y, z] = playerSpot(slot);
  tagPoint.set(x, y + TAG_HEIGHT * characterScale(slot), z).project(camera);
  const visible = tagPoint.z < 1 && Math.abs(tagPoint.x) < 1.1 && Math.abs(tagPoint.y) < 1.1;
  const screenX = ((tagPoint.x + 1) / 2) * width;
  const screenY = ((1 - tagPoint.y) / 2) * height;
  element.style.visibility = visible ? "visible" : "hidden";
  element.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
}

function usePageFont() {
  return useMemo(() => getComputedStyle(document.body).fontFamily || "system-ui, sans-serif", []);
}

function useCharacters(slots: PodiumSlot[]) {
  const { scene: playerScene } = useGLTF(ARENA_MODELS.player);
  return useMemo(
    () =>
      slots.map((slot, i) => {
        const root = cloneSkinned(playerScene);
        root.position.set(...playerSpot(slot));
        root.rotation.y = slot.yaw;
        root.scale.setScalar(characterScale(slot));
        root.traverse((object) => {
          object.castShadow = false;
          object.frustumCulled = true;
        });
        return { root, rig: new PlayerRig(root, i + 1) };
      }),
    [playerScene, slots],
  );
}

function useNameScreens(handles: SlotHandles[], players: QuizCupArenaPlayer[]) {
  const font = usePageFont();
  const names = players.map((player) => player.name).join(NAME_SEPARATOR);

  useEffect(() => {
    let cancelled = false;
    const drawnTextures: THREE.Texture[] = [];
    const nameList = names.split(NAME_SEPARATOR);
    document.fonts.ready.then(() => {
      if (cancelled) return;
      handles.forEach((handle, i) => {
        const name = nameList[i]?.trim();
        const texture = name ? drawNameTexture(name, font) : handle.placeholder;
        if (name && texture) drawnTextures.push(texture);
        handle.screen.map = texture;
        handle.screen.emissiveMap = texture;
        handle.screen.needsUpdate = true;
      });
    });
    return () => {
      cancelled = true;
      drawnTextures.forEach((texture) => texture.dispose());
    };
  }, [handles, names, font]);
}

function useStatusLeds(handles: SlotHandles[], players: QuizCupArenaPlayer[]) {
  const statuses = useRef(players.map((player) => player.status));
  const changedAt = useRef<number[]>([]);

  useEffect(() => {
    const now = nowInSeconds();
    players.forEach((player, i) => {
      if (statuses.current[i] !== player.status) changedAt.current[i] = now;
      for (const led of statusLeds(handles[i])) led.emissive.set(PODIUM_STATUS_COLORS[player.status]);
    });
    statuses.current = players.map((player) => player.status);
  }, [players, handles]);

  return { statuses, changedAt };
}

type Props = {
  players: QuizCupArenaPlayer[];
  slots: PodiumSlot[];
  castShadows: boolean;
  onLayout: () => void;
  tags?: RefObject<(HTMLElement | null)[]>;
};

function ArenaContestants({ players, slots, castShadows, onLayout, tags }: Props) {
  const { merged, perSlot, handles } = usePodiums(slots);
  const characters = useCharacters(slots);
  useNameScreens(handles, players);
  const { statuses, changedAt } = useStatusLeds(handles, players);

  useLayoutEffect(() => {
    merged.traverse((object) => (object.castShadow = castShadows));
    onLayout();
  }, [merged, castShadows, onLayout]);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;
    const { width, height } = state.size;
    for (let i = 0; i < slots.length; i++) {
      const element = tags?.current[i];
      if (element) positionTag(element, slots[i], state.camera, width, height);
    }

    const now = nowInSeconds();
    const frameDelta = Math.min(delta, MAX_FRAME_DELTA);
    for (let i = 0; i < characters.length; i++) {
      characters[i].rig.update(elapsed, frameDelta, statuses.current[i] ?? "idle");
      const intensity = flashIntensity(now - (changedAt.current[i] ?? -10));
      for (const led of statusLeds(handles[i])) led.emissiveIntensity = intensity;
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

export function preloadArenaContestants() {
  useGLTF.preload(ARENA_MODELS.player);
  useGLTF.preload(ARENA_MODELS.host);
}
