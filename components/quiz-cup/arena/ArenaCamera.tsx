"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import {
  ARENA_PLAYER_BEHIND,
  CAMERA_FOCUS,
  CAMERA_INTRO,
  CAMERA_SHOTS,
  type PodiumSlot,
} from "@/constants/quiz-cup-arena";
import type { QuizCupArenaPhase } from "@/types/quiz-cup";

const RATE = 1.8; // 1/s: a deliberate, broadcast-style move between shots
const goalPos = new THREE.Vector3();
const goalTarget = new THREE.Vector3();
const target = new THREE.Vector3();

/** Eases the camera to the shot for the current phase; never allocates per frame. */
const DEBUG_CAM: number[] | null = (() => {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("cam");
  const nums = raw?.split(",").map(Number);
  return nums && nums.length >= 6 && nums.every(Number.isFinite) ? nums : null;
})();

export default function ArenaCamera({
  phase,
  focus,
  ready,
}: {
  phase: QuizCupArenaPhase;
  /** Podium to close in on (e.g. the player being revealed), or null for the phase shot. */
  focus: PodiumSlot | null;
  /** False while the loading cover is up: the shot's clock (e.g. the intro orbit) waits. */
  ready: boolean;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const phaseStart = useRef(-1);
  const placed = useRef(false);

  useEffect(() => {
    phaseStart.current = -1; // stamped on the next visible frame with the clock time
  }, [phase, ready]);

  useFrame((state, delta) => {
    // Dev: `?cam=x,y,z,tx,ty,tz[,fov]` pins the camera (for inspecting the set up close).
    if (DEBUG_CAM) {
      const [x, y, z, tx, ty, tz, fov] = DEBUG_CAM;
      camera.position.set(x, y, z);
      camera.lookAt(tx, ty, tz);
      if (fov && camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      return;
    }
    const t = state.clock.elapsedTime;
    // Behind the loading cover the clock stays at 0, so the show opens on the shot's first frame.
    if (ready && phaseStart.current < 0) phaseStart.current = t;
    const since = ready ? t - phaseStart.current : 0;
    let fov: number;

    if (focus) {
      // The player stands behind the podium, along its facing direction.
      const fx = Math.sin(focus.yaw);
      const fz = Math.cos(focus.yaw);
      const behind = ARENA_PLAYER_BEHIND * focus.scale;
      goalTarget.set(focus.x - fx * behind, focus.y + CAMERA_FOCUS.lookHeight * focus.scale, focus.z - fz * behind);
      // In front of the podium, a little off-axis towards the stage.
      goalPos.set(goalTarget.x + fx * CAMERA_FOCUS.distance + fz * 0.6, 0, goalTarget.z + fz * CAMERA_FOCUS.distance - fx * 0.6);
      goalPos.y = focus.y + CAMERA_FOCUS.height;
      fov = CAMERA_FOCUS.fov;
    } else if (phase === "intro" && since < CAMERA_INTRO.seconds) {
      const p = since / CAMERA_INTRO.seconds;
      const ease = 1 - Math.pow(1 - p, 3);
      const angle = THREE.MathUtils.lerp(-1.1, 0, ease);
      goalPos.set(
        CAMERA_INTRO.target[0] + Math.sin(angle) * CAMERA_INTRO.radius,
        THREE.MathUtils.lerp(CAMERA_INTRO.height + 2, CAMERA_INTRO.height, ease),
        CAMERA_INTRO.target[2] + Math.cos(angle) * CAMERA_INTRO.radius,
      );
      goalTarget.fromArray(CAMERA_INTRO.target);
      fov = CAMERA_INTRO.fov;
    } else {
      const shot = CAMERA_SHOTS[phase === "intro" ? "question" : phase];
      goalPos.fromArray(shot.position);
      goalTarget.fromArray(shot.target);
      fov = shot.fov;
    }

    // Handheld drift: a few centimetres, slow, so the frame is never perfectly still.
    goalPos.x += 0.06 * Math.sin(t * 0.21);
    goalPos.y += 0.04 * Math.sin(t * 0.17 + 1.3);
    goalTarget.x += 0.03 * Math.sin(t * 0.13 + 0.7);

    if (!placed.current) {
      camera.position.copy(goalPos);
      target.copy(goalTarget);
      placed.current = true;
    }
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * (phase === "intro" && !focus ? RATE * 2.5 : RATE));
    camera.position.lerp(goalPos, k);
    target.lerp(goalTarget, k);
    camera.lookAt(target);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
