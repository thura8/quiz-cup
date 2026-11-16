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

const FOLLOW_RATE = 1.8;
const INTRO_FOLLOW_RATE = FOLLOW_RATE * 2.5;
const MAX_FRAME_DELTA = 0.1;
const goalPosition = new THREE.Vector3();
const goalTarget = new THREE.Vector3();
const currentTarget = new THREE.Vector3();

type CameraPose = number[];

const DEBUG_CAMERA_POSE: CameraPose | null = (() => {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("cam");
  const values = raw?.split(",").map(Number);
  return values && values.length >= 6 && values.every(Number.isFinite) ? values : null;
})();

const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

function applyDebugPose(camera: THREE.PerspectiveCamera, pose: CameraPose) {
  const [x, y, z, targetX, targetY, targetZ, fov] = pose;
  camera.position.set(x, y, z);
  camera.lookAt(targetX, targetY, targetZ);
  if (fov && camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

function aimAtPlayer(focus: PodiumSlot) {
  const forwardX = Math.sin(focus.yaw);
  const forwardZ = Math.cos(focus.yaw);
  const behind = ARENA_PLAYER_BEHIND * focus.scale;
  goalTarget.set(
    focus.x - forwardX * behind,
    focus.y + CAMERA_FOCUS.lookHeight * focus.scale,
    focus.z - forwardZ * behind,
  );
  goalPosition.set(
    goalTarget.x + forwardX * CAMERA_FOCUS.distance + forwardZ * 0.6,
    0,
    goalTarget.z + forwardZ * CAMERA_FOCUS.distance - forwardX * 0.6,
  );
  goalPosition.y = focus.y + CAMERA_FOCUS.height;
  return CAMERA_FOCUS.fov;
}

function aimIntroSweep(secondsIntoIntro: number) {
  const eased = easeOutCubic(secondsIntoIntro / CAMERA_INTRO.seconds);
  const angle = THREE.MathUtils.lerp(-1.1, 0, eased);
  goalPosition.set(
    CAMERA_INTRO.target[0] + Math.sin(angle) * CAMERA_INTRO.radius,
    THREE.MathUtils.lerp(CAMERA_INTRO.height + 2, CAMERA_INTRO.height, eased),
    CAMERA_INTRO.target[2] + Math.cos(angle) * CAMERA_INTRO.radius,
  );
  goalTarget.fromArray(CAMERA_INTRO.target);
  return CAMERA_INTRO.fov;
}

function aimPhaseShot(phase: QuizCupArenaPhase) {
  const shot = CAMERA_SHOTS[phase === "intro" ? "question" : phase];
  goalPosition.fromArray(shot.position);
  goalTarget.fromArray(shot.target);
  return shot.fov;
}

function addHandheldDrift(elapsed: number) {
  goalPosition.x += 0.06 * Math.sin(elapsed * 0.21);
  goalPosition.y += 0.04 * Math.sin(elapsed * 0.17 + 1.3);
  goalTarget.x += 0.03 * Math.sin(elapsed * 0.13 + 0.7);
}

type ArenaCameraProps = {
  phase: QuizCupArenaPhase;
  focus: PodiumSlot | null;
  ready: boolean;
};

export default function ArenaCamera({ phase, focus, ready }: ArenaCameraProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const phaseStartedAt = useRef(-1);
  const placed = useRef(false);

  useEffect(() => {
    phaseStartedAt.current = -1;
  }, [phase, ready]);

  useFrame((state, delta) => {
    if (DEBUG_CAMERA_POSE) {
      applyDebugPose(camera, DEBUG_CAMERA_POSE);
      return;
    }

    const elapsed = state.clock.elapsedTime;
    if (ready && phaseStartedAt.current < 0) phaseStartedAt.current = elapsed;
    const sincePhaseStart = ready ? elapsed - phaseStartedAt.current : 0;

    let fov: number;
    if (focus) fov = aimAtPlayer(focus);
    else if (phase === "intro" && sincePhaseStart < CAMERA_INTRO.seconds) fov = aimIntroSweep(sincePhaseStart);
    else fov = aimPhaseShot(phase);
    addHandheldDrift(elapsed);

    if (!placed.current) {
      camera.position.copy(goalPosition);
      currentTarget.copy(goalTarget);
      placed.current = true;
    }

    const rate = phase === "intro" && !focus ? INTRO_FOLLOW_RATE : FOLLOW_RATE;
    const blend = 1 - Math.exp(-Math.min(delta, MAX_FRAME_DELTA) * rate);
    camera.position.lerp(goalPosition, blend);
    currentTarget.lerp(goalTarget, blend);
    camera.lookAt(currentTarget);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * blend;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
